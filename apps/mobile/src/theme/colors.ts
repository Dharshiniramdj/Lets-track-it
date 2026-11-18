// Brand Theme Palette matching Let's Track It Web
export const colors = {
  // Midnight Backgrounds & Surfaces
  midnight: '#02070A',
  midnightDark: '#010406',
  midnightSurface: '#06131D',
  surface: '#06131D',
  midnightCard: '#091A27',
  card: '#091A27',
  midnightSubtle: '#0E2436',
  midnightBorder: '#15354F',
  border: '#15354F',
  midnightBorderLight: '#1E4768',

  // Electric Cyan (Primary / Income / Focus)
  electric: '#0297DE',
  electricHover: '#0284C7',
  electricGlow: 'rgba(2, 151, 222, 0.25)',
  electricSubtle: 'rgba(2, 151, 222, 0.12)',

  // Cantaloupe Coral (Secondary / Expense / Alerts)
  cantaloupe: '#FC734D',
  cantaloupeHover: '#F95C30',
  cantaloupeGlow: 'rgba(252, 115, 77, 0.25)',
  cantaloupeSubtle: 'rgba(252, 115, 77, 0.12)',

  // Functional Status
  income: '#0297DE',
  expense: '#FC734D',
  success: '#10B981',
  successGlow: 'rgba(16, 185, 129, 0.2)',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#A855F7',

  // Typography & Content
  cleanWhite: '#FCFFFF',
  textPrimary: '#FCFFFF',
  textSecondary: '#8FA7B8',
  textMuted: '#5A7387',
  softGrey: '#F1F5F9',

  // Overlays
  overlay: 'rgba(2, 7, 10, 0.85)',
  cardGlow: 'rgba(2, 151, 222, 0.08)'
};

export const formatCurrency = (amount: number, symbol = '₹'): string => {
  return `${symbol}${Math.abs(amount).toLocaleString('en-IN')}`;
};
