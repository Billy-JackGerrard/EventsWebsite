export const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  
  export const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  
  export const formatTime = (isoString: string): string =>
    new Date(isoString).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  
  export const formatDateTimeRange = (start: string, finish?: string): string => {
    const sameDay = finish && formatDate(start) === formatDate(finish);
    if (finish && !sameDay) {
      return `${formatDate(start)} ${formatTime(start)} – ${formatDate(finish)} ${formatTime(finish)}`;
    }
    const dateStr = formatDate(start);
    const timeStr = finish ? `${formatTime(start)} – ${formatTime(finish)}` : formatTime(start);
    return `${timeStr} · ${dateStr}`;
  };