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

/** The cell (grid item) that holds a widget's resize handle. */
const cellOf = (id: string) =>
  screen.getByTestId(`resize-${id}`).parentElement!;

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

  it('resizes a widget by dragging its handle, snapping to whole cells', () => {
    const onLayoutChange = vi.fn();
    renderGrid(LAYOUT, onLayoutChange);
    const handle = screen.getByTestId('resize-bar');

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    // 1.4 columns right rounds to 1; 1.6 rows down rounds to 2.
    fireEvent.pointerMove(handle, { clientX: 140, clientY: 160 });
    expect(cellOf('bar')).toHaveStyle({
      gridColumn: '1 / span 2',
      gridRow: '1 / span 3',
    });

    fireEvent.pointerUp(handle);
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(onLayoutChange.mock.calls[0][0].items[0]).toMatchObject({
      w: 2,
      h: 3,
    });
  });

  it('refuses to grow into another widget', () => {
    renderGrid();
    const handle = screen.getByTestId('resize-bar');

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    // Three columns wide would cover the channel list at column 2.
    fireEvent.pointerMove(handle, { clientX: 200, clientY: 0 });
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 1' });
  });

  it('ignores pointer moves when no drag is in progress', () => {
    const onLayoutChange = vi.fn();
    renderGrid(LAYOUT, onLayoutChange);
    const handle = screen.getByTestId('resize-bar');

    fireEvent.pointerMove(handle, { clientX: 300, clientY: 300 });
    fireEvent.pointerUp(handle);
    expect(cellOf('bar')).toHaveStyle({ gridColumn: '1 / span 1' });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});
