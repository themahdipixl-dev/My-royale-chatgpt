// * components/EntityPreviewModal.js — player/clan preview information UI (v67)
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Image } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const leagueIcon = require('../assets/league-icon.png');
const pointIcon = require('../assets/Point-icon.png');

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

function StatCard({ icon, image, label, value, theme }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      {image ? (
        <Image source={image} style={styles.statImage} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
      )}
      <View style={styles.statText}>
        <Text style={[styles.statValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

export default function EntityPreviewModal({ visible, entity, type = 'player', countryName, onClose, onExpand }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  if (!entity) return null;

  const isClan = type === 'clan';

  const title = isClan
    ? firstValue(entity.name, entity.clan?.name, 'Unknown clan')
    : firstValue(entity.name, 'Unknown player');

  const tag = firstValue(entity.tag, entity.playerTag, entity.clan?.tag);
  const rank = firstValue(entity.rank);
  const country = firstValue(
    typeof entity.country === 'string' ? entity.country : entity.country?.name,
    entity.countryName,
    typeof entity.location === 'string' ? entity.location : entity.location?.name,
    entity.locationName,
    entity.countryCode,
    countryName,
  );

  const score = isClan
    ? firstValue(entity.clanScore, entity.clanWarTrophies, entity.score, entity.trophies, entity.rating, entity.points)
    : firstValue(entity.trophies, entity.score, entity.rating, entity.eloRating, entity.leagueNumber, entity.points);

  const members = firstValue(entity.members, entity.memberCount, entity.membersCount);
  const league = firstValue(
    typeof entity.league === 'string' ? entity.league : entity.league?.name,
    entity.leagueName,
    typeof entity.arena === 'string' ? entity.arena : entity.arena?.name,
  );

  const clanName = firstValue(entity.clan?.name);
  const clanTag = firstValue(entity.clan?.tag);
  const rankLabel = rank !== null ? `#${formatNumber(rank)}` : '—';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[
          styles.animated,
          {
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}>
          <Surface elevation={5} style={[styles.card, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={styles.header}>
              <View style={[styles.entityIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                {isClan ? (
                  <MaterialCommunityIcons name="account-group" size={23} color={theme.colors.onPrimaryContainer} />
                ) : (
                  <Image source={leagueIcon} style={styles.playerIcon} resizeMode="contain" />
                )}
              </View>

              <View style={styles.titleBlock}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
                <Text numberOfLines={1} style={[styles.tag, { color: theme.colors.primary }]}>
                  {tag || (isClan ? 'Clan' : 'Player')}
                </Text>
              </View>

              <IconButton
                icon="arrow-expand"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onExpand}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
              <IconButton
                icon="close"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onClose}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
            </View>

            {!isClan && country && (
              <View style={[styles.infoLine, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <MaterialCommunityIcons name="earth" size={18} color={theme.colors.primary} />
                <Text style={[styles.infoText, { color: theme.colors.onSurface }]} numberOfLines={1}>{country}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <StatCard image={pointIcon} label={isClan ? 'Clan Score' : 'Trophies'} value={formatNumber(score)} theme={theme} />
              <StatCard icon="podium" label="Rank" value={rankLabel} theme={theme} />
            </View>

            {isClan ? (
              <>
                {members !== null && (
                  <View style={[styles.infoLine, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <MaterialCommunityIcons name="account-multiple" size={18} color={theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>{formatNumber(members)} members</Text>
                  </View>
                )}
                {league && (
                  <View style={[styles.infoLine, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <MaterialCommunityIcons name="shield-star" size={18} color={theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.onSurface }]} numberOfLines={1}>{league}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {league && (
                  <View style={[styles.infoLine, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <Image source={leagueIcon} style={styles.smallLeagueIcon} resizeMode="contain" />
                    <Text style={[styles.infoText, { color: theme.colors.onSurface }]} numberOfLines={1}>{league}</Text>
                  </View>
                )}
                {clanName && (
                  <View style={[styles.infoLine, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <MaterialCommunityIcons name="account-group" size={18} color={theme.colors.primary} />
                    <View style={styles.clanText}>
                      <Text style={[styles.infoText, { color: theme.colors.onSurface }]} numberOfLines={1}>{clanName}</Text>
                      {clanTag && <Text style={[styles.clanTag, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{clanTag}</Text>}
                    </View>
                  </View>
                )}
              </>
            )}

            <Text style={[styles.expandHint, { color: theme.colors.onSurfaceVariant }]}>
              Tap expand for full profile
            </Text>
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)' },
  animated: { width: '88%', maxWidth: 390 },
  card: { borderRadius: 24, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center' },
  entityIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerIcon: { width: 32, height: 32 },
  titleBlock: { flex: 1, marginLeft: 10, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700' },
  tag: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  actionButton: { width: 38, height: 38, borderRadius: 19, margin: 0, marginLeft: 6 },
  infoLine: { minHeight: 42, borderRadius: 16, marginTop: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 9, fontSize: 12.5, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statCard: { flex: 1, minHeight: 62, borderRadius: 17, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  statImage: { width: 25, height: 25, marginRight: 8 },
  statText: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 9.5, marginTop: 2 },
  smallLeagueIcon: { width: 25, height: 25 },
  clanText: { flex: 1, minWidth: 0 },
  clanTag: { fontSize: 9.5, marginLeft: 9, marginTop: 1 },
  expandHint: { fontSize: 9.5, textAlign: 'center', marginTop: 10 },
});
