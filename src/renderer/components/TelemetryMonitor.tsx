import { useTelemetry } from '../data/useTelemetry';
import { ChannelList } from './ChannelList';

interface TelemetryMonitorProps {
  /** Telemetry event stream URL. */
  url: string;
}

export function TelemetryMonitor({ url }: TelemetryMonitorProps) {
  const { state, nowMs } = useTelemetry({ url });

  return (
    <section aria-label="Telemetry monitor">
      <h2>Telemetry monitor</h2>
      {state ? (
        <ChannelList state={state} nowMs={nowMs} />
      ) : (
        <p>Waiting for channels</p>
      )}
    </section>
  );
}
