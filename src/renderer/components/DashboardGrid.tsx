import { useRef, useState, type PointerEvent } from 'react';
import { resizeItem, type dashboardLayout, type widgetConfig } from '../Layout';
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

/** What we remember while a resize drag is in progress. */
interface ResizeDrag {
  id: string;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  /** Pixels between the start of one column/row and the start of the next. */
  colStep: number;
  rowStep: number;
}

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

export function DashboardGrid({
  layout: initialLayout,
  telemetryState,
  nowMs,
  onLayoutChange,
}: dashboardGridProps) {
  const [layout, setLayout] = useState(initialLayout);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ResizeDrag | null>(null);
  const { numberOfCols, numberOfRows, items } = layout;

  const startResize = (
    event: PointerEvent<HTMLDivElement>,
    id: string,
    w: number,
    h: number,
  ) => {
    const grid = gridRef.current;
    if (!grid) return;
    event.preventDefault(); // don't select text while dragging
    event.currentTarget.setPointerCapture(event.pointerId);

    // Cells are 1fr, so measure their real pixel size right now.
    const rect = grid.getBoundingClientRect();
    const style = getComputedStyle(grid);
    const colGap = parseFloat(style.columnGap) || 0;
    const rowGap = parseFloat(style.rowGap) || 0;

    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      startW: w,
      startH: h,
      colStep: (rect.width + colGap) / numberOfCols,
      rowStep: (rect.height + rowGap) / numberOfRows,
    };
  };

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.colStep <= 0 || drag.rowStep <= 0) return;
    // Math.round snaps the size to whole cells.
    const w =
      drag.startW + Math.round((event.clientX - drag.startX) / drag.colStep);
    const h =
      drag.startH + Math.round((event.clientY - drag.startY) / drag.rowStep);
    // resizeItem returns the same layout when the new size isn't allowed,
    // so React skips the redraw and the widget stays where it was.
    setLayout((current) => resizeItem(current, drag.id, w, h));
  };

  const endResize = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onLayoutChange?.(layout);
  };

  return (
    <div
      ref={gridRef}
      className="dashboard-grid"
      style={{
        gridTemplateColumns: `repeat(${numberOfCols}, 1fr)`,
        gridTemplateRows: `repeat(${numberOfRows}, 1fr)`,
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="dashboard-cell"
          style={{
            gridColumn: `${item.x + 1} / span ${item.w}`,
            gridRow: `${item.y + 1} / span ${item.h}`,
          }}
        >
          <div className="dashboard-cell__content">
            {renderWidget(item.widgetConfig, telemetryState, nowMs)}
          </div>
          <div
            className="dashboard-cell__resize"
            data-testid={`resize-${item.id}`}
            title="Drag to resize"
            onPointerDown={(event) =>
              startResize(event, item.id, item.w, item.h)
            }
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          />
        </div>
      ))}
    </div>
  );
}
