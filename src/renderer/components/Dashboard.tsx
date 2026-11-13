import { useEffect, useState, useRef, ReactNode } from 'react';
import BaseComponent from './BaseComponent';
import { useTelemetry } from '../data/useTelemetry';
import { getLatestReading, ChannelState } from '../data/channel-store';
import '../styles/dashboard.css';
import {
  useDashboard,
  createDefaultWidget,
  WidgetConfig,
} from '../data/dashboard-store';

/**
 * Dashboard
 *
 * The parent container of all widgets and dashboard-related operations
 *
 * Configs are loaded via `loadWidgetConfig()`. This file currently contains a mock implementation.
 * This function should load the config from some persistent storage, or create a new config, and return as WidgetConfig[].
 *
 * A WidgetConfig is a static config that can be saved and loaded
 *
 * Widgets are registered and created in `widgetFactory`. All future widgets shall register themselves here.
 * `widgetFactory` reads a WidgetConfig and return a WidgetState
 *
 * A WidgetState is an in-memory state of the information about the widget, including how it shall be rendered and
 * what actions is available for the widget
 *
 * When user right-click a widget, an action manu pops up, containing universal actions such as `Remove`, `Hide`,
 * and `Change Type`. Each widget can also self-declare custom actions in WidgetState.
 *
 * Currently only `Remove` is implemented
 */

/**
 * the properties needed for the dashboard
 * currently only the telemetry url.
 * All dashboard config related stuff should be able to process inside this file, so the config is not
 * a part of the props.
 *
 * If, in the future, the dashboard config needs to be accessed outside, move it to the parent and pass via this prop
 */
export interface DashboardProps {
  /** Telemetry event stream URL. */
  url: string;
}

/**
 * The internal state of a widget, containing informations such as how it is rendered and it's custom actions
 */
interface WidgetState {
  // the function to render a widget
  renderer: (
    channel?: ChannelState,
    componentSpecificSetting?: Object,
  ) => ReactNode;
  // all available actions the widget can have and the corresponding handler, excluding delete, hide, and change type
  availableActions: Readonly<Record<string, (widget?: WidgetConfig) => void>>;
}

// a placeholder widget to be removed
function placeholderWidget(
  channel?: ChannelState,
  componentSpecificSetting?: Object,
) {
  return channel
    ? '(Placeholder Widget)' + getLatestReading(channel)?.value
    : 'No Value';
}

/**
 * This function creates a renderable widget from a saved config.
 * All future typed widgets must be registered here.
 * i.e:
 * switch (settings.componentType) {
 *  case 'numeric':
 *      {
 *          renderer: NumericWidget
 *          availableActions: {}
 *      }
 *  case 'plot':
 *      {
 *          renderer: PlotWidget
 *          availableActions: {"Scale": openScaleWindow, "Set Zero": openSetZeroWindow}
 *      }
 *  case 'gauge':
 *      {
 *          renderer: GaugeWidget
 *          availableActions: {"Scale": openScaleWindow}
 *      }
 * }
 * @param settings The widget config
 */
function widgetFactory(settings: WidgetConfig): WidgetState {
  return {
    renderer: placeholderWidget,
    availableActions: {},
  };
}

interface internalWidgetState {
  config: WidgetConfig;
  state: WidgetState;
}

interface MenuPosition {
  visible: boolean;
  currentWidget?: internalWidgetState;
  x: number;
  y: number;
}

/**
 * This function loads the widget config from some persistent storage and create the widget configs
 * To be inplemented in the future
 */
function loadWidgetConfig(): WidgetConfig[] {
  return [
    'test.pressure',
    'test.temperature',
    'test.enabled',
    'test.status',
  ].map<WidgetConfig>(createDefaultWidget);
}

export default function Dashboard({ url }: DashboardProps) {
  const { state, nowMs } = useTelemetry({ url });
  const channels = state?.channels ?? {};
  const config = useDashboard();

  // default data, replace when config storage is implemented
  // this should be read from a saved config file in the future
  useEffect(() => config.setWidgets(loadWidgetConfig()), []);

  const [menu, setMenu] = useState<MenuPosition>({
    visible: false,
    x: 0,
    y: 0,
    currentWidget: undefined,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    widget: internalWidgetState,
  ) => {
    e.preventDefault(); // Prevent the browser's default right-click menu
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      currentWidget: widget,
    });
  };

  // Close the popup when clicking anywhere outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    if (menu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menu.visible]);

  const widgetStates = config.widgets.map<internalWidgetState>((widget) => {
    return { config: widget, state: widgetFactory(widget) };
  });

  function removeWidget(widget?: WidgetConfig) {
    setMenu({ visible: false, x: 0, y: 0, currentWidget: undefined });
    if (
      widget &&
      confirm(
        `Are you sure you want to remove widget ${widget.componentTitle ?? channels[widget.channelId]?.signal.label ?? 'Unknown Channel'}?`,
      )
    ) {
      config.removeWidget(widget.componentId);
    }
  }

  return (
    <>
      <div className="dashboard-grid">
        {widgetStates.map((widget) => (
          <div
            key={widget.config.componentId}
            onContextMenu={(e) => handleContextMenu(e, widget)}
          >
            <BaseComponent
              id={widget.config.componentId}
              componentType={widget.config.componentType ?? 'numeric'}
              title={
                widget.config.componentTitle ??
                channels[widget.config.channelId]?.signal.label ??
                'Unknown Channel'
              }
              channel={channels[widget.config.channelId]}
              currentTime={nowMs}
            >
              {widget.state.renderer(
                channels[widget.config.channelId],
                widget.config.componentSpecificSetting,
              )}
            </BaseComponent>
          </div>
        ))}
      </div>
      {menu.visible && (
        <div
          onClick={(e) => e.stopPropagation()}
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menu.y,
            left: menu.x,
          }}
          className="dashboard-popup"
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li className="dashboard-popup-item dashboard-popup-not-implemented">
              Change Type
            </li>
            <li className="dashboard-popup-item dashboard-popup-not-implemented">
              Hide
            </li>
            <li
              className="dashboard-popup-item"
              onClick={() => removeWidget(menu.currentWidget?.config)}
            >
              Remove
            </li>
          </ul>
          {Object.keys(menu.currentWidget?.state?.availableActions ?? {})
            .length > 1 && (
            <>
              <hr />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {Object.entries(
                  menu.currentWidget?.state?.availableActions ?? {},
                ).map((action) => (
                  <li
                    className="dashboard-popup-item"
                    onClick={() => action[1](menu.currentWidget?.config)}
                  >
                    {action[0]}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </>
  );
}
