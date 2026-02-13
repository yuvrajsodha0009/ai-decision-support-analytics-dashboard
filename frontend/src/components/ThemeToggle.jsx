import { Moon, Sun } from "lucide-react";
import { usePreferences } from "../context/PreferencesContext";

const ThemeToggle = ({ className = "" }) => {
  const { preferences, updatePreferences } = usePreferences();
  const isDark = preferences.theme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    updatePreferences({ theme: next });
    localStorage.setItem("theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-main)] shadow-sm hover:shadow-md transition hover:-translate-y-px ${className}`}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
};

export default ThemeToggle;
