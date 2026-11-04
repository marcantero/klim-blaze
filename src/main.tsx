import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SubtleAlertOverlay from "./components/SubtleAlertOverlay";
import "./index.css";

const isSubtleAlert =
  window.location.hash.includes("subtle-alert") ||
  window.location.search.includes("subtle-alert");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isSubtleAlert ? <SubtleAlertOverlay /> : <App />}
  </React.StrictMode>
);
