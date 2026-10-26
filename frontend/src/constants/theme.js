import Colors from './colors';

export const Theme = {
  colors: Colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 18,
    full: 9999
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System'
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 30
    }
  },
  shadows: {
    card: {
      shadowColor: '#233B32',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3
    }
  }
};

export default Theme;
