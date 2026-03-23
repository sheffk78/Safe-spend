/**
 * Rules Engine Helper Utilities
 * 
 * Provides vendor matching, time window checks, and date boundary calculations.
 */

/**
 * Match a vendor against a pattern based on match mode
 * @param {string} vendor - The vendor name from the request
 * @param {string} pattern - The pattern to match against
 * @param {string} mode - 'exact' | 'contains' | 'regex'
 * @returns {boolean}
 */
function matchVendor(vendor, pattern, mode = 'exact') {
    if (!vendor || !pattern) return false;
    
    const vendorLower = vendor.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    switch (mode) {
        case 'exact':
            return vendorLower === patternLower;
            
        case 'contains':
            return vendorLower.includes(patternLower);
            
        case 'regex':
            try {
                const regex = new RegExp(pattern, 'i');
                return regex.test(vendor);
            } catch (e) {
                // Invalid regex, fall back to exact match
                console.warn(`Invalid regex pattern: ${pattern}`, e);
                return vendorLower === patternLower;
            }
            
        default:
            return vendorLower === patternLower;
    }
}

/**
 * Check if current time is within the allowed time window
 * @param {Date} currentTime - Current UTC time
 * @param {Object} config - Time window configuration
 * @param {Array<string>} config.activeDays - Allowed days ['mon', 'tue', ...]
 * @param {string} config.activeHoursStart - Start time 'HH:MM' (24h format)
 * @param {string} config.activeHoursEnd - End time 'HH:MM' (24h format)
 * @param {string} config.timezone - IANA timezone (e.g., 'America/Denver')
 * @returns {Object} { isWithin: boolean, reason: string, localTime: string, localDay: string }
 */
function isWithinTimeWindow(currentTime, config) {
    const { activeDays, activeHoursStart, activeHoursEnd, timezone } = config;
    
    // Get local time in the specified timezone
    const localDate = getLocalDate(currentTime, timezone);
    const localDay = getDayName(localDate.getDay());
    const localTime = formatTime(localDate);
    
    // Check day of week
    if (activeDays && activeDays.length > 0) {
        const normalizedDays = activeDays.map(d => d.toLowerCase().substring(0, 3));
        if (!normalizedDays.includes(localDay.toLowerCase())) {
            return {
                isWithin: false,
                reason: `Spending not allowed on ${getDayFullName(localDay)} (allowed: ${activeDays.join(', ')})`,
                localTime,
                localDay
            };
        }
    }
    
    // Check time of day
    if (activeHoursStart && activeHoursEnd) {
        const currentMinutes = localDate.getHours() * 60 + localDate.getMinutes();
        const startMinutes = parseTimeToMinutes(activeHoursStart);
        const endMinutes = parseTimeToMinutes(activeHoursEnd);
        
        // Handle overnight windows (e.g., 22:00 - 06:00)
        let isWithinHours;
        if (startMinutes <= endMinutes) {
            // Normal window (e.g., 09:00 - 17:00)
            isWithinHours = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
            // Overnight window (e.g., 22:00 - 06:00)
            isWithinHours = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
        
        if (!isWithinHours) {
            return {
                isWithin: false,
                reason: `Current time ${localTime} is outside allowed hours (${activeHoursStart} - ${activeHoursEnd})`,
                localTime,
                localDay
            };
        }
    }
    
    return {
        isWithin: true,
        reason: 'Within allowed time window',
        localTime,
        localDay
    };
}

/**
 * Get date boundaries for daily/weekly/monthly tracking
 * @param {Date} currentTime - Current UTC time
 * @param {string} timezone - IANA timezone
 * @returns {Object} { today, weekStart, monthStart }
 */
function getDateBoundaries(currentTime, timezone = 'UTC') {
    const localDate = getLocalDate(currentTime, timezone);
    
    // Today (start of day in local timezone)
    const today = new Date(localDate);
    today.setHours(0, 0, 0, 0);
    
    // Week start (Monday)
    const weekStart = new Date(localDate);
    weekStart.setHours(0, 0, 0, 0);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    
    // Month start
    const monthStart = new Date(localDate);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setDate(1);
    
    return {
        today,
        weekStart,
        monthStart
    };
}

/**
 * Get local date from UTC time and timezone
 * Uses simple offset calculation (for production, use a proper timezone library)
 */
function getLocalDate(utcDate, timezone) {
    try {
        // Use Intl to get the local time string, then parse it
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        const parts = formatter.formatToParts(utcDate);
        
        const dateParts = {};
        for (const part of parts) {
            dateParts[part.type] = part.value;
        }
        
        // Construct a date object with these parts
        // Note: This creates a local Date object representing the local time
        return new Date(
            parseInt(dateParts.year),
            parseInt(dateParts.month) - 1,
            parseInt(dateParts.day),
            parseInt(dateParts.hour),
            parseInt(dateParts.minute),
            parseInt(dateParts.second)
        );
    } catch (e) {
        console.warn(`Failed to convert to timezone ${timezone}:`, e);
        return new Date(utcDate);
    }
}

/**
 * Get day name (3-letter abbreviation)
 */
function getDayName(dayIndex) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[dayIndex];
}

/**
 * Get full day name
 */
function getDayFullName(dayAbbrev) {
    const dayMap = {
        'sun': 'Sunday',
        'mon': 'Monday',
        'tue': 'Tuesday',
        'wed': 'Wednesday',
        'thu': 'Thursday',
        'fri': 'Friday',
        'sat': 'Saturday'
    };
    return dayMap[dayAbbrev.toLowerCase()] || dayAbbrev;
}

/**
 * Format time as HH:MM
 */
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

/**
 * Format cents as dollars
 */
function formatCents(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}

module.exports = {
    matchVendor,
    isWithinTimeWindow,
    getDateBoundaries,
    formatCents,
    getLocalDate,
    getDayName
};
