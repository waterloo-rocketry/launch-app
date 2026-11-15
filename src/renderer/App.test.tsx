import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { getMockFixture, MOCK_SIGNALS } from './data/mock/fixtures';
import { TestEventSource } from './test/event-source';

describe('application shell', () => {
  it('renders Launch App and the dashboard widgets', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Launch App', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[data-widget-id]')).toHaveLength(4);
  });

  it('shows the same telemetry readings in the monitor and dashboard', () => {
    render(<App />);
    const monitor = screen.getByRole('region', { name: 'Telemetry monitor' });
    const dashboard = screen
      .getAllByRole('region', { name: 'Dashboard' })
      .at(-1);
    expect(dashboard).toBeDefined();
    expect(
      within(monitor).getByText('Waiting for channels'),
    ).toBeInTheDocument();

    // The first stream belongs to MockConnectionStatus; App owns the second.
    expect(TestEventSource.instances).toHaveLength(2);
    const telemetry = TestEventSource.instances[1];
    expect(telemetry.url).toBe('/mock-api/events');
    act(() => telemetry.signals(MOCK_SIGNALS));
    const frame = getMockFixture();
    frame.timestampMs = Date.now();
    frame.readings.forEach(
      (reading) => (reading.timestampMs = frame.timestampMs),
    );
    act(() => telemetry.frame(frame));

    expect(
      within(monitor).getByRole('row', { name: /Test pressure/ }),
    ).toHaveTextContent('42 kPa');
    expect(
      within(dashboard!).getByRole('region', { name: 'Test pressure' }),
    ).toHaveTextContent('(Placeholder Widget)42');
  });
});
