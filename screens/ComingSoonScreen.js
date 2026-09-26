// * screens/ComingSoonScreen.js — added in this revision (v49)
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ICONS = { clans: 'account-group-outline', cards: 'cards-outline', profile: 'account-circle-outline' };
const TITLES = { clans: 'Clans', cards: 'Cards', profile: 'Profile' };

export default function ComingSoonScreen({ type }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface elevation={0} style={[styles.card, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.icon, { backgroundColor: theme.colors.secondaryContainer }]}>
          <MaterialCommunityIcons name={ICONS[type]} size={30} color={theme.colors.onSecondaryContainer} />
        </View>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{TITLES[type]}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Coming soon</Text>
      </Surface>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, minHeight: 190, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13 },
});