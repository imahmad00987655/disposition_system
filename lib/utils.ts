import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parse, addHours, differenceInSeconds, isWeekend, setHours, setMinutes, addDays } from "date-fns";
import {
  validatePakistaniPhoneNumber,
  formatPakistaniPhoneNumber,
  calculateAutoTimeline,
  adjustForWeekends,
  isWithinWorkingHours,
  calculateRemainingWorkingHours,
  calculateEndTime,
  type PhoneValidation,
} from './utils-extended';

// Re-export extended utilities
export {
  validatePakistaniPhoneNumber,
  formatPakistaniPhoneNumber,
  calculateAutoTimeline,
  adjustForWeekends,
  isWithinWorkingHours,
  calculateRemainingWorkingHours,
  calculateEndTime,
  type PhoneValidation,
};

const KARACHI_TIMEZONE = 'Asia/Karachi';

const DATE_PARSE_PATTERNS: string[] = [
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "yyyy-MM-dd hh:mm:ss a",
  "yyyy-MM-dd hh:mm a",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm",
  "yyyy/MM/dd HH:mm:ss",
  "yyyy/MM/dd HH:mm",
  "yyyy/MM/dd hh:mm:ss a",
  "yyyy/MM/dd hh:mm a",
  "dd-MM-yyyy HH:mm:ss",
  "dd-MM-yyyy HH:mm",
  "dd-MM-yyyy hh:mm:ss a",
  "dd-MM-yyyy hh:mm a",
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy hh:mm:ss a",
  "dd/MM/yyyy hh:mm a",
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy HH:mm",
  "MM/dd/yyyy hh:mm:ss a",
  "MM/dd/yyyy hh:mm a",
  "yyyy-MM-dd",
  "dd-MM-yyyy",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
];

const hasExplicitTimezone = (value: string): boolean => {
  return /(?:[+-]\d{2}:?\d{2}|Z)$/i.test(value.trim());
};

const getTimeZoneOffsetMinutes = (date: Date, timeZone: string): number => {
  const optionVariants: Intl.DateTimeFormatOptions[] = [
    { timeZone, timeZoneName: "shortOffset", hour12: false },
    { timeZone, timeZoneName: "longOffset", hour12: false },
    { timeZone, timeZoneName: "short", hour12: false },
    { timeZone, timeZoneName: "long", hour12: false },
  ];

  for (const options of optionVariants) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
      const offsetPart = parts.find(part => part.type === "timeZoneName");
      if (!offsetPart) continue;

      const match = offsetPart.value.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
      if (!match) continue;

      const hoursComponent = parseInt(match[1], 10);
      const minutesComponent = match[2] ? parseInt(match[2], 10) : 0;
      const totalMinutes = Math.abs(hoursComponent) * 60 + minutesComponent;

      return hoursComponent < 0 ? -totalMinutes : totalMinutes;
    } catch {
      // try next fallback
    }
  }

  return NaN;
};

const shiftDateToTimeZone = (date: Date, targetTimeZone: string): Date => {
  const targetOffset = getTimeZoneOffsetMinutes(date, targetTimeZone);
  if (isNaN(targetOffset)) {
    return new Date(date.getTime());
  }

  const systemOffset = -date.getTimezoneOffset();
  const offsetDifference = targetOffset - systemOffset;
  return new Date(date.getTime() - offsetDifference * 60 * 1000);
};

