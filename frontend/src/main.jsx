import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import { PreferencesProvider } from "./context/PreferencesContext";

const token = localStorage.getItem("token");
if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

// Prevent theme flash: apply stored or system preference before React render
const readBootTheme = () => {
  try {
    const prefRaw = localStorage.getItem("userPreferences");
    if (prefRaw) {
      const parsed = JSON.parse(prefRaw);
      if (parsed?.theme === "dark" || parsed?.theme === "light") {
        return parsed.theme;
      }
    }
  } catch (_) {
    // ignore
  }
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const initialTheme = readBootTheme();
if (initialTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}
localStorage.setItem("theme", initialTheme);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PreferencesProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          },
        }}
      />
    </PreferencesProvider>
  </StrictMode>
);
