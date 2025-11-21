import { DateCalculation } from '../types';

export const calculateDuration = (startDateStr: string | null, endDateStr: string | null): DateCalculation => {
  if (!startDateStr || !endDateStr) {
    return { businessDays: 0, calendarDays: 0 };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Normalize time to midnight to avoid partial day issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) {
    return { businessDays: 0, calendarDays: 0 };
  }

  // Calendar Days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const calendarDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Business Days
  let businessDays = 0;
  const current = new Date(start);
  
  // Loop through dates (inclusive of start, exclusive of end typically, 
  // but usually for duration "inclusive-inclusive" depends on definition.
  // Assuming standard duration: Day 1 to Day 2 is 1 day duration).
  // Logic: Count days between.
  
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return { businessDays, calendarDays };
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
  // Using UTC to avoid timezone shifts if the input string is just YYYY-MM-DD
};
