/**
 * Utility functions for calendar and specific date calculations
 */

// Returns YYYY-MM-DD string for a given Date
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get Monday of the week containing the given date
export function getMondayOfCurrentWeek(referenceDate: Date = new Date()): Date {
  const date = new Date(referenceDate);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Returns an array of 7 Date objects (Mon -> Sun) for the week starting at given monday
export function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Converts dayIndex (0 = Mon, 6 = Sun) to corresponding YYYY-MM-DD date for a given week Monday
export function getDateFromDayIndex(monday: Date, dayIndex: number): string {
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIndex);
  return formatDateISO(d);
}

// Gets dayIndex (0 = Mon ... 6 = Sun) from YYYY-MM-DD string
export function getDayIndexFromDateString(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 is Sun, 1 is Mon
  return day === 0 ? 6 : day - 1;
}

// Formats Chinese Date display e.g. "08月03日 (周一)"
export function formatChineseDateShort(dateStrOrObj: string | Date): string {
  const date = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  if (isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 (${weekDays[date.getDay()]})`;
}
