import { useRef, useState, type PointerEvent } from 'react';
import {
  closestValidSize,
  growthLimits,
  resizeItem,
  type dashboardLayout,
  type gridItem,
  type widgetConfig,
} from '../Layout';
import { ProgressBar } from './ProgressBar';
import { ChannelList } from './ChannelList';
import type { TelemetryState } from '../data/channel-store';

interface dashboardGridProps {
  layout: dashboardLayout;
  telemetryState: TelemetryState;
  nowMs: number;
  /** Called with the new layout when the user finishes resizing a widget. */
  onLayoutChange?: (layout: dashboardLayout) => void;
}

/** Which edge is being dragged: right edge, bottom edge, or the corner. */
type ResizeAxis = 'x' | 'y' | 'xy';

const HANDLES: { axis: ResizeAxis; label: string }[] = [
  { axis: 'x', label: 'Drag to resize width' },
  { axis: 'y', label: 'Drag to resize height' },
  { axis: 'xy', label: 'Drag to resize' },
];

/** Everything measured when a drag starts, plus how far the pointer has moved. */
interface ResizeDrag {
  id: string;
  axis: ResizeAxis;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  /** The widget's pixel size when the drag started. */
  startWidthPx: number;
  startHeightPx: number;
  /** Gap between cells, and the step from one column/row to the next. */
  colGap: number;
  rowGap: number;
  colStep: number;
  rowStep: number;
  dx: number;
  dy: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function renderWidget(
  config: widgetConfig,
  telemetryState: TelemetryState,
  nowMs: number,
) {
  switch (config.kind) {
    case 'channel-list': {
      const channelList = Object.values(telemetryState.channels);
      return <ChannelList channels={channelList} nowMs={nowMs} />;
    }
    case 'progress-bar': {
      const { signalId, min, max } = config;
      const channel = telemetryState.channels[signalId];
      if (!channel) return <p>Channel not found</p>;
      return (
        <ProgressBar channel={channel} min={min} max={max} nowMs={nowMs} />
      );
    }
  }
}

/** CSS grid placement for an item: "start / span size", 1-based lines. */
const placement = (item: Pick<gridItem, 'x' | 'y' | 'w' | 'h'>) => ({
  gridColumn: `${item.x + 1} / span ${item.w}`,
  gridRow: `${item.y + 1} / span ${item.h}`,
});

export function DashboardGrid({
  layout: initialLayout,
  telemetryState,
  nowMs,
  onLayoutChange,
}: dashboardGridProps) {
  const [layout, setLayout] = useState(initialLayout);
  // State, not a ref: the dragged widget and the preview redraw on every move.
  const [drag, setDrag] = useState<ResizeDrag | null>(null);

  // When the parent passes a different layout (a loaded file, or an edit to
  // DEFAULT_LAYOUT during development), start over from it. Resizes made since
  // are dropped. React's recommended way to reset state when a prop changes:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [seenLayout, setSeenLayout] = useState(initialLayout);
  if (initialLayout !== seenLayout) {
    setSeenLayout(initialLayout);
    setLayout(initialLayout);
    setDrag(null);
  }
  const gridRef = useRef<HTMLDivElement>(null);
  const { numberOfCols, numberOfRows, items } = layout;

  /** The snapped size the widget will take if the pointer is released now. */
  const previewSize = (current: ResizeDrag) => {
    // Math.round: past half a cell, the size moves to the next cell.
    const w =
      current.axis === 'y'
        ? current.startW
        : current.startW + Math.round(current.dx / current.colStep);
    const h =
      current.axis === 'x'
        ? current.startH
        : current.startH + Math.round(current.dy / current.rowStep);
    return closestValidSize(layout, current.id, w, h);
  };

  const startResize = (
    event: PointerEvent<HTMLDivElement>,
    item: gridItem,
    axis: ResizeAxis,
  ) => {
    const grid = gridRef.current;
    const cell = event.currentTarget.parentElement;
    if (!grid || !cell) return;
    event.preventDefault(); // don't select text while dragging
    event.currentTarget.setPointerCapture(event.pointerId);

    // Cells are 1fr, so measure their real pixel size right now.
    const gridRect = grid.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const style = getComputedStyle(grid);
    const colGap = parseFloat(style.columnGap) || 0;
    const rowGap = parseFloat(style.rowGap) || 0;
    const colStep = (gridRect.width + colGap) / numberOfCols;
    const rowStep = (gridRect.height + rowGap) / numberOfRows;

    setDrag({
      id: item.id,
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startW: item.w,
      startH: item.h,
      startWidthPx: cellRect.width,
      startHeightPx: cellRect.height,
      colGap,
      rowGap,
      colStep,
      rowStep,
      dx: 0,
      dy: 0,
    });
  };

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.colStep <= 0 || drag.rowStep <= 0) return;
    setDrag({
      ...drag,
      dx: drag.axis === 'y' ? 0 : event.clientX - drag.startX,
      dy: drag.axis === 'x' ? 0 : event.clientY - drag.startY,
    });
  };

  const endResize = () => {
    if (!drag) return;
    const size = previewSize(drag);
    setDrag(null);
    if (!size) return;
    const next = resizeItem(layout, drag.id, size.w, size.h);
    if (next === layout) return; // nothing changed
    setLayout(next);
    onLayoutChange?.(next);
  };

  const preview = drag ? previewSize(drag) : null;
  const dragged = drag ? items.find((item) => item.id === drag.id) : undefined;

  /**
   * Pixel size of the widget being dragged. Its edge follows the pointer, but
   * never below one cell and never into a neighbour or past the grid: it stops
   * at the furthest size that fits next to the previewed size.
   */
  const liveSize = () => {
    if (!drag || !preview) return undefined;
    const limits = growthLimits(layout, drag.id, preview.w, preview.h);
    if (!limits) return undefined;
    const px = (cells: number, step: number, gap: number) => cells * step - gap;
    return {
      width: clamp(
        drag.startWidthPx + drag.dx,
        px(1, drag.colStep, drag.colGap),
        px(limits.maxW, drag.colStep, drag.colGap),
      ),
      height: clamp(
        drag.startHeightPx + drag.dy,
        px(1, drag.rowStep, drag.rowGap),
        px(limits.maxH, drag.rowStep, drag.rowGap),
      ),
    };
  };

  return (
    <div
      ref={gridRef}
      className="dashboard-grid"
      style={{
        // minmax(0, 1fr), not plain 1fr: every column and row keeps exactly the
        // same size no matter what is inside (plain 1fr grows to fit content).
        gridTemplateColumns: `repeat(${numberOfCols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${numberOfRows}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item) => {
        const resizing = drag?.id === item.id;
        return (
          <div
            key={item.id}
            className={`dashboard-cell${resizing ? ' dashboard-cell--resizing' : ''}`}
            style={{ ...placement(item), ...(resizing ? liveSize() : {}) }}
          >
            <div className="dashboard-cell__content">
              {renderWidget(item.widgetConfig, telemetryState, nowMs)}
            </div>
            {HANDLES.map(({ axis, label }) => (
              <div
                key={axis}
                className={`dashboard-cell__resize dashboard-cell__resize--${axis}`}
                data-testid={`resize-${axis}-${item.id}`}
                title={label}
                onPointerDown={(event) => startResize(event, item, axis)}
                onPointerMove={moveResize}
                onPointerUp={endResize}
                onPointerCancel={() => setDrag(null)}
              />
            ))}
          </div>
        );
      })}
      {dragged && preview && (
        <div
          className="dashboard-preview"
          data-testid="resize-preview"
          aria-hidden="true"
          style={placement({ ...dragged, ...preview })}
        />
      )}
    </div>
  );
}
