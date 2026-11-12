import type { dashboardLayout, widgetConfig } from "../Layout";
import { ProgressBar } from "./ProgressBar";
import { ChannelList } from "./ChannelList";
import type { TelemetryState } from "../data/channel-store";

interface dashboardGridProps {
    layout: dashboardLayout;
    telemetryState: TelemetryState;
    nowMs: number
}

export function renderWidget(config: widgetConfig, {telemetryState, nowMs}: dashboardGridProps) {
    switch(config.kind){
        case 'channel-list': {
            let channels = telemetryState.channels
            let channelList = Object.values(channels)
            return <ChannelList channels={channelList} nowMs={nowMs}></ChannelList>
        }
        case 'progress-bar': {
            let {signalId, min, max} = config;

            let channel = telemetryState.channels[signalId]

            if(!channel) return <p>Channel not found</p>

            return <ProgressBar channel={channel} min={min} max={max} nowMs={nowMs}></ProgressBar>
        }
    }

}

export function DashboardGrid ({layout, telemetryState, nowMs}: dashboardGridProps) {
    
    const {numberOfCols, items} = layout;


    return (
        <div className="dashboard-grid" style={{gridTemplateColumns: `repeat(${numberOfCols}, 1fr)`}}>
            {
                items.map((item) => (
                    <div key={item.id} className="dashboard-cell" style={{gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: `${item.y + 1} / span ${item.h}`}}>
                        {
                            renderWidget(item.widgetConfig, {layout, telemetryState, nowMs})
                        }
                    </div>
                ))
            }
        </div>
    );
}