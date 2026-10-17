import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { GridSpike } from "./spike/GridSpike";
import "./styles.css";

const spike = new URLSearchParams(location.search).get("spike");

createRoot(document.getElementById("root")!).render(<StrictMode>{spike === "grid" ? <GridSpike /> : <App />}</StrictMode>);
