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
    sm: 8,
    md: 14,
    lg: 20,
    xl: 24,
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
      shadowColor: '#1D59BB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3
    },
    floating: {
      shadowColor: '#0D2149',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6
    }
  }
};

export default Theme;
