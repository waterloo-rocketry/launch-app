import { useTelemetry } from '../data/useTelemetry';
import { DashboardGrid } from './DashboardGrid';
import { DEFAULT_LAYOUT } from '../Layout';

interface TelemetryMonitorProps {
  /** Telemetry event stream URL. */
  url: string;
}

export function TelemetryMonitor({ url }: TelemetryMonitorProps) {
  const { state, nowMs } = useTelemetry({ url });

  const content = () => {
    if (!state) return <p>Waiting for channels</p>;
    if (Object.keys(state.channels).length === 0) {
      return <p>No channels configured</p>;
    }
    return (
      <DashboardGrid
        layout={DEFAULT_LAYOUT}
        telemetryState={state}
        nowMs={nowMs}
      />
    );
  };

  return (
    <section aria-label="Telemetry monitor">
      <h2>Telemetry monitor</h2>
      {content()}
    </section>
  );
}
