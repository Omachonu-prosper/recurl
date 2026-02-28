import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Completely disable ALL zoom mechanisms ──
// 1. Block Ctrl+wheel (scroll zoom)
document.addEventListener("wheel", (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

// 2. Block Ctrl+Plus/Minus/0 (keyboard zoom)
document.addEventListener("keydown", (e) => {
  if (
    e.ctrlKey &&
    (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "0")
  ) {
    e.preventDefault();
  }
});

// 3. Block pinch-to-zoom on touchpads/touchscreens
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());

// 4. Reset zoom to 100% in case it's currently zoomed
// @ts-ignore - webview specific API
if (document.body.style.zoom !== undefined) {
  document.body.style.zoom = "1";
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
