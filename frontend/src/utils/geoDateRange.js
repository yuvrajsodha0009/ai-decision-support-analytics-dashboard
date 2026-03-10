export const GEO_DATE_PRESET_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

export const toDateInputValue = (isoDate) => {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export const buildStartIso = (inputDate) =>
  new Date(`${inputDate}T00:00:00.000Z`).toISOString();

export const buildEndIso = (inputDate) =>
  new Date(`${inputDate}T23:59:59.999Z`).toISOString();

export const getPresetRange = (preset) => {
  const now = new Date();
  const dayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  if (preset === "today") {
    const dayStart = new Date(dayEnd);
    dayStart.setUTCHours(0, 0, 0, 0);
    return {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    };
  }

  const presetDays = {
    last7: 7,
    last30: 30,
  };

  const totalDays = presetDays[preset] || 30;
  const start = new Date(dayEnd);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: dayEnd.toISOString(),
  };
};

const sameInstant = (left, right) => {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
};

export const getPresetFromRange = (startIso, endIso) => {
  for (const preset of ["today", "last7", "last30"]) {
    const range = getPresetRange(preset);
    if (sameInstant(startIso, range.start) && sameInstant(endIso, range.end)) {
      return preset;
    }
  }
  return "custom";
};
