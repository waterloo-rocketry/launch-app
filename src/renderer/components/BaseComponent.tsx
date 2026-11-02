import type { ReactNode } from "react";
import "../styles/baseComponent.css";
import { ChannelState } from "../data/channel-store";

//These are from the statuses a channel can have
export type componentStatus = "active" | "no-data" | "missing" | "stale" | "invalid" | "disconnected";
export type componentType = "numeric" | "plot" | "guage";

// Example Components:
{/* <BaseComponent id={"1"}
                          children={<p>TestChild</p>}
                          componentType={"Test"}
                          status={"active"}
                          title={"BaseComponentTest"}
          /> 

    <BaseComponent id={"ErrorID"}
                          children={<p>This one should have an error</p>}
                          componentType={"Test"}
                          status={"error"}
                          title={"Please have an error"}
                          errorMessage={"Hello I am an error message"}
          />

          */}

// id should be unique between two of the same type. 
// componentType is the type
// Title is the title, displayed at top of the component
// Channel is the data channel it is using. Helps to know but not needed. Base shouldn't be pulling data itself I think
// Status is the status. Determines what is shown depending on active/error/stale/no-data
// errorMessage is self explanatory, plug in error message in the more speciifc component
// children is what is rendered in the widget. See examples. Can be more complex of course.

interface BaseProps {
  id: string;
  componentType: componentType;
  title?: string;
  channel?: ChannelState;
  status: componentStatus;
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
      case "missing":
        return <p role="alert">Missing: {errorMessage ?? "Unknown error"}</p>;
      case "disconnected":
        return <p role="alert">Disconnected Sadge</p>
      case "invalid":
        return <p role="alert">Invalid: {errorMessage ?? "Unknown error"}</p>
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
      <h1>{`${title ?? ""}${status === "stale" ? " (Stale)" : ""}`}</h1>
      {channel && <p className="widget__channel">{channel.signal.label}</p>}
      <div className="widget__body">{renderContents()}</div>
    </section>
  );
}