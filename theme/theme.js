// * theme/theme.js — changed in this revision
import React, { useMemo } from 'react';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

export function AppThemeProvider({ children }) {
  const { theme } = useMaterial3Theme();

  const paperTheme = useMemo(() => ({
    ...MD3DarkTheme,
    roundness: 4,
    colors: {
      ...MD3DarkTheme.colors,
      ...theme.dark,
    },
  }), [theme]);

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}
