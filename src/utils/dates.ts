export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
  
export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });
  // → "1 June 2026"
};

export const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit"
  });
  // → "19:00"
};

export const formatDateTimeRange = (start: string, finish?: string): string => {
  const sameDay = finish && formatDate(start) === formatDate(finish);
  if (finish && !sameDay) {
    return `${formatDate(start)} ${formatTime(start)} – ${formatDate(finish)} ${formatTime(finish)}`;
  }
  const dateStr = formatDate(start);
  const timeStr = finish ? `${formatTime(start)} – ${formatTime(finish)}` : formatTime(start);
  return `${timeStr} · ${dateStr}`;
};