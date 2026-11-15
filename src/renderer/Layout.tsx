/*
create GridItem to store the type of widget at the specified index
Create a list to save them so they can be saved/exported
*/

// when there is more widget they should be added into widgetconfig type
export type widgetConfig =
  | { kind: 'progress-bar'; signalId: string; min: number; max: number }
  | { kind: 'channel-list'; problemOnly: boolean; hidden?: string[] };

export interface gridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  widgetConfig: widgetConfig;
}

export interface dashboardLayout {
  version: number;
  numberOfCols: number;
  numberOfRows: number;
  items: gridItem[];
}

export const DEFAULT_LAYOUT: dashboardLayout = {
  version: 1,
  numberOfCols: 2,
  numberOfRows: 10,
  items: [
    {
      id: 'temperature-progress-bar',
      x: 0,
      y: 0,
      w: 1,
      h: 5,
      widgetConfig: {
        kind: 'progress-bar',
        signalId: 'test.temperature',
        min: -20,
        max: 20,
      },
    },
    {
      id: 'all-channel-list',
      x: 1,
      y: 4,
      w: 1,
      h: 5,
      widgetConfig: {
        kind: 'channel-list',
        problemOnly: false,
      },
    },
  ],
};

/** A rectangle of grid cells: top-left corner (x, y) and size (w, h). */
type CellArea = Pick<gridItem, 'x' | 'y' | 'w' | 'h'>;

/** True when two areas share at least one cell. Touching edges do not count. */
export function overlaps(a: CellArea, b: CellArea): boolean {
  const separate =
    a.x + a.w <= b.x || // a is left of b
    b.x + b.w <= a.x || // a is right of b
    a.y + a.h <= b.y || // a is above b
    b.y + b.h <= a.y; // a is below b
  return !separate;
}

/** True when the area is at least 1×1 and lies entirely inside the grid. */
export function fitsInGrid(area: CellArea, layout: dashboardLayout): boolean {
  return (
    area.w >= 1 &&
    area.h >= 1 &&
    area.x >= 0 &&
    area.y >= 0 &&
    area.x + area.w <= layout.numberOfCols &&
    area.y + area.h <= layout.numberOfRows
  );
}

/**
 * Returns a new layout with one widget resized to w × h cells.
 * Returns the same layout object when the id is unknown, the size is
 * unchanged, or the new size would leave the grid or overlap another widget.
 */
export function resizeItem(
  layout: dashboardLayout,
  id: string,
  w: number,
  h: number,
): dashboardLayout {
  const target = layout.items.find((item) => item.id === id);
  if (!target) return layout;
  if (target.w === w && target.h === h) return layout;

  const resized = { ...target, w, h };
  if (!fitsInGrid(resized, layout)) return layout;

  const collides = layout.items.some(
    (other) => other.id !== id && overlaps(resized, other),
  );
  if (collides) return layout;

  return {
    ...layout,
    items: layout.items.map((item) => (item.id === id ? resized : item)),
  };
}
