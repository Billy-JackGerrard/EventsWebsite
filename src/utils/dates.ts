export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/**
 * Parse a timestamptz string from Supabase and return a local-time Date.
 * new Date(isoString) correctly shifts UTC → local when the string has a
 * timezone offset, which Supabase always provides for timestamptz columns.
 */
const parseLocal = (isoString: string): Date => new Date(isoString);

/**
 * Returns "YYYY-MM-DD" in the **local** timezone.
 * Used to match calendar cells (which are also local dates) against events.
 */
export const toLocalDateKey = (isoString: string): string => {
  const d = parseLocal(isoString);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

export const formatDate = (isoString: string): string => {
  return parseLocal(isoString).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  // → "1 June 2026"
};

export const formatTime = (isoString: string): string => {
  return parseLocal(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });
  // → "19:00"
};

export const formatDateTimeRange = (start: string, finish?: string): string => {
  const startDate = formatDate(start);
  const finishDate = finish ? formatDate(finish) : null;
  const sameDay = finishDate && startDate === finishDate;

  if (finish && !sameDay) {
    return `${startDate} ${formatTime(start)} – ${finishDate} ${formatTime(finish)}`;
  }

  const timeStr = finish
    ? `${formatTime(start)} – ${formatTime(finish)}`
    : formatTime(start);

  return `${timeStr} · ${startDate}`;
};