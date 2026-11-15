import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createDefaultWidget,
  useDashboard,
  type WidgetConfig,
} from './dashboard-store';

const pressure = createDefaultWidget('test.pressure');
const temperature = createDefaultWidget('test.temperature');
const anotherPressure: WidgetConfig = {
  ...pressure,
  componentId: 'second-pressure-widget',
  componentTitle: 'Another pressure view',
};

describe('dashboard store', () => {
  it('creates a numeric widget with the channel ID as its default component ID', () => {
    expect(createDefaultWidget('test.pressure')).toEqual(pressure);
    expect(pressure).toEqual({
      channelId: 'test.pressure',
      componentId: 'test.pressure',
      componentType: 'numeric',
    });
  });

  it('starts empty and replaces the widget list with setWidgets', () => {
    const { result } = renderHook(useDashboard);
    expect(result.current.widgets).toEqual([]);

    act(() => result.current.setWidgets([pressure, temperature]));
    expect(result.current.widgets).toEqual([pressure, temperature]);
  });

  it('adds widgets in order, allowing multiple widgets for one channel but rejecting duplicate component IDs', () => {
    const { result } = renderHook(useDashboard);
    act(() => result.current.addWidget(pressure));
    act(() => result.current.addWidget(anotherPressure));

    expect(result.current.widgets).toEqual([pressure, anotherPressure]);
    expect(() =>
      act(() =>
        result.current.addWidget({ ...pressure, componentTitle: 'Duplicate' }),
      ),
    ).toThrow('Duplicate widget ID: test.pressure');
    expect(result.current.widgets).toEqual([pressure, anotherPressure]);
  });

  it('updates only the widget with the matching component ID and preserves its position', () => {
    const { result } = renderHook(useDashboard);
    act(() =>
      result.current.setWidgets([pressure, temperature, anotherPressure]),
    );
    const updated = { ...anotherPressure, componentTitle: 'Updated' };

    act(() => result.current.updateWidget(updated));
    expect(result.current.widgets).toEqual([pressure, temperature, updated]);
    expect(() =>
      act(() => result.current.updateWidget(createDefaultWidget('unknown'))),
    ).toThrow('Widget unknown does not exist!');
  });

  it('removes by component ID without removing another widget on the same channel', () => {
    const { result } = renderHook(useDashboard);
    act(() =>
      result.current.setWidgets([pressure, temperature, anotherPressure]),
    );

    act(() => result.current.removeWidget(anotherPressure.componentId));
    expect(result.current.widgets).toEqual([pressure, temperature]);
    expect(() => act(() => result.current.removeWidget('unknown'))).toThrow(
      'Widget unknown does not exist!',
    );
  });

  it('swaps widgets by component ID and rejects missing IDs', () => {
    const { result } = renderHook(useDashboard);
    act(() =>
      result.current.setWidgets([pressure, temperature, anotherPressure]),
    );

    act(() =>
      result.current.swapWidget(
        pressure.componentId,
        anotherPressure.componentId,
      ),
    );
    expect(result.current.widgets).toEqual([
      anotherPressure,
      temperature,
      pressure,
    ]);
    expect(() =>
      act(() => result.current.swapWidget('unknown', temperature.componentId)),
    ).toThrow('Widget unknown does not exist!');
    expect(() =>
      act(() => result.current.swapWidget(pressure.componentId, 'unknown')),
    ).toThrow('Widget unknown does not exist!');
  });
});
