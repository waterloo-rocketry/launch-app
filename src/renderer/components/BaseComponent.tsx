import type { ReactNode } from "react";
import "../styles/baseComponent.css";
import {
  getChannelStatus,
  type ChannelState,
  type ChannelStatus
} from "../data/channel-store";

export type ComponentType = "numeric" | "plot" | "gauge";

interface BaseProps {
  id: string;
  componentType: ComponentType;
  channel?: ChannelState;
  title?: string;
  currentTime: number;
  errorMessage?: string;
  children?: ReactNode;
}

export default function BaseComponent({
  id, componentType, channel, title, currentTime, errorMessage, children,
}: BaseProps) {
  const status: ChannelStatus = channel ? getChannelStatus(channel, currentTime) : "missing";
  const heading = title ?? channel?.signal.label ?? "";

  const renderContents = () => {
    switch (status) {
      case "active":
      case "stale":
      case "disconnected":
        return children;
      case "no-data":
        return <p>No data</p>;
      case "missing":
        return <p role="alert">{errorMessage ?? "Channel not found"}</p>;
      case "invalid":
        return <p role="alert">{errorMessage ?? "Invalid channel data"}</p>;
      default:
        return null;
    }
  };

  const suffix = status === "stale" || status === "disconnected" ? ` (${status})` : "";

  return (
    <section
      className={`widget widget--${componentType} widget--${status}`}
      data-widget-id={id}
      aria-label={heading}
    >
      <h3>{heading + suffix}</h3>
      <div className="widget__body">{renderContents()}</div>
    </section>
  );
}