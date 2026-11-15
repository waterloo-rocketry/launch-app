import { APP_NAME } from '../shared';
import Dashboard from './components/Dashboard';
import { Header } from './components/Header';
import { MockConnectionStatus } from './components/MockConnectionStatus';
import { TelemetryMonitor } from './components/TelemetryMonitor';
import { useTelemetry } from './data/useTelemetry';

// Vite proxies this to the standalone mock server during development.
const MOCK_TELEMETRY_URL = '/mock-api/events';

export default function App() {
  const { state, nowMs } = useTelemetry({ url: MOCK_TELEMETRY_URL });

  return (
    <div className="app-shell">
      <Header title={APP_NAME} />
      <main>
        {import.meta.env.DEV && <MockConnectionStatus />}
        {/* Development only until a production telemetry backend exists. */}
        {import.meta.env.DEV && (
          <TelemetryMonitor state={state} nowMs={nowMs} />
        )}
        <section aria-label="Dashboard">
          {import.meta.env.DEV && <Dashboard state={state} nowMs={nowMs} />}
        </section>
      </main>
    </div>
  );
}
