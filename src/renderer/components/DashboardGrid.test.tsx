import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardGrid } from './DashboardGrid';
import { createTelemetryState } from '../data/channel-store';
import { MOCK_SIGNALS } from '../data/mock/fixtures';
import type { dashboardLayout } from '../Layout';

const telemetryState = createTelemetryState(MOCK_SIGNALS);

/** 4×4 grid: a progress bar at the top-left, a channel list at column 2. */
const LAYOUT: dashboardLayout = {
  version: 1,
  numberOfCols: 4,
  numberOfRows: 4,
  items: [
    {
      id: 'bar',
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      widgetConfig: {
        kind: 'progress-bar',
        signalId: 'test.pressure',
        min: 0,
        max: 100,
      },
    },
    {
      id: 'list',
      x: 2,
      y: 0,
      w: 1,
      h: 1,
      widgetConfig: { kind: 'channel-list', problemOnly: false },
    },
  ],
};

function renderGrid(
  layout = LAYOUT,
  onLayoutChange?: (layout: dashboardLayout) => void,
) {
  render(
    <DashboardGrid
      layout={layout}
      telemetryState={telemetryState}
      nowMs={0}
      onLayoutChange={onLayoutChange}
    />,
  );
}

const handle = (axis: 'x' | 'y' | 'xy', id = 'bar') =>
  screen.getByTestId(`resize-${axis}-${id}`);
/** The cell (grid item) that holds a widget's resize handles. */
const cellOf = (id: string) => handle('xy', id).parentElement!;
const preview = () => screen.queryByTestId('resize-preview');

/** Presses on a handle at (0, 0) and moves the pointer to (x, y). */
function dragTo(target: HTMLElement, x: number, y: number) {
  fireEvent.pointerDown(target, { clientX: 0, clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(target, { clientX: x, clientY: y });
}

describe('DashboardGrid', () => {
  beforeEach(() => {
    // jsdom has no layout engine: pretend the grid is 400×400px,
    // so each of the 4 columns and rows is 100px.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 400),
    );
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('places each widget in its cells', () => {
    renderGrid();
    expect(cellOf('bar')).toHaveStyle({
      gridColumn: '1 / span 1',
      gridRow: '1 / span 1',
    });
    expect(cellOf('list')).toHaveStyle({
      gridColumn: '3 / span 1',
      gridRow: '1 / span 1',
    });
    expect(preview()).not.toBeInTheDocument();
  });

  it('shows a message for a channel that does not exist', () => {
    renderGrid({
      ...LAYOUT,
      items: [
        {
          ...LAYOUT.items[0],
          widgetConfig: {
            kind: 'progress-bar',
            signalId: 'nope',
            min: 0,
            max: 1,
          },
        },
      ],
    });
    expect(screen.getByText('Channel not found')).toBeInTheDocument();
  });

  it('shows a preview while dragging and applies it on release', () => {
    const onLayoutChange = vi.fn();
    renderGrid(LAYOUT, onLayoutChange);

    dragTo(handle('xy'), 140, 160);
    // The preview shows the snapped size; the layout itself waits for release.
    expect(preview()).toHaveStyle({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 3',
    });
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 1' });
    expect(cellOf('bar')).toHaveClass('dashboard-cell--resizing');

    fireEvent.pointerUp(handle('xy'));
    expect(preview()).not.toBeInTheDocument();
    expect(cellOf('bar')).toHaveStyle({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 3',
    });
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange.mock.calls[0][0].items[0]).toMatchObject({
      w: 2,
      h: 3,
    });
  });

  it('moves to the next cell only past half a cell', () => {
    renderGrid();
    dragTo(handle('y'), 0, 40);
    expect(preview()).toHaveStyle({ gridRow: '1 / span 1' });
    fireEvent.pointerMove(handle('y'), { clientX: 0, clientY: 60 });
    expect(preview()).toHaveStyle({ gridRow: '1 / span 2' });
  });

  it('resizes width only from the right edge', () => {
    renderGrid();
    dragTo(handle('x'), 100, 300);
    expect(preview()).toHaveStyle({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 1',
    });
  });

  it('resizes height only from the bottom edge', () => {
    renderGrid();
    dragTo(handle('y'), 300, 100);
    expect(preview()).toHaveStyle({
      gridColumn: '1 / span 1',
      gridRow: '1 / span 2',
    });
  });

  it('stops at a neighbouring widget instead of overlapping it', () => {
    renderGrid();
    // Four columns wide would cover the channel list at column 3.
    dragTo(handle('xy'), 300, 0);
    expect(preview()).toHaveStyle({ gridColumn: '1 / span 2' });
    // The widget's own edge also stops there: 2 columns × 100px.
    expect(cellOf('bar')).toHaveStyle({ width: '200px' });
  });

  it('never shrinks the dragged widget below one cell', () => {
    renderGrid();
    dragTo(handle('xy'), -500, -500);
    expect(preview()).toHaveStyle({ gridColumn: '1 / span 1' });
    expect(cellOf('bar')).toHaveStyle({ width: '100px', height: '100px' });
  });

  it('starts over when given a different layout, but not the same one again', () => {
    const grid = (layout: dashboardLayout) => (
      <DashboardGrid
        layout={layout}
        telemetryState={telemetryState}
        nowMs={0}
      />
    );
    const { rerender } = render(grid(LAYOUT));
    dragTo(handle('xy'), 100, 0);
    fireEvent.pointerUp(handle('xy'));
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 2' });

    // Same layout object (e.g. a normal redraw): the resize is kept.
    rerender(grid(LAYOUT));
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 2' });

    // A different layout: the grid uses it, and the resize is dropped.
    rerender(grid({ ...LAYOUT, numberOfCols: 6 }));
    expect(cellOf('bar').parentElement).toHaveStyle({
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    });
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 1' });
  });

  it('keeps every column and row the same size whatever is inside', () => {
    renderGrid();
    const grid = cellOf('bar').parentElement!;
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
    });
  });

  it('discards the resize when the pointer is cancelled', () => {
    const onLayoutChange = vi.fn();
    renderGrid(LAYOUT, onLayoutChange);
    dragTo(handle('xy'), 200, 200);
    fireEvent.pointerCancel(handle('xy'));
    expect(preview()).not.toBeInTheDocument();
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 1' });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('does not report a change when released at the same size', () => {
    const onLayoutChange = vi.fn();
    renderGrid(LAYOUT, onLayoutChange);
    dragTo(handle('xy'), 20, 20);
    fireEvent.pointerUp(handle('xy'));
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('ignores pointer moves when no drag is in progress', () => {
    const onLayoutChange = vi.fn();
    renderGrid(LAYOUT, onLayoutChange);
    fireEvent.pointerMove(handle('xy'), { clientX: 300, clientY: 300 });
    fireEvent.pointerUp(handle('xy'));
    expect(preview()).not.toBeInTheDocument();
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 1' });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});
