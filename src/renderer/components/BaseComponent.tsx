import type { ReactNode } from "react";
import { Header } from "./Header";
import "../styles/baseComponent.css";

export type WidgetStatus = "active" | "no-data" | "error" | "stale";

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
// Channel is the data channel it is using. Helps to know but not needed. Base shouldn't be pulling data itself.
// Status is the status. Determines what is shown depending on active/error/stale/no-data
// errorMessage is self explanatory, plug in error message in the more speciifc component
// children is what is rendered in the widget. See examples. Can be more complex of course.

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
      <h1>{`${title ?? ""}${status === "stale" ? " (Stale)" : ""}`}</h1>
      {channel && <p className="widget__channel">{channel}</p>}
      <div className="widget__body">{renderContents()}</div>
    </section>
  );
}