import { useMemo } from 'react';

/** Reuse factory-created widget state until the widget config or factory changes. */
export function useWidgetStates<TConfig, TState>(
  widgets: TConfig[],
  factory: (widget: TConfig) => TState,
): { config: TConfig; state: TState }[] {
  return useMemo(
    () =>
      widgets.map((widget) => ({
        config: widget,
        state: factory(widget),
      })),
    [widgets, factory],
  );
}
