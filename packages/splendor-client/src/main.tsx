import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "@dominion/ui/room-code.css";
import "./styles.css";
import "./splendor-board.css";
import "./upstream-gameboard.css";
import "./upstream-otherplayers.css";
import "./upstream-modals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
