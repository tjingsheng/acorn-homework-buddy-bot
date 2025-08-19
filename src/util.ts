export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

export function formatDateSingapore(date: Date): string {
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Singapore",
    weekday: "short", // e.g. "Mon"
    year: "numeric", // e.g. 2025
    month: "short", // e.g. "Aug"
    day: "2-digit", // e.g. "19"
    hour: "2-digit", // e.g. "14"
    minute: "2-digit", // e.g. "05"
    second: "2-digit", // e.g. "00"
    hour12: false, // 24-hour format
  });
}
