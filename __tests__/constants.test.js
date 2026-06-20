import {
  COLORS, DARK_COLORS, getTheme, FONTS,
  TRANSACTION_TYPES, PERIODS,
  formatCurrency, formatDate, formatTime, formatDateTime,
} from '../src/constants';

describe('Constants', () => {
  test('COLORS has all required keys', () => {
    const required = ['primary', 'secondary', 'background', 'surface', 'text', 'cashin', 'cashout'];
    required.forEach(k => expect(COLORS).toHaveProperty(k));
  });

  test('DARK_COLORS has same keys as COLORS', () => {
    expect(Object.keys(DARK_COLORS)).toEqual(Object.keys(COLORS));
  });

  test('getTheme returns light or dark', () => {
    expect(getTheme(false)).toBe(COLORS);
    expect(getTheme(true)).toBe(DARK_COLORS);
  });

  test('FONTS has numerical values', () => {
    Object.values(FONTS).forEach(v => expect(typeof v).toBe('number'));
  });

  test('TRANSACTION_TYPES defined', () => {
    expect(TRANSACTION_TYPES.CASHIN).toBe('cashin');
    expect(TRANSACTION_TYPES.CASHOUT).toBe('cashout');
  });

  test('PERIODS defined', () => {
    expect(PERIODS.TODAY).toBe('today');
    expect(PERIODS.YESTERDAY).toBe('yesterday');
    expect(PERIODS.DAYS_15).toBe('15days');
    expect(PERIODS.MONTHLY).toBe('monthly');
    expect(PERIODS.YEARLY).toBe('yearly');
  });
});

describe('formatCurrency', () => {
  test('formats integer amount', () => {
    expect(formatCurrency(0)).toBe('₱0.00');
    expect(formatCurrency(100)).toBe('₱100.00');
    expect(formatCurrency(1000)).toBe('₱1,000.00');
  });

  test('formats decimal amount', () => {
    expect(formatCurrency(99.99)).toBe('₱99.99');
    expect(formatCurrency(1000.50)).toBe('₱1,000.50');
  });

  test('handles string input', () => {
    expect(formatCurrency('500')).toBe('₱500.00');
  });

  test('handles negative', () => {
    expect(formatCurrency(-50)).toBe('₱-50.00');
  });
});

describe('formatDate', () => {
  test('formats ISO date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  test('returns empty for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });
});

describe('formatTime', () => {
  test('returns time portion', () => {
    const result = formatTime('2024-01-15 14:30:00');
    expect(result).toContain(':');
  });

  test('returns empty for null', () => {
    expect(formatTime(null)).toBe('');
  });
});

describe('formatDateTime', () => {
  test('combines date and time', () => {
    const result = formatDateTime('2024-01-15 14:30:00');
    expect(result).toContain('2024');
    expect(result).toContain(':');
  });
});