const normalizeTimeFragment = (time: string): string => {
  if (!time) return '';
  const trimmed = time.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();
  if (upper.endsWith('AM') || upper.endsWith('PM')) {
    return upper;
  }

  const timeParts = upper.split(':');
  if (timeParts.length >= 2) {
    const seconds = timeParts[2] ?? '00';
    return `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }

  return upper;
};

const parseToDate = (input: string | Date): Date | null => {
  if (!input) return null;

  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  if (typeof input === 'number') {
    const numericDate = new Date(input);
    return isNaN(numericDate.getTime()) ? null : numericDate;
  }

  const raw = input.toString().trim();
  if (!raw) return null;

  // Handle pure time strings by attaching a reference date
  if (/^\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?$/i.test(raw)) {
    const reference = `1970-01-01 ${normalizeTimeFragment(raw)}`;
    for (const pattern of DATE_PARSE_PATTERNS) {
      const parsed = parse(reference, `yyyy-MM-dd ${pattern}`, new Date());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // Attempt direct parsing via known patterns
  for (const pattern of DATE_PARSE_PATTERNS) {
    try {
      const parsed = parse(raw, pattern, new Date());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // continue
    }
  }

  // Attempt ISO normalization
  const isoCandidate = raw.replace(' ', 'T');
  const isoWithSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoCandidate)
    ? `${isoCandidate}:00`
    : isoCandidate;

  const fallbackDate = new Date(isoWithSeconds);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  const finalFallback = new Date(raw);
  return isNaN(finalFallback.getTime()) ? null : finalFallback;
};

const toKarachiDate = (input: string | Date): Date | null => {
  const parsed = parseToDate(input);
  if (!parsed || isNaN(parsed.getTime())) {
    return null;
  }

  if (typeof input === 'string' && hasExplicitTimezone(input)) {
    return parsed;
  }

  return shiftDateToTimeZone(parsed, KARACHI_TIMEZONE);
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Phone validation - aliases for compatibility
export const phoneValidation = validatePakistaniPhoneNumber;
export const validatePhone = validatePakistaniPhoneNumber;
export const formatPhoneNumber = formatPakistaniPhoneNumber;
export const formatPhone = formatPakistaniPhoneNumber;
export const cleanPhone = (phone: string): string => {
  return phone.replace(/[\s\-\(\)]/g, '');
};

// Working hours check - aliases for compatibility
export const isWorkingTime = isWithinWorkingHours;
export const isWorkingHour = isWithinWorkingHours;

// Calculate time remaining for timers - from script2.js logic
export const calculateTimeRemaining = (endTime: Date, commentType?: string, isSpecialComment?: boolean): {
  timeRemaining: string;
  isExpired: boolean;
  status: 'active' | 'expired' | 'completed';
} => {
  // Check for completed/done status or special comments (determined by database clear_timeline flag)
  if (isSpecialComment || (commentType && commentType.toLowerCase().includes('done'))) {
    return {
      timeRemaining: '0:0:0',
      isExpired: false,
      status: 'completed'
    };
  }
  
  const now = new Date();
  
  if (now >= endTime) {
    return {
      timeRemaining: 'Expired',
      isExpired: true,
      status: 'expired'
    };
  }
  
  const remainingMilliseconds = endTime.getTime() - now.getTime();
  const hours = Math.floor(remainingMilliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMilliseconds % (1000 * 60)) / 1000);
  
  return {
    timeRemaining: `${hours}:${minutes}:${seconds}`,
    isExpired: false,
    status: 'active'
  };
};

// Date formatting with better error handling
export const formatDate = (date: string | Date): string => {
  try {
    if (!date) return 'N/A';

    const dateObj = toKarachiDate(date);

    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'Invalid Date';
    }

    return format(dateObj, 'dd-MMM-yyyy');
  } catch (error) {
    console.warn('Date formatting error:', error, 'for date:', date);
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  try {
    const dateObj = toKarachiDate(date);
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return format(dateObj, 'dd-MMM-yyyy hh:mm a');
  } catch {
    return 'Invalid Date';
  }
};

export const formatTime = (time: string): string => {
  try {
    if (!time) return 'N/A';
    const trimmed = time.trim();
    if (!trimmed) return 'N/A';

    const upper = trimmed.toUpperCase();
    const meridiemMatch = upper.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/);
    if (meridiemMatch) {
      const hours = parseInt(meridiemMatch[1], 10) % 12 || 12;
      const minutes = meridiemMatch[2];
      const period = meridiemMatch[4];
      return `${hours.toString().padStart(2, '0')}:${minutes} ${period}`;
    }

    const twentyFourMatch = upper.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/);
    if (twentyFourMatch) {
      let hours24 = parseInt(twentyFourMatch[1], 10);
      const minutes = twentyFourMatch[2] ?? '00';
      if (isNaN(hours24)) return time;
      hours24 = ((hours24 % 24) + 24) % 24;
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const displayHours = hours24 % 12 === 0 ? 12 : hours24 % 12;
      return `${displayHours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')} ${period}`;
    }

    const timeWithDate = parseToDate(`1970-01-01 ${upper}`);
    if (timeWithDate && !isNaN(timeWithDate.getTime())) {
      const pakistanTime = toKarachiDate(timeWithDate) ?? timeWithDate;
      return format(pakistanTime, 'hh:mm a');
    }

    return upper;
  } catch {
    return time;
  }
};

// Export utilities
export const exportToCSV = (data: any[], filename: string, columns: string[]) => {
  const headers = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

export const copyToClipboard = async (data: any[], columns: string[]) => {
  const headers = columns.join('\t');
  const rows = data.map(row => 
    columns.map(col => row[col] ?? '').join('\t')
  );
  
  const text = [headers, ...rows].join('\n');
  
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Status badge colors
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800',
    'Escalated': 'bg-red-100 text-red-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Customer is in contact with DDS': 'bg-blue-100 text-blue-800',
    'Customer not responding': 'bg-orange-100 text-orange-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

// Enhanced search/filter utilities with date support
export const globalSearch = (data: any[], searchTerm: string): any[] => {
  if (!searchTerm) return data;
  
  const lowerSearch = searchTerm.toLowerCase();
  return data.filter(item => 
    Object.entries(item).some(([key, value]) => {
      if (!value) return false;
      
      // Special handling for date fields
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        try {
          const formattedDate = formatDate(value as string);
          return formattedDate.toLowerCase().includes(lowerSearch);
        } catch {
          return value.toString().toLowerCase().includes(lowerSearch);
        }
      }
      
      return value.toString().toLowerCase().includes(lowerSearch);
    })
  );
};

export const columnFilter = (data: any[], column: string, filterValue: string): any[] => {
  if (!filterValue) return data;
  
  const lowerFilter = filterValue.toLowerCase();
  return data.filter(item => {
    const value = item[column];
    if (!value) return false;
    
    // Special handling for date fields
    if (column.toLowerCase().includes('date') || column.toLowerCase().includes('time')) {
      try {
        const formattedDate = formatDate(value as string);
        return formattedDate.toLowerCase().includes(lowerFilter);
      } catch {
        return value.toString().toLowerCase().includes(lowerFilter);
      }
    }
    
    return value.toString().toLowerCase().includes(lowerFilter);
  });
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Get agent name from URL
export const getAgentFromURL = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('user_no');
};

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

