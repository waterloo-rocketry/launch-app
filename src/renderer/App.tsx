import { APP_NAME } from '../shared';
import BaseComponent from './components/BaseComponent';
import { Header } from './components/Header';
import { MockConnectionStatus } from './components/MockConnectionStatus';
import { TelemetryMonitor } from './components/TelemetryMonitor';

// Vite proxies this to the standalone mock server during development.
const MOCK_TELEMETRY_URL = '/mock-api/events';

export default function App() {
  return (
    <div className="app-shell">
      <Header title={APP_NAME} />
      <main>
        {import.meta.env.DEV && <MockConnectionStatus />}
        {/* Development only until a production telemetry backend exists. */}
        {import.meta.env.DEV && <TelemetryMonitor url={MOCK_TELEMETRY_URL} />}
        <section aria-label="Dashboard">
          <BaseComponent id={"TestID"}
                          children={<p>TestChild</p>}
                          componentType={"Test"}
                          status={"active"}
                          title={"BaseComponentTest"}
          />

          <BaseComponent id={"ErrorID"}
                          children={<p>This one should have an error</p>}
                          componentType={"Test"}
                          status={"error"}
                          title={"Please have an error"}
                          errorMessage={"Hello I am an error message"}
          />

          <p>Dashboard coming soon</p>
        </section>
      </main>
    </div>
  );
}
