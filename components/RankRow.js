// * components/RankRow.js — player row press handling infrastructure (v65)
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';

const RANK_COLORS = { 1: '#F5B942', 2: '#B8C2D1', 3: '#CD8B4F' };
const leagueIcon = require('../assets/league-icon.png');
export const ROW_HEIGHT = 64;

function getTrophies(item) {
  const value = item.trophies ?? item.score ?? item.rating ?? item.eloRating ?? item.leagueNumber ?? item.points;
  return value !== undefined && value !== null ? value : '—';
}

export default function RankRow({ item, index, animationKey = 0, onPress }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);
    scale.setValue(0.97);
    const delay = Math.min(index, 10) * 28;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay, friction: 9, tension: 55, useNativeDriver: true }),
    ]).start();
  }, [animationKey, index, opacity, translateY, scale]);

  const rank = item.rank ?? index + 1;
  const badgeColor = RANK_COLORS[rank];
  const clanName = item.clan?.name;

  return (
    <Animated.View style={{ height: ROW_HEIGHT, opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable onPress={() => onPress?.(item)} android_ripple={{ color: theme.colors.onSurfaceVariant }}><Surface style={[styles.row, { backgroundColor: theme.colors.surfaceContainer }]} elevation={0}>
        <View style={[styles.rankBadge, badgeColor && { backgroundColor: badgeColor }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.rankText, { color: badgeColor ? '#1A1300' : theme.colors.onSurfaceVariant }]}>{rank}</Text>
        </View>
        <Image source={leagueIcon} style={styles.avatar} resizeMode="contain" />
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.clan, { color: theme.colors.primary }, !clanName && { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{clanName || 'no clan'}</Text>
        </View>
        <View style={styles.trophyBox}>
          <Image source={require('../assets/Point-icon.png')} style={styles.pointIcon} resizeMode="contain" />
          <Text style={[styles.trophyText, { color: theme.colors.onSurface }]}>{getTrophies(item)}</Text>
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, marginHorizontal: 14, marginTop: 0, marginBottom: 6, paddingHorizontal: 9 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rankText: { fontSize: 11.5, fontWeight: '700', includeFontPadding: false, textAlign: 'center', lineHeight: 14 },
  avatar: { width: 32, height: 32, borderRadius: 7, marginRight: 9 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 13.5, fontWeight: '600' },
  clan: { fontSize: 10.5, marginTop: 1 },
  trophyBox: { width: 62, flexDirection: 'row', alignItems: 'center' },
  pointIcon: { width: 22, height: 22, marginRight: 6 },
  trophyText: { width: 34, fontSize: 12.5, fontWeight: '700', textAlign: 'left', transform: [{ translateY: -1.5 }] },
});