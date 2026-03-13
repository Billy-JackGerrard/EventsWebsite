export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
  
export const formatDate = (isoString: string): string => {
    const [year, month, day] = isoString.slice(0, 10).split("-").map(Number);
    return `${day} ${MONTHS[month - 1]} ${year}`;
};
  
export const formatTime = (isoString: string): string => {
  const [, time] = isoString.split("T");
  return time.slice(0, 5); // "HH:MM"
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