import { APP_NAME } from '../shared';
import { Header } from './components/Header';
import { MockConnectionStatus } from './components/MockConnectionStatus';
import { TelemetryMonitor } from './components/TelemetryMonitor';
import BaseComponent from './components/BaseComponent';
import RegisterProgressBar from './components/ProgressBar';
import { TelemetryProvider } from './data/TelemetryProvider';

// Vite proxies this to the standalone mock server during development.
const MOCK_TELEMETRY_URL = '/mock-api/events';

export default function App() {
  RegisterProgressBar()

  return (
    <div className="app-shell">
      <Header title={APP_NAME} />
      <main>
        {import.meta.env.DEV && <MockConnectionStatus />}
        {/* Development only until a production telemetry backend exists. */}
        {import.meta.env.DEV && <TelemetryMonitor url={MOCK_TELEMETRY_URL} />}

        {/* Demo for issue #28: a widget bound to one channel via useChannel. */}
        {import.meta.env.DEV && (
          <TelemetryProvider url={MOCK_TELEMETRY_URL}>
            <BaseComponent id={"pressure1"} componentType='progress-bar' channels={['test.pressure']} config={{min: 0, max: 100}}/>
            <BaseComponent id={"pressure2"} componentType='progress-bar' channels={['test.pressure']} config={{min: 30, max: 45}}/>
            <BaseComponent id={"temperature1"} componentType='progress-bar' channels={['test.temperature']} config={{min: 0, max: 40}}/>
          </TelemetryProvider>
        )}

        <section aria-label="Dashboard">
          <p>Dashboard coming soon</p>
        </section>
      </main>
    </div>
  );
}
