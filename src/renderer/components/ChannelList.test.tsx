import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChannelList } from './ChannelList';
import { TelemetryMonitor } from './TelemetryMonitor';
import { applyFrame, createTelemetryState } from '../data/channel-store';
import { getMockFixture, MOCK_SIGNALS } from '../data/mock/fixtures';
import type { DataFrame } from '../../shared/data-source';
import { TestEventSource } from '../test/event-source';

function renderList(frame?: DataFrame, nowMs = getMockFixture().timestampMs) {
  let state = createTelemetryState(MOCK_SIGNALS);
  if (frame) state = applyFrame(state, frame);
  render(<ChannelList state={state} nowMs={nowMs} />);
}

const row = (label: string) =>
  screen.getByRole('row', { name: new RegExp(label) });

describe('channel list', () => {
  it('lists every channel with no data before readings arrive', () => {
    renderList();
    for (const signal of MOCK_SIGNALS)
      expect(row(signal.label)).toHaveTextContent('no data');
  });

  it('shows status, latest value with unit, and reading age', () => {
    renderList(getMockFixture(), getMockFixture().timestampMs + 1_500);
    const pressure = row('Test pressure');
    expect(pressure).toHaveTextContent('active');
    expect(pressure).toHaveTextContent('42 kPa');
    expect(pressure).toHaveTextContent('1.5 s ago');
    expect(row('Test enabled')).toHaveTextContent('true');
    expect(row('Test status')).toHaveTextContent('idle');
  });

  it.each(['stale', 'missing', 'invalid'] as const)(
    'shows %s channels',
    (scenario) => {
      renderList(getMockFixture(scenario));
      expect(
        within(row('Test pressure')).getByText(scenario),
      ).toBeInTheDocument();
    },
  );

  it('hides values that are missing or invalid', () => {
    renderList(getMockFixture('missing'));
    expect(row('Test pressure')).toHaveTextContent('—');
  });

  it('handles an empty catalogue', () => {
    render(<ChannelList state={createTelemetryState([])} nowMs={0} />);
    expect(screen.getByText('No channels configured')).toBeInTheDocument();
  });
});

describe('telemetry monitor', () => {
  it('waits for the catalogue, then lists live channels', () => {
    render(<TelemetryMonitor url="/test-api/events" />);
    expect(screen.getByText('Waiting for channels')).toBeInTheDocument();

    const events = TestEventSource.instances[0];
    expect(events.url).toBe('/test-api/events');
    act(() => events.signals(MOCK_SIGNALS));
    act(() => events.frame({ ...getMockFixture(), timestampMs: Date.now() }));
    expect(row('Test pressure')).toHaveTextContent('42 kPa');

    act(() => events.onerror?.());
    expect(row('Test pressure')).toHaveTextContent('disconnected');
  });
});
