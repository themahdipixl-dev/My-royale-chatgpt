// * components/TopTabs.js — changed in this revision (v46)
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const TOP_TABS = [
  { value: 'players', label: 'Top Players' },
  { value: 'clans', label: 'Top Clans' },
  { value: 'merge', label: 'Top Mergers' },
];

const CONTROL_HEIGHT = 36;

export default function TopTabs({ value, onChange, clanRankingMode, onClanRankingModeChange }) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [segmentedWidth, setSegmentedWidth] = useState(0);
  const handleTabPress = (tabValue) => { onChange(tabValue); };
  const tabWidth = segmentedWidth > 0 ? Math.max(0, (segmentedWidth - 2 - 4) / 3) : Math.max(0, (windowWidth - 28 - 2 - 4) / 3);

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.background }]}>
      <View
        onLayout={(event) => setSegmentedWidth(event.nativeEvent.layout.width)}
        style={[styles.segmentedContainer, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}
      >
        {TOP_TABS.map((tab) => {
          const selected = value === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => handleTabPress(tab.value)}
              style={({ pressed }) => [
                styles.control,
                { width: tabWidth, backgroundColor: selected ? theme.colors.secondaryContainer : 'transparent' },
                pressed && { opacity: 0.82 },
              ]}
              android_ripple={{ color: theme.colors.onSurfaceVariant, borderless: false }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={styles.tabInner}>
                <Text numberOfLines={1} style={[styles.tabText, { color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant }]}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 13, paddingBottom: 0, height: 49, backgroundColor: 'transparent', zIndex: 6 },
  segmentedContainer: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', padding: 2, borderWidth: 1, borderRadius: 21 },
  control: { flexGrow: 0, flexShrink: 0, height: CONTROL_HEIGHT, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tabInner: { height: CONTROL_HEIGHT, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
  tabText: { fontSize: 12.5, fontWeight: '600', includeFontPadding: false, lineHeight: 15, transform: [{ translateY: -1 }] },
});