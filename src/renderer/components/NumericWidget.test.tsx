import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NumericWidget from './NumericWidget';
import {
  applyFrame,
  createTelemetryState,
  getLatestReading,
  type ChannelState,
} from '../data/channel-store';
import {
  getMockFixture,
  MOCK_SIGNALS,
  type MockScenario,
} from '../data/mock/fixtures';

const NOW = getMockFixture().timestampMs;

function channelsAfter(...scenarios: MockScenario[]) {
  let state = createTelemetryState(MOCK_SIGNALS);
  for (const scenario of scenarios) {
    state = applyFrame(state, getMockFixture(scenario));
  }
  return state.channels;
}

function withReading(
  channel: ChannelState,
  value: number,
  timestampMs: number,
): ChannelState {
  const latest = getLatestReading(channel);
  if (!latest) throw new Error('expected a reading');
  return {
    ...channel,
    history: [
      ...channel.history,
      {
        signalId: latest.signalId,
        timestampMs,
        quality: 'good' as const,
        value,
      },
    ],
  };
}

function renderWidget(channel: ChannelState | undefined) {
  return render(<NumericWidget id="n1" channel={channel} currentTime={NOW} />);
}

describe('NumericWidget', () => {
  it('shows the latest value of the selected channel', () => {
    const channel = channelsAfter('nominal')['test.pressure'];
    const latest = getLatestReading(channel);
    if (!latest) throw new Error('expected a reading');

    renderWidget(channel);

    expect(screen.getByTestId('numeric-value').textContent).toContain(
      String(latest.value),
    );
  });

  it('updates when a newer reading arrives', () => {
    const channel = channelsAfter('nominal')['test.pressure'];
    const { rerender } = renderWidget(channel);

    rerender(
      <NumericWidget
        id="n1"
        channel={withReading(channel, 123.5, NOW + 1)}
        currentTime={NOW}
      />,
    );

    expect(screen.getByTestId('numeric-value').textContent).toContain('123.5');
  });

  it('shows a clear message when the value is not a number', () => {
    const channel = channelsAfter('nominal')['test.pressure'];

    renderWidget(withReading(channel, NaN, NOW + 1));

    expect(screen.getByTestId('numeric-value').textContent).toBe(
      'Not a number',
    );
  });

  it('shows a no-data message before any reading', () => {
    renderWidget(channelsAfter()['test.pressure']);

    expect(screen.getByRole('alert').textContent).toContain('No data!');
    expect(screen.getByTestId('numeric-value').textContent).toBe('--');
  });

  it('flags stale data in the heading', () => {
    renderWidget(channelsAfter('stale')['test.pressure']);

    expect(screen.getByRole('heading').textContent).toContain('stale');
  });

  it('shows a channel-not-found message when the channel is missing', () => {
    renderWidget(undefined);

    expect(screen.getByRole('alert').textContent).toContain(
      'Channel not found!',
    );
  });
});
