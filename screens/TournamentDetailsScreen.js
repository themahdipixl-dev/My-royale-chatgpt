// * screens/TournamentDetailsScreen.js — tournament details page (v1)
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function value(...items) {
  return items.find((item) => item !== undefined && item !== null && item !== '') ?? '—';
}

function Stat({ icon, label, value: statValue, theme }) {
  return (
    <View style={[styles.stat, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      <MaterialCommunityIcons name={icon} size={21} color={theme.colors.primary} />
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.value, { color: theme.colors.onSurface }]}>{statValue}</Text>
    </View>
  );
}

export default function TournamentDetailsScreen({ entity, onBack }) {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);

  const name = value(entity?.name, entity?.title, 'Tournament');

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={onBack} style={styles.back} />
        <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Tournament Details</Text>
      </View>

      <Animated.View style={[styles.flex, {
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Surface elevation={0} style={[styles.hero, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="trophy-outline" size={32} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{name}</Text>
            <Text style={[styles.tag, { color: theme.colors.primary }]}>{value(entity?.tag, entity?.tournamentTag)}</Text>
            <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              Tournament details
            </Text>
          </Surface>

          <Surface elevation={0} style={[styles.section, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Tournament information</Text>
            <View style={styles.grid}>
              <Stat icon="account-group-outline" label="Members" value={value(entity?.members, entity?.memberCount)} theme={theme} />
              <Stat icon="sword-cross" label="Status" value={value(entity?.status, entity?.state)} theme={theme} />
              <Stat icon="calendar-outline" label="Start" value={value(entity?.startTime, entity?.startDate)} theme={theme} />
              <Stat icon="calendar-end" label="End" value={value(entity?.endTime, entity?.endDate)} theme={theme} />
            </View>
          </Surface>

          <Surface elevation={0} style={[styles.section, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Coming next</Text>
            <Text style={[styles.muted, { color: theme.colors.onSurfaceVariant }]}>
              Tournament rankings and participant details will appear here when the tournament data endpoint is connected.
            </Text>
          </Surface>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  back: { margin: 0 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  content: { padding: 14, paddingBottom: 40 },
  hero: { borderRadius: 24, padding: 18, alignItems: 'center', marginBottom: 12 },
  icon: { width: 68, height: 68, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 12, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  tag: { marginTop: 4, fontSize: 12.5, fontWeight: '700' },
  description: { marginTop: 7, fontSize: 12 },
  section: { borderRadius: 22, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  stat: { width: '48%', minHeight: 92, borderRadius: 17, padding: 11, justifyContent: 'space-between' },
  label: { fontSize: 10.5, marginTop: 7 },
  value: { fontSize: 13, fontWeight: '800' },
  muted: { fontSize: 12.5, lineHeight: 19 },
  bottomSpace: { height: 50 },
});
