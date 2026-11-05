import type { ReactNode } from 'react';
import '../styles/baseComponent.css';
import {
  getChannelStatus,
  type ChannelState,
  type ChannelStatus,
} from '../data/channel-store';

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
 *  - componentType "numeric" | "plot" | "gauge". Used only as a CSS class
 *                  (`widget--<type>`); the container does not branch on it.
 *  - channel       The ChannelState the widget is using
 *  - title         The title. Default is channel signal label.
 *  - currentTime   Current time in ms. Used to decide whether the channel is
 *                  stale, so the parent must pass a ticking value (e.g. `nowMs`
 *                  from useTelemetry) or staleness will never update. If this
 *                  needs changing in the future go for it
 *  - errorMessage  Overrides the default text for the missing/invalid states.
 *  - children      What is rendered inside the widget
 *
 *
 * Children are unmounted in the no-data, missing, and invalid states, so any
 * internal state in them (e.g. a plot's zoom level) resets when data returns.
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
 *     channel={channels["test.pressure"]}
 *     currentTime={nowMs}
 *   >
 *     <p>42 kPa</p>
 *   </BaseComponent>
 */

export type ComponentType = 'numeric' | 'plot' | 'gauge';

interface BaseProps {
  id: string;
  componentType: ComponentType;
  channel?: ChannelState;
  title?: string;
  currentTime: number;
  errorMessage?: string;
  children?: ReactNode;
}

export default function BaseComponent({
  id,
  componentType,
  channel,
  title,
  currentTime,
  errorMessage,
  children,
}: BaseProps) {
  const status: ChannelStatus = channel
    ? getChannelStatus(channel, currentTime)
    : 'missing';
  const heading = title ?? channel?.signal.label ?? '';

  const renderContents = () => {
    switch (status) {
      case 'active':
      case 'stale':
      case 'disconnected':
        return children;
      case 'no-data':
        return <p>No data</p>;
      case 'missing':
        return <p role="alert">{errorMessage ?? 'Channel not found'}</p>;
      case 'invalid':
        return <p role="alert">{errorMessage ?? 'Invalid channel data'}</p>;
      default:
        return null;
    }
  };

  const suffix =
    status === 'stale' || status === 'disconnected' ? ` (${status})` : '';

  return (
    <section
      className={`widget widget--${componentType} widget--${status}`}
      data-widget-id={id}
      aria-label={heading}
    >
      <h3>{heading + suffix}</h3>
      <div className="widget__body">{renderContents()}</div>
    </section>
  );
}
