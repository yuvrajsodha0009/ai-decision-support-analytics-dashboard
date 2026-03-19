/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const defaultPreferences = {
  theme: "dark",
  density: "comfortable",
  animations: true,
};

const PreferencesContext = createContext({
  preferences: defaultPreferences,
  updatePreferences: () => {},
  setPreferences: () => {},
});

const getInitialPreferences = () => {
  try {
    const raw = localStorage.getItem("userPreferences");
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw);
    const { dateRange: LEGACY_DATE_RANGE, ...safeParsed } = parsed || {};
    return { ...defaultPreferences, ...safeParsed };
  } catch {
    return defaultPreferences;
  }
};

const applyRootClasses = (preferences) => {
  const root = document.documentElement;
  if (!root) return;

  // Theme via Tailwind dark class
  if (preferences.theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.classList.remove("density-compact", "density-comfortable");
  root.classList.remove("motion-on", "motion-off");

  root.classList.add(
    preferences.density === "compact" ? "density-compact" : "density-comfortable"
  );
  root.classList.add(preferences.animations ? "motion-on" : "motion-off");
};

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(getInitialPreferences);

  useEffect(() => {
    applyRootClasses(preferences);
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    // Keep lightweight theme key for early boot in main.jsx
    localStorage.setItem("theme", preferences.theme);
  }, [preferences]);

  const value = useMemo(
    () => ({
      preferences,
      setPreferences,
      updatePreferences: (patch) =>
        setPreferences((prev) => ({ ...prev, ...patch })),
    }),
    [preferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
