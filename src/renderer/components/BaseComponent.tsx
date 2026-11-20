import type { ReactNode } from 'react';
import '../styles/baseComponent.css';
import { useChannel, ChannelData } from '../data/telemetry-context';

/**
 * BaseComponent
 *
 * Common container for numeric, plot, and gauge widgets. Renders a heading,
 * a status presentation, and a body slot for arbitrary visualization content.
 * Doesn't create any data visualizations, that's what children are for.
 *
 * Props:
 *  - id            Unique, stable identifier for this widget instance.
 *                  Rendered as `data-widget-id`.
 *  - componentType "numeric" | "plot" | "gauge". Used for deciding what to render
 *  - channels      The ChannelStates the widget is using. 
 *  - title         The title. Default is channel signal label.
 *  - errorMessage  Overrides the default text for the missing/invalid states.
 *  - config        Passed directly to the children widget during rendering
 *
 * Each status is also a class on the wrapper (`widget--active`, `widget--stale`,
 * etc.) for styling. The wrapper fills its parent, and `.widget__body` takes the
 * remaining space, so size a widget by sizing its parent. Update styling for new
 * types of widgets as needed
 *
 * Example:
 *   <BaseComponent
 *     id="pressure"
 *     componentType="numeric"
 *     title="Numeric"
 *     channel=["test.pressure"]
 *   >
 *   </BaseComponent>
 */

export type ComponentType = 'numeric' | 'plot' | 'gauge' | 'progress-bar';

export interface WidgetProps {
  channels: (ChannelData | null)[];
  width?: number;
  height?: number;
  config?: object;
}

export interface WidgetConfig {
  id: string;
  componentType: ComponentType;
  channels: string[];
  title?: string;
  config?: object;
  height?: number;
  width?: number;
}

export interface WidgetRegistry {
  renderingFunction: (props: WidgetProps) => ReactNode;
  availableActions: Record<string, (config?: WidgetConfig) => WidgetConfig | undefined>;
  overrideErrorMessage?: string;
  componentType: ComponentType;
}

interface ParsedChannel{
  channels: (ChannelData | null)[];
  overlayMessage: String | null;
  componentStatus: String;
}

const registeredWidgets = new Map<ComponentType, WidgetRegistry>();

const componentStatusSeverityMap = {
  'missing-channel': 6,
  'disconnected': 5,
  'missing': 4,
  'invalid': 3,
  'no-data': 2,
  'stale': 1,
  'active': 0
}

const componentStatusSeverity = ['active', 'stale', 'no-data', 'invalid', 'missing', 'disconnected', 'missing-channel']

export function RegisterWidget(widget: WidgetRegistry) {
  registeredWidgets.set(widget.componentType, widget);
}

export default function BaseComponent(config: WidgetConfig) {
  const widget = registeredWidgets.get(config.componentType)
  const errorMessage = widget?.overrideErrorMessage

  const parseChannels = (): ParsedChannel => {
    const channels = config.channels.map(id => useChannel(id))
    const messages = channels.map((c, idx) => getOverlayMessage(c?.channel.sourceId ?? config.channels[idx], c?.status ?? 'missing-channel')).filter(c => c != null)
    const overlayMessage = messages.length > 0 ? messages.reduce((prev, cur) => `${prev}\n${cur}`) : null;
    const componentStatusMostSevere: number = channels.reduce<number>((prev: number, c) => Math.max(componentStatusSeverityMap[c?.status ?? 'missing-channel'], prev), 0)
    
    return {channels, overlayMessage, componentStatus: componentStatusSeverity[componentStatusMostSevere]};
  }

  //Overlays any errors, otherwise no message is dispalyed
  const getOverlayMessage = (channel: string, componentStatus: string): string | null => {
    switch (componentStatus) {
      case 'no-data':
        return errorMessage ?? channel + ' - No data!';
      case 'missing':
        return errorMessage ?? channel + ' - Missing data!';
      case 'invalid':
        return errorMessage ?? channel + ' - Invalid channel data!';
      case 'missing-channel':
        return errorMessage ?? channel + ' - Channel not found!';
      default:
        return null;
    }
  };

  const {channels, overlayMessage, componentStatus} = parseChannels();
  const suffix =
    componentStatus === 'stale' || componentStatus === 'disconnected'
      ? ` (${componentStatus})`
      : '';
  const heading = config.title ?? channels.map(c => c?.channel?.signal?.kind ?? "").join(" | ")

  return (
    <section
      className={`widget widget--${config.componentType} widget--${componentStatus}`}
      data-widget-id={config.id}
      aria-label={heading}
    >
      <h3>{heading + suffix}</h3>
      <div className="widget__body">
        <div
          className="widget__content"
          aria-hidden={overlayMessage !== null}
          inert={overlayMessage !== null}
        >
          {widget?.renderingFunction({channels, width: config.width, height: config.height, config: config.config})}
        </div>
        {overlayMessage !== null && (
          <p className="widget__overlay" role="alert">
            {overlayMessage}
          </p>
        )}
      </div>
    </section>
  );
}
