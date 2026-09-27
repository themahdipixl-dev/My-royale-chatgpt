// * components/AppHeader.js — added fluid entrance animation (v53)
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AppHeader() {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
    ]).start();
  }, [entrance]);

  const entranceStyle = {
    opacity: entrance,
    transform: [
      { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
      { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
    ],
  };

  return (
    <Animated.View style={entranceStyle}>
      <Surface style={[styles.wrap, { backgroundColor: theme.colors.surface }]} elevation={0}>
      <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name="shield-crown" size={24} color={theme.colors.onPrimaryContainer} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>My Royale</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primary }]}>Player Rankings</Text>
      </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  iconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  texts: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
});
