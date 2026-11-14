import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard, { WidgetCustomActions } from './Dashboard';
import * as dashboardStore from '../data/dashboard-store';
import { getMockFixture, MOCK_SIGNALS } from '../data/mock/fixtures';
import { TestEventSource } from '../test/event-source';

const widget = (label: string) => screen.getByRole('region', { name: label });
const widgets = () => document.querySelectorAll('[data-widget-id]');

function startDashboard() {
  render(<Dashboard url="/test-api/events" />);
  const events = TestEventSource.instances[0];
  expect(events.url).toBe('/test-api/events');
  return events;
}

function freshFrame(value = 42, timestampMs = Date.now()) {
  const frame = getMockFixture();
  frame.timestampMs = timestampMs;
  frame.readings.forEach((reading) => {
    reading.timestampMs = timestampMs;
    if (reading.signalId === 'test.pressure' && reading.quality === 'good')
      reading.value = value;
  });
  return frame;
}

describe('Dashboard', () => {
  it('shows configured widgets and updates labels and readings as telemetry arrives', () => {
    const events = startDashboard();
    expect(widgets()).toHaveLength(4);
    expect(
      screen.getAllByRole('region', { name: 'Unknown Channel' }),
    ).toHaveLength(4);

    act(() => events.signals(MOCK_SIGNALS));
    expect(widget('Test pressure')).toHaveAttribute(
      'data-widget-id',
      'test.pressure',
    );
    expect(
      within(widget('Test pressure')).getByRole('alert'),
    ).toHaveTextContent('No data!');

    act(() => events.frame(freshFrame(42)));
    expect(widget('Test pressure')).toHaveTextContent('(Placeholder Widget)42');
    expect(
      within(widget('Test pressure')).queryByRole('alert'),
    ).not.toBeInTheDocument();

    act(() => events.frame(freshFrame(58, Date.now() + 1)));
    expect(widget('Test pressure')).toHaveTextContent('(Placeholder Widget)58');

    act(() =>
      events.signals(
        MOCK_SIGNALS.map((signal) =>
          signal.id === 'test.pressure'
            ? { ...signal, label: 'Updated pressure' }
            : signal,
        ),
      ),
    );
    expect(widget('Updated pressure')).toHaveTextContent(
      '(Placeholder Widget)58',
    );
  });

  it('removes only the selected widget after confirmation', () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal('confirm', confirm);
    const events = startDashboard();
    act(() => events.signals(MOCK_SIGNALS));

    fireEvent.contextMenu(widget('Test pressure'), {
      clientX: 12,
      clientY: 34,
    });
    fireEvent.click(screen.getByText('Remove'));

    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to remove widget Test pressure?',
    );
    expect(
      screen.queryByRole('region', { name: 'Test pressure' }),
    ).not.toBeInTheDocument();
    expect(widgets()).toHaveLength(3);
    expect(widget('Test temperature')).toBeInTheDocument();
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('removes by component ID when it differs from the channel ID', () => {
    const removeWidget = vi.fn();
    const useDashboard = vi
      .spyOn(dashboardStore, 'useDashboard')
      .mockReturnValue({
        widgets: [{ channelId: 'test.pressure', componentId: 'pressure-copy' }],
        setWidgets: vi.fn(),
        removeWidget,
        addWidget: vi.fn(),
        updateWidget: vi.fn(),
        swapWidget: vi.fn(),
      });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    try {
      const events = startDashboard();
      act(() => events.signals(MOCK_SIGNALS));
      fireEvent.contextMenu(widget('Test pressure'));
      fireEvent.click(screen.getByText('Remove'));

      expect(removeWidget).toHaveBeenCalledExactlyOnceWith('pressure-copy');
    } finally {
      useDashboard.mockRestore();
    }
  });

  it('keeps the widget when removal is cancelled and closes the menu', () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    const events = startDashboard();
    act(() => events.signals(MOCK_SIGNALS));

    fireEvent.contextMenu(widget('Test pressure'));
    fireEvent.click(screen.getByText('Remove'));

    expect(widget('Test pressure')).toBeInTheDocument();
    expect(widgets()).toHaveLength(4);
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });
});
