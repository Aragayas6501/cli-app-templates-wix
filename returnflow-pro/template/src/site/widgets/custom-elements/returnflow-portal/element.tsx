import React from "react";
import ReactDOM from "react-dom";
import reactToWebComponent from "react-to-webcomponent";
import { ReturnFlowPortal } from "./portal.js";

interface ElementProps {
  headline?: string;
  accentColor?: string;
}

const WrappedElement = (props: ElementProps) => <ReturnFlowPortal {...props} />;

const customElement = reactToWebComponent(WrappedElement, React, ReactDOM, {
  props: {
    headline: "string",
    accentColor: "string",
  },
});

export default customElement;
