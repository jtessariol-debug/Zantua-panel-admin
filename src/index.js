import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Reset global styles
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #F8F3EA; }
  body {
    background: #F8F3EA;
    color: #1B1B1B;
    font-family: 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    min-height: -webkit-fill-available;
    padding:
      env(safe-area-inset-top)
      env(safe-area-inset-right)
      env(safe-area-inset-bottom)
      env(safe-area-inset-left);
  }
  #root { min-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
  input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #F8F3EA; }
  ::-webkit-scrollbar-thumb { background: #B9C9C2; border-radius: 4px; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Error registrando service worker", error);
    });
  });
}
