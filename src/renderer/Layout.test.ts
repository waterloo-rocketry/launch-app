import { describe, expect, it } from 'vitest';
import {
  fitsInGrid,
  overlaps,
  resizeItem,
  type dashboardLayout,
} from './Layout';

const area = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

/** 4×4 grid: a 1×1 widget at the top-left and a 1×1 widget at (2, 0). */
function makeLayout(): dashboardLayout {
  return {
    version: 1,
    numberOfCols: 4,
    numberOfRows: 4,
    items: [
      {
        id: 'a',
        ...area(0, 0, 1, 1),
        widgetConfig: { kind: 'channel-list', problemOnly: false },
      },
      {
        id: 'b',
        ...area(2, 0, 1, 1),
        widgetConfig: { kind: 'channel-list', problemOnly: false },
      },
    ],
  };
}

describe('overlaps', () => {
  it('detects areas that share cells', () => {
    expect(overlaps(area(0, 0, 2, 2), area(1, 1, 2, 2))).toBe(true);
    expect(overlaps(area(0, 0, 3, 3), area(1, 1, 1, 1))).toBe(true);
  });

  it('treats touching edges as not overlapping', () => {
    expect(overlaps(area(0, 0, 1, 1), area(1, 0, 1, 1))).toBe(false); // side by side
    expect(overlaps(area(0, 0, 1, 1), area(0, 1, 1, 1))).toBe(false); // stacked
  });

  it('works in both directions', () => {
    expect(overlaps(area(2, 2, 1, 1), area(0, 0, 1, 1))).toBe(false);
    expect(overlaps(area(1, 1, 2, 2), area(0, 0, 2, 2))).toBe(true);
  });
});

describe('fitsInGrid', () => {
  const layout = makeLayout();

  it('accepts areas inside the grid, including the far edges', () => {
    expect(fitsInGrid(area(0, 0, 4, 4), layout)).toBe(true);
    expect(fitsInGrid(area(3, 3, 1, 1), layout)).toBe(true);
  });

  it('rejects areas past an edge or smaller than one cell', () => {
    expect(fitsInGrid(area(3, 0, 2, 1), layout)).toBe(false);
    expect(fitsInGrid(area(0, 3, 1, 2), layout)).toBe(false);
    expect(fitsInGrid(area(-1, 0, 1, 1), layout)).toBe(false);
    expect(fitsInGrid(area(0, 0, 0, 1), layout)).toBe(false);
    expect(fitsInGrid(area(0, 0, 1, 0), layout)).toBe(false);
  });
});

describe('resizeItem', () => {
  it('returns a new layout with only that widget resized', () => {
    const layout = makeLayout();
    const next = resizeItem(layout, 'a', 2, 3);
    expect(next).not.toBe(layout);
    expect(next.items[0]).toMatchObject({ id: 'a', w: 2, h: 3 });
    expect(next.items[0].widgetConfig).toBe(layout.items[0].widgetConfig);
    expect(next.items[1]).toBe(layout.items[1]);
    // The original is untouched.
    expect(layout.items[0]).toMatchObject({ w: 1, h: 1 });
  });

  it.each([
    ['an unknown id', 'zzz', 2, 2],
    ['an unchanged size', 'a', 1, 1],
    ['a size below one cell', 'a', 0, 1],
    ['growing past the right edge', 'b', 3, 1],
    ['growing past the bottom edge', 'a', 1, 5],
    ['growing into another widget', 'a', 3, 1],
  ])('returns the same layout for %s', (_label, id, w, h) => {
    const layout = makeLayout();
    expect(resizeItem(layout, id, w, h)).toBe(layout);
  });
});
