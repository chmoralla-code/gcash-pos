// GCash POS - Theme & Constants
export const COLORS = {
  primary: '#0078D4',      // GCash Blue
  primaryDark: '#005A9E',
  primaryLight: '#E6F4FE',
  secondary: '#00A650',    // GCash Green
  secondaryLight: '#E8F5E9',
  accent: '#FF6B35',       // Cash-out Orange
  accentLight: '#FFF3E0',
  danger: '#DC3545',
  warning: '#FFC107',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  cashin: '#00A650',
  cashout: '#FF6B35',
};

export const FONTS = {
  regular: 16,
  medium: 18,
  large: 22,
  xlarge: 28,
  title: 32,
};

export const TRANSACTION_TYPES = {
  CASHIN: 'cashin',
  CASHOUT: 'cashout',
};

export const PERIODS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  DAYS_15: '15days',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

export const formatCurrency = (amount) => {
  return `₱${Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (dateStr) => {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
};
