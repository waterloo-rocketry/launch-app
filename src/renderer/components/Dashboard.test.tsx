import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { useWidgetStates } from './useWidgetStates';
import * as dashboardStore from '../data/dashboard-store';
import { getMockFixture, MOCK_SIGNALS } from '../data/mock/fixtures';
import { TestEventSource } from '../test/event-source';
import { useTelemetry } from '../data/useTelemetry';

const widget = (label: string) => screen.getByRole('region', { name: label });
const widgets = () => document.querySelectorAll('[data-widget-id]');

function startDashboard() {
  function DashboardWithTelemetry() {
    const { state, nowMs } = useTelemetry({ url: '/test-api/events' });
    return <Dashboard state={state} nowMs={nowMs} />;
  }
  render(<DashboardWithTelemetry />);
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
  it('reuses widget state on unrelated renders and refreshes it after config edits', () => {
    const pressure = dashboardStore.createDefaultWidget('test.pressure');
    const temperature = dashboardStore.createDefaultWidget('test.temperature');
    const factory = vi.fn((config: dashboardStore.WidgetConfig) => ({
      renderer: () => config.componentId,
      availableActions: {},
    }));
    const initialWidgets = [pressure];
    const hook = renderHook(
      ({ widgets }) => useWidgetStates(widgets, factory),
      { initialProps: { widgets: initialWidgets } },
    );
    const initialStates = hook.result.current;

    hook.rerender({ widgets: initialWidgets });
    expect(hook.result.current).toBe(initialStates);
    expect(factory).toHaveBeenCalledTimes(1);

    const withAddedWidget = [pressure, temperature];
    hook.rerender({ widgets: withAddedWidget });
    expect(hook.result.current.map(({ config }) => config.componentId)).toEqual(
      ['test.pressure', 'test.temperature'],
    );
    expect(hook.result.current).not.toBe(initialStates);
    expect(factory).toHaveBeenCalledTimes(3);

    const addedStates = hook.result.current;
    hook.rerender({ widgets: withAddedWidget });
    expect(hook.result.current).toBe(addedStates);
    expect(factory).toHaveBeenCalledTimes(3);

    hook.rerender({ widgets: [temperature] });
    expect(hook.result.current.map(({ config }) => config.componentId)).toEqual(
      ['test.temperature'],
    );
    expect(factory).toHaveBeenCalledTimes(4);
  });

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
