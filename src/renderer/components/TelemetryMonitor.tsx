import { useTelemetry } from '../data/useTelemetry';
import { ChannelList } from './ChannelList';

export function TelemetryMonitor() {
  const { state, nowMs } = useTelemetry();

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
