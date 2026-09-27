// * screens/HomeScreen.js — fluid animated home screen (v53)
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';

export default function HomeScreen() {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader />
      <Animated.View style={[styles.content, {
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }]}>
        <Surface elevation={0} style={[styles.card, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="home-variant" size={32} color={theme.colors.onPrimaryContainer} />
          </View>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>My Royale</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Your Clash Royale hub</Text>
        </Surface>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, minHeight: 210, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 23, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13 },
});