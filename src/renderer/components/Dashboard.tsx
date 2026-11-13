import { ReactNode, useEffect, useState } from "react";
import BaseComponent from "./BaseComponent";
import { useTelemetry } from "../data/useTelemetry"
import { ChannelState, getLatestReading } from "../data/channel-store";
import '../styles/dashboard.css'
import { useDashboard, createDefaultWidget, WidgetSetting } from "../data/dashboard-store";


interface DashboardProps {
    /** Telemetry event stream URL. */
    url: string;
}

export default function Dashboard({ url }: DashboardProps) {
    const { state, nowMs } = useTelemetry({ url });
    const channels = state?.channels ?? {}
    const config = useDashboard()

    // default data, replace when config storage is implemented
    // this should be read from a saved config file in the future
    useEffect(() => config.setWidgets(["test.pressure", "test.temperature", "test.enabled", "test.status"].map<WidgetSetting>(createDefaultWidget)), [url])

    return (
        <div className="dashboard-grid">
            {
                config.widgets.map((widget, idx) =>
                    <BaseComponent
                        key={widget.componentId + "_parent"}
                        id={widget.componentId}
                        componentType={widget.componentType ?? 'numeric'}
                        title={widget.componentTitle ?? channels[widget.channelId]?.signal.label ?? "Unknown Channel"}
                        channel={channels[widget.channelId]}
                        currentTime={nowMs}
                    >
                        {channels[widget.channelId] ? getLatestReading(channels[widget.channelId])?.value : "No Value"}
                    </BaseComponent>
                )
            }
        </div>
    )
}