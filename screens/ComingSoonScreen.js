// * screens/ComingSoonScreen.js — Profile hub (v54)
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ITEMS = [
  { title: 'Profile', icon: 'account-circle-outline' },
  { title: 'Sign In / Log In', icon: 'login-variant' },
  { title: 'Settings', icon: 'cog-outline' },
  { title: 'Appearance', icon: 'theme-light-dark' },
  { title: 'Bottom Navigation', icon: 'view-dashboard-outline' },
  { title: 'Notifications', icon: 'bell-outline' },
  { title: 'Data & Sync', icon: 'sync' },
  { title: 'Clear Cache', icon: 'cached' },
  { title: 'Changelog', icon: 'history' },
  { title: 'Report a Problem', icon: 'bug-outline' },
  { title: 'About', icon: 'information-outline' },
];

export default function ComingSoonScreen({ type }) {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 8,
      tension: 55,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  if (type !== 'profile') {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={34}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.fallbackTitle, { color: theme.colors.onSurface }]}>
          Coming soon
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: entrance,
            transform: [{
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            }],
          }}
        >
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={30}
              color={theme.colors.onSurface}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Profile
            </Text>
          </View>

          <View
            style={[
              styles.list,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            {ITEMS.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={() => {}}
                android_ripple={{ color: theme.colors.onSurface, borderless: false }}
                style={({ pressed }) => [
                  styles.row,
                  index !== ITEMS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.outlineVariant,
                  },
                  pressed && { opacity: 0.72 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                hitSlop={4}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                  {item.title}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  list: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});
