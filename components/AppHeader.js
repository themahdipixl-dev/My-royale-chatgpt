import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AppHeader() {
  const theme = useTheme();
  return (
    <Surface style={[styles.wrap, { backgroundColor: theme.colors.surface }]} elevation={0}>
      <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name="shield-crown" size={24} color={theme.colors.onPrimaryContainer} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>My Royale</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primary }]}>Player Rankings</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  iconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  texts: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
});
