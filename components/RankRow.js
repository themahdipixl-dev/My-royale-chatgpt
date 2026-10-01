// * components/RankRow.js — player row press handling infrastructure (v65)
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getPlayerLeagueImage } from '../utils/playerLeagueassets';
import RetryImage from './RetryImage';

const RANK_COLORS = { 1: '#F5B942', 2: '#B8C2D1', 3: '#CD8B4F' };
export const ROW_HEIGHT = 70;

function getTrophies(item) {
  const value = item.trophies ?? item.score ?? item.rating ?? item.eloRating ?? item.leagueNumber ?? item.points;
  return value !== undefined && value !== null ? value : '—';
}

export default function RankRow({ item, index, animationKey = 0, onPress, trophyIcon = 'trophy', playerIconUri }) {
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
  const playerLeagueImage = playerIconUri || getPlayerLeagueImage(item);

  return (
    <Animated.View style={{ height: ROW_HEIGHT, opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable onPress={() => onPress?.(item)} android_ripple={{ color: theme.colors.onSurfaceVariant }}><Surface style={[styles.row, { backgroundColor: theme.colors.surfaceContainer, borderWidth: 1, borderColor: badgeColor || theme.colors.outlineVariant }]} elevation={0}>
        <View style={[styles.rankBadge, badgeColor && { backgroundColor: badgeColor }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.rankText, { color: badgeColor ? '#1A1300' : theme.colors.onSurfaceVariant }]}>{rank}</Text>
        </View>
        <View style={styles.avatar}>
          {playerLeagueImage ? (
            <RetryImage uri={playerLeagueImage} style={styles.avatarImage} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name="account-circle-outline" size={34} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.clan, { color: theme.colors.primary }, !clanName && { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{clanName || 'no clan'}</Text>
        </View>
        <View style={styles.trophyBox}>
          <MaterialCommunityIcons name={trophyIcon} size={22} color={theme.colors.primary} style={styles.pointIcon} />
          <Text style={[styles.trophyText, { color: theme.colors.onSurface }]}>{getTrophies(item)}</Text>
        </View>
      </Surface></Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 64, borderRadius: 19, marginHorizontal: 14, marginTop: 0, marginBottom: 6, paddingHorizontal: 9 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText: { fontSize: 13.5, fontWeight: '700', includeFontPadding: false, textAlign: 'center', lineHeight: 14 },
  avatar: { width: 35, height: 35, marginRight: 9, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 35, height: 35 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 14.5, fontWeight: '600' },
  clan: { fontSize: 11.3, marginTop: 1 },
  trophyBox: { width: 67, flexDirection: 'row', alignItems: 'center' },
  pointIcon: { marginRight: 6 },
  trophyText: { width: 34, fontSize: 12.5, fontWeight: '700', textAlign: 'left', transform: [{ translateY: -1.5 }] },
});