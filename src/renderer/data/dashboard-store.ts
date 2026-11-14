import { useState } from 'react';
import { ComponentType } from '../components/BaseComponent';

/**
 * The persistent config the the widgets (and layout)
 */
export interface WidgetConfig {
  // id of the channel
  channelId: string;
  // component id
  componentId: string;
  // component type, default to numeric
  componentType?: ComponentType;
  // title, default to the label of the channel
  componentTitle?: string;
  // component specific configs for the channel, i.e, the zero points for graphs
  componentSpecificSetting?: object;
}

/**
 * Creating a default config of a widget
 * @param id the id of the channel subscribed
 * @returns a default widget
 */
export function createDefaultWidget(id: string): WidgetConfig {
  return {
    channelId: id,
    componentId: id,
    componentType: 'numeric',
  };
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  /* 
        widget storages are keyed by component ID. 
        passing the whole widget object is unnecessary
        index is unreliable as widgets may shift in the middle, to create stale index numbers
        since component IDs are relatively short and are already guarenteed to be unique and persistent, 
        we use component IDs as keys
    */
  removeWidget: (componentId: string) => void;
  // addWidget checks duplication
  addWidget: (widget: WidgetConfig) => void;
  // update the widget with ID, reject if ID does not exist
  // in the rare event when you need to change the widget ID, call remove then add
  updateWidget: (widget: WidgetConfig) => void;
  swapWidget: (componentId1: string, componentId2: string) => void;
}

/**
 * Creates a dashboard config.
 * Call it only once. If multiple accesses are needed, move to parent.
 * This function returns functions handling common operations to the dashboard layout
 * All operations are keyed by component ID since it is already unique and persistent.
 *
 * If, in the future, we want to split the settings, we can change the id to an UUID generated
 * based on the config.
 *
 * All operations validates input so catch errors if unsure about it
 * @returns Dashboard config
 */
export function useDashboard(): DashboardConfig {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);

  function removeWidget(componentId: string) {
    if (!widgets.find((w) => w.componentId == componentId))
      throw new Error(`Widget ${componentId} does not exist!`);
    setWidgets((ws) => ws.filter((w) => w.componentId !== componentId));
  }

  function addWidget(widget: WidgetConfig) {
    if (widgets.find((w) => w.componentId == widget.componentId))
      throw new Error(`Duplicate widget ID: ${widget.componentId}`);
    setWidgets((ws) => [...ws, widget]);
  }

  function updateWidget(widget: WidgetConfig) {
    if (!widgets.find((w) => w.componentId == widget.componentId))
      throw new Error(`Widget ${widget.componentId} does not exist!`);
    setWidgets((ws) =>
      ws.map((w) => (w.componentId === widget.componentId ? widget : w)),
    );
  }

  function swapWidget(componentId1: string, componentId2: string) {
    const widget1 = widgets.find((w) => w.componentId == componentId1);
    const widget2 = widgets.find((w) => w.componentId == componentId2);
    if (!widget1) throw new Error(`Widget ${componentId1} does not exist!`);
    if (!widget2) throw new Error(`Widget ${componentId2} does not exist!`);
    setWidgets((ws) =>
      ws.map((w) =>
        w.componentId === componentId1
          ? widget2
          : w.componentId === componentId2
            ? widget1
            : w,
      ),
    );
  }

  return {
    widgets,
    setWidgets,
    removeWidget,
    addWidget,
    updateWidget,
    swapWidget,
  };
}
