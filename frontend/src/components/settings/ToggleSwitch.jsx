const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        checked
          ? "border-cyan-400/60 bg-cyan-400/30"
          : "border-white/10 bg-white/5"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full transition ${
          checked
            ? "translate-x-6 bg-gradient-to-br from-cyan-300 to-teal-400"
            : "translate-x-1 bg-slate-400"
        }`}
      />
    </button>
  );
};

export default ToggleSwitch;
