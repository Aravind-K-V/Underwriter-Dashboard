import { prettyLog } from '../config/logger.js';

export function parseFlexibleDate(dateInput) {
  if (!dateInput) return null;
  
  try {
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
    }
    
    if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length === 10) {
      const parts = dateInput.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        const [day, month, year] = parts;
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
    }
    
    if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length > 10) {
      const date = new Date(dateInput);
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    
    if (dateInput instanceof Date) {
      return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
    }
    
    const date = new Date(dateInput);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  } catch (error) {
    console.error('[DateUtils][Parse] Date parsing error:', error);
    return null;
  }
}

export function compareFlexibleDates(date1, date2) {
  try {
    const d1 = parseFlexibleDate(date1);
    const d2 = parseFlexibleDate(date2);
    
    prettyLog('Date comparison debug', {
      input1: date1,
      input2: date2,
      parsed1: d1 ? d1.toISOString().split('T')[0] : null,
      parsed2: d2 ? d2.toISOString().split('T')[0] : null
    }, { level: 'debug' });
    
    if (!d1 || !d2) {
      return { match: false, confidence: 0.0 };
    }
    
    const sameDay = d1.getUTCDate() === d2.getUTCDate();
    const sameMonth = d1.getUTCMonth() === d2.getUTCMonth();
    const sameYear = d1.getUTCFullYear() === d2.getUTCFullYear();
    
    if (sameDay && sameMonth && sameYear) {
      return { match: true, confidence: 1.0 };
    }
    
    const timeDiff = Math.abs(d1.getTime() - d2.getTime());
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    prettyLog('Date difference analysis', {
      date1: date1,
      date2: date2,
      daysDifference: daysDiff,
      sameDay,
      sameMonth,
      sameYear
    }, { level: 'debug' });
    
    if (daysDiff === 1) {
      return { match: true, confidence: 0.95 };
    } else if (daysDiff === 2) {
      return { match: false, confidence: 0.8 };
    } else if (daysDiff <= 7) {
      return { match: false, confidence: 0.5 };
    } else {
      return { match: false, confidence: 0.0 };
    }
  } catch (error) {
    console.error('[DateUtils][Compare] Flexible date comparison error:', error);
    return { match: false, confidence: 0.0 };
  }
}