import type { ReactNode } from "react";
import { Header } from "./Header";
import "../styles/baseComponent.css";

export type WidgetStatus = "active" | "no-data" | "error" | "stale";

interface BaseProps {
  id: string;
  componentType: string;
  title?: string;
  channel?: string;
  status: WidgetStatus;
  errorMessage?: string;
  children?: ReactNode;
}

export default function BaseComponent({
  id, componentType, title, channel, status, errorMessage, children,
}: BaseProps) {
  const renderContents = () => {
    switch (status) {
      case "active":
      case "stale":
        return children;
      case "no-data":
        return <p>No data</p>;
      case "error":
        return <p role="alert">{errorMessage ?? "Unknown error"}</p>;
      default:
        return null;
    }
  };

  return (
    <section
      className={`widget widget--${componentType} widget--${status}`}
      data-widget-id={id}
      aria-label={title}
    >
      <Header title={`${title ?? ""}${status === "stale" ? " (Stale)" : ""}`} />
      {channel && <p className="widget__channel">{channel}</p>}
      <div className="widget__body">{renderContents()}</div>
    </section>
  );
}