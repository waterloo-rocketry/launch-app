import BaseComponent from './BaseComponent';
import { getLatestReading, type ChannelState } from '../data/channel-store';

interface NumericWidgetProps {
  id: string;
  channel?: ChannelState;
  currentTime: number;
  title?: string;
}

function formatNumber(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : null;
}

/** Shows the latest numeric value of one channel inside the shared container. */
export default function NumericWidget({
  id,
  channel,
  currentTime,
  title,
}: NumericWidgetProps) {
  const latest = channel ? getLatestReading(channel) : undefined;
  const text = latest ? formatNumber(latest.value) : null;
  const unit = channel?.signal.unit;

  let content: string;
  if (!latest) {
    content = '--';
  } else if (text === null) {
    content = 'Not a number';
  } else {
    content = unit ? `${text} ${unit}` : text;
  }

  return (
    <BaseComponent
      id={id}
      componentType="numeric"
      channel={channel}
      currentTime={currentTime}
      title={title}
    >
      <p data-testid="numeric-value">{content}</p>
    </BaseComponent>
  );
}
