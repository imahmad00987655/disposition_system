// Extended utilities with exact logic from script.js and script2.js

// Phone number validation for Pakistani numbers - EXACT from script.js
export interface PhoneValidation {
  valid: boolean;
  type: 'mobile' | 'landline' | null;
  cleaned: string;
}

export function validatePakistaniPhoneNumber(phoneNumber: string): PhoneValidation {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Mobile number validation (03XX format, exactly 11 digits)
  const mobileRegex = /^03\d{9}$/;
  
  // PTCL Landline formats:
  // Karachi: 021-XXXXXXX (7-8 digits after code)
  // Lahore: 042-XXXXXXX (7-8 digits after code)
  // Islamabad: 051-XXXXXXX (7-8 digits after code)
  // Other cities: 0XX-XXXXXXX
  const landlineRegex = /^0\d{2,3}\d{6,8}$/;
  
  if (mobileRegex.test(cleaned)) {
    return { valid: true, type: 'mobile', cleaned: cleaned };
  } else if (landlineRegex.test(cleaned)) {
    return { valid: true, type: 'landline', cleaned: cleaned };
  } else {
    return { valid: false, type: null, cleaned: cleaned };
  }
}

// Format phone number for display - EXACT from script.js
export function formatPakistaniPhoneNumber(phoneNumber: string): string {
  const validation = validatePakistaniPhoneNumber(phoneNumber);
  
  if (!validation.valid) {
    return phoneNumber;
  }
  
  const cleaned = validation.cleaned;
  
  if (validation.type === 'mobile') {
    // Format as: 0XXX-XXXXXXX
    return cleaned.slice(0, 4) + '-' + cleaned.slice(4);
  } else if (validation.type === 'landline') {
    // Format based on city code length
    if (cleaned.length === 10) {
      // Format as: 0XX-XXXXXXX
      return cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    } else if (cleaned.length === 11) {
      // Format as: 0XXX-XXXXXXX
      return cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    }
  }
  
  return phoneNumber;
}

// Calculate auto timeline - EXACT from script2.js
export function calculateAutoTimeline(startTimestamp?: string | Date): { date: string; time: string } {
  const officeStartHour = 9;
  const officeStartMinute = 0;
  const officeEndHour = 17;
  const officeEndMinute = 30;
  const workingHoursPerDay = 8;
  const KARACHI_TIMEZONE = 'Asia/Karachi';

  let startDateTime = startTimestamp ? new Date(startTimestamp) : new Date();

  if (isNaN(startDateTime.getTime())) {
    console.error("Invalid startTimestamp:", startTimestamp);
    throw new Error("Invalid startTimestamp provided.");
  }

  let remainingHours = workingHoursPerDay;

  while (remainingHours > 0) {
    const officeStartTime = new Date(startDateTime);
    officeStartTime.setHours(officeStartHour, officeStartMinute, 0, 0);

    const officeEndTime = new Date(startDateTime);
    officeEndTime.setHours(officeEndHour, officeEndMinute, 0, 0);

    if (startDateTime < officeStartTime) {
      startDateTime = new Date(officeStartTime);
    }

    if (startDateTime > officeEndTime) {
      startDateTime.setDate(startDateTime.getDate() + 1);
      startDateTime.setHours(officeStartHour, officeStartMinute, 0, 0);
      startDateTime = adjustForWeekends(startDateTime);
      continue;
    }

    const remainingToday = (officeEndTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    if (remainingToday >= remainingHours) {
      startDateTime.setTime(startDateTime.getTime() + remainingHours * 60 * 60 * 1000);
      remainingHours = 0;
    } else {
      remainingHours -= remainingToday;
      startDateTime.setDate(startDateTime.getDate() + 1);
      startDateTime.setHours(officeStartHour, officeStartMinute, 0, 0);
      startDateTime = adjustForWeekends(startDateTime);
    }
  }

  if (isNaN(startDateTime.getTime())) {
    console.error("Invalid final timeline date/time:", startDateTime);
    throw new Error("Invalid timeline date/time calculated.");
  }

  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KARACHI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: KARACHI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const timelineDate = dateFormatter.format(startDateTime);
  const timelineTime = timeFormatter.format(startDateTime);

  return { date: timelineDate, time: timelineTime };
}

// Adjust for weekends - EXACT from script2.js
export function adjustForWeekends(date: Date): Date {
  const day = date.getDay();
  if (day === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
  if (day === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
  return date;
}

// Check if within working hours - EXACT from script2.js
export function isWithinWorkingHours(date: Date): boolean {
  const startOfDay = new Date(date);
  startOfDay.setHours(9, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(17, 30, 0, 0);
  
  return date >= startOfDay && date <= endOfDay;
}

// Calculate remaining working hours - EXACT from script2.js
export function calculateRemainingWorkingHours(currentDate: Date, endDate: Date): { totalMilliseconds: number } {
  let totalMilliseconds = 0;
  let current = new Date(currentDate);

  while (current < endDate) {
    if (isWithinWorkingHours(current)) {
      const currentDayEnd = getNextWorkingHours(current);
      const millisecondsInDay = Math.min(currentDayEnd.getTime() - current.getTime(), endDate.getTime() - current.getTime());
      totalMilliseconds += millisecondsInDay;
    }
    current = getNextWorkingDay(current);
  }

  return { totalMilliseconds };
}

// Get next working hours - EXACT from script2.js
function getNextWorkingHours(date: Date): Date {
  const endOfDay = new Date(date);
  endOfDay.setHours(17, 30, 0, 0);
  return endOfDay;
}

// Get next working day - EXACT from script2.js
function getNextWorkingDay(date: Date): Date {
  let nextDate = new Date(date);
  let day = nextDate.getDay();

  if (day === 5) nextDate.setDate(nextDate.getDate() + 3); // Friday -> Monday
  else if (day === 6) nextDate.setDate(nextDate.getDate() + 2); // Saturday -> Monday
  else nextDate.setDate(nextDate.getDate() + 1);

  nextDate.setHours(9, 0, 0, 0);
  return nextDate;
}

// Calculate end time - EXACT from script2.js
export function calculateEndTime(timelineDate?: string, timelineTime?: string): Date {
  if (!timelineDate || !timelineTime) {
    const now = new Date();
    const workingEnd = getNextWorkingHours(now);
    const remainingWorkingHoursToday = Math.max(
      (workingEnd.getTime() - now.getTime()) / (1000 * 60 * 60),
      0
    );

    if (remainingWorkingHoursToday >= 8) {
      return new Date(now.getTime() + 8 * 60 * 60 * 1000);
    } else {
      return calculateMultiDayEndTime(now, 8);
    }
  }

  return new Date(`${timelineDate}T${timelineTime}`);
}

// Calculate multi-day end time - EXACT from script2.js
function calculateMultiDayEndTime(currentDate: Date, remainingHours: number): Date {
  let nextWorkingDay = getNextWorkingDay(currentDate);
  let hoursLeft = remainingHours;

  while (hoursLeft > 0) {
    const startOfDay = new Date(nextWorkingDay);
    startOfDay.setHours(9, 0, 0, 0);
    const endOfDay = new Date(nextWorkingDay);
    endOfDay.setHours(17, 30, 0, 0);

    const availableHours = Math.min((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60), hoursLeft);

    if (availableHours >= hoursLeft) {
      startOfDay.setTime(startOfDay.getTime() + hoursLeft * 60 * 60 * 1000);
      return startOfDay;
    }

    hoursLeft -= availableHours;
    nextWorkingDay = getNextWorkingDay(nextWorkingDay);
  }

  return nextWorkingDay;
}
