// * components/ClanRow.js — clan row press handling infrastructure (v65)
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Image, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Surface, useTheme } from 'react-native-paper';

export const CLAN_ROW_HEIGHT = 64;

function getClanScore(item) {
  return item.clanScore ?? item.clanWarTrophies ?? item.score ?? item.trophies ?? item.rating ?? item.points ?? '—';
}
function getMembers(item) {
  return item.members ?? item.memberCount ?? '—';
}

export default function ClanRow({ item, index, animationKey = 0, onPress }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    opacity.setValue(0); translateY.setValue(18); scale.setValue(0.97);
    const delay = Math.min(index, 10) * 28;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay, friction: 9, tension: 55, useNativeDriver: true }),
    ]).start();
  }, [animationKey, index, opacity, translateY, scale]);

  const rank = item.rank ?? index + 1;
  const clanName = item.name ?? item.clan?.name ?? 'Unknown clan';

  return (
    <Animated.View style={{ height: CLAN_ROW_HEIGHT, opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable onPress={() => onPress?.(item)} android_ripple={{ color: theme.colors.onSurfaceVariant }}><Surface style={[styles.row, { backgroundColor: theme.colors.surfaceContainer }]} elevation={0}>
        <View style={[styles.rankBadge, rank <= 3 && { backgroundColor: ['#F5B942', '#B8C2D1', '#CD8B4F'][rank - 1] }]}>
          <Text style={[styles.rankText, { color: rank <= 3 ? '#1A1300' : theme.colors.onSurfaceVariant }]}>{rank}</Text>
        </View>
        <View style={[styles.clanIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="account-group" size={19} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>{clanName}</Text>
          <Text style={[styles.members, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{getMembers(item)} members</Text>
        </View>
        <View style={styles.scoreBox}>
          <Image source={require('../assets/Point-icon.png')} style={styles.pointIcon} resizeMode="contain" />
          <Text style={[styles.score, { color: theme.colors.onSurface }]}>{getClanScore(item)}</Text>
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 9 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rankText: { fontSize: 11.5, fontWeight: '700' },
  clanIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 13.5, fontWeight: '600' },
  members: { fontSize: 10.5, marginTop: 1 },
  scoreBox: { width: 70, flexDirection: 'row', alignItems: 'center' },
  pointIcon: { width: 22, height: 22, marginRight: 4, transform: [{ translateX: -5 }] },
  score: { width: 44, fontSize: 12.5, fontWeight: '700', textAlign: 'left', transform: [{ translateY: -1.5 }] },
});