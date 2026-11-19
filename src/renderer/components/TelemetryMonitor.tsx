import { useTelemetry } from '../data/useTelemetry';
import { DashboardGrid } from './DashboardGrid';
import { DEFAULT_LAYOUT, type dashboardLayout } from '../Layout';

interface TelemetryMonitorProps {
  /** Telemetry event stream URL. */
  url: string;
  /**
   * Dashboard layout to show. Pass the same object on every render: a
   * different object makes the grid start over from it.
   */
  layout?: dashboardLayout;
}

export function TelemetryMonitor({
  url,
  layout = DEFAULT_LAYOUT,
}: TelemetryMonitorProps) {
  const { state, nowMs } = useTelemetry({ url });

  const content = () => {
    if (!state) return <p>Waiting for channels</p>;
    if (Object.keys(state.channels).length === 0) {
      return <p>No channels configured</p>;
    }
    return (
      <DashboardGrid layout={layout} telemetryState={state} nowMs={nowMs} />
    );
  };

  return (
    <section aria-label="Telemetry monitor">
      <h2>Telemetry monitor</h2>
      {content()}
    </section>
  );
}
