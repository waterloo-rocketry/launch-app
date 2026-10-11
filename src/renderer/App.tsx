import { APP_NAME } from '../shared';
import { Header } from './components/Header';
import { MockConnectionStatus } from './components/MockConnectionStatus';
import { TelemetryMonitor } from './components/TelemetryMonitor';

export default function App() {
  return (
    <div className="app-shell">
      <Header title={APP_NAME} />
      <main>
        {import.meta.env.DEV && <MockConnectionStatus />}
        {/* Development only until a production telemetry backend exists. */}
        {import.meta.env.DEV && <TelemetryMonitor />}
        <section aria-label="Dashboard">
          <p>Dashboard coming soon</p>
        </section>
      </main>
    </div>
  );
}
