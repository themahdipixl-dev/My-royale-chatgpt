// * components/EntityPreviewModal.js — compact 9-tile player preview (v83)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchPlayer } from '../api/client';

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

function InfoTile({ icon, image, label, value, theme, imageUri, onPress }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.infoTile, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.cardIcon} resizeMode="contain" />
      ) : image ? (
        <Image source={image} style={styles.tileImage} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name={icon} size={27} color={theme.colors.primary} />
      )}
      <Text style={[styles.tileLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
      {value !== null && value !== undefined && <Text style={[styles.tileValue, { color: theme.colors.onSurface }]} numberOfLines={1} ellipsizeMode="tail">{value}</Text>}
    </Pressable>
  );
}

export default function EntityPreviewModal({ visible, entity, type = 'player', countryName, onClose, onExpand, onClanPress }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const backdropProgress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);

  const isClan = type === 'clan';

  useEffect(() => {
    if (!visible || !entity || isClan) return;

    const tag = firstValue(entity.tag, entity.playerTag);
    if (!tag) return;

    let cancelled = false;
    setPlayerLoading(true);
    setPlayerData(null);
    Promise.all([fetchPlayer(tag)]).then(([player]) => {
      if (cancelled) return;
      setPlayerData(player);

    }).catch(() => {
      if (!cancelled) {
        setPlayerData(null);
      }
    }).finally(() => {
      if (!cancelled) setPlayerLoading(false);
    });

    return () => { cancelled = true; };
  }, [visible, entity, isClan]);

  useEffect(() => {
    if (visible && entity) {
      closing.current = false;
      setModalVisible(true);
      progress.setValue(0);
      backdropProgress.setValue(0);
      Animated.parallel([
        Animated.spring(progress, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }),
        Animated.timing(backdropProgress, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (!visible && modalVisible && !closing.current) {
      closing.current = true;
      Animated.parallel([
        Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(backdropProgress, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setModalVisible(false);
          closing.current = false;
        }
      });
    }
  }, [visible, entity, modalVisible, progress, backdropProgress]);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropProgress, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        closing.current = false;
        onClose?.();
      }
    });
  };

  if (!entity) return null;

  const title = isClan
    ? firstValue(entity.name, entity.clan?.name, 'Unknown clan')
    : firstValue(playerData?.name, entity.name, 'Unknown player');

  const tag = firstValue(playerData?.tag, entity.tag, entity.playerTag, entity.clan?.tag);

  const country = firstValue(
    typeof entity.country === 'string' ? entity.country : entity.country?.name,
    entity.countryName,
    typeof entity.location === 'string' ? entity.location : entity.location?.name,
    entity.locationName,
    entity.countryCode,
    countryName,
  );

  const rank = firstValue(entity.rank);
  const clanName = firstValue(playerData?.clan?.name, entity.clan?.name);
  const clanTag = firstValue(playerData?.clan?.tag, entity.clan?.tag);
  const members = firstValue(entity.members, entity.memberCount, entity.membersCount);

  const score = isClan
    ? firstValue(entity.clanScore, entity.clanWarTrophies, entity.score, entity.trophies, entity.rating, entity.points)
    : firstValue(entity.trophies, entity.score, entity.rating, entity.eloRating, entity.points);

  const league = firstValue(
    typeof entity.league === 'string' ? entity.league : entity.league?.name,
    entity.leagueName,
    typeof entity.arena === 'string' ? entity.arena : entity.arena?.name,
  );

  const playerCurrentPol = playerData?.currentPathOfLegendSeasonResult;
  const playerBestPol = playerData?.bestPathOfLegendSeasonResult;
  const currentRank = firstValue(entity.rank, playerCurrentPol?.rank);
  const bestRank = firstValue(playerBestPol?.rank);
  const rankedUnlocked = !!playerCurrentPol;
  const progressTrophies = rankedUnlocked ? playerCurrentPol?.trophies : playerData?.trophies;
  const progressLabel = 'Ranked trophies';
  const wins = Number(playerData?.wins);
  const losses = Number(playerData?.losses);
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? `${((wins / totalGames) * 100).toFixed(1)}%` : '—';

  const favouriteCard = playerData?.currentFavouriteCard;
  const favouriteIcon = favouriteCard?.iconUrls?.medium || favouriteCard?.iconUrls?.large || null;

  const rankLabel = currentRank !== null ? `#${formatNumber(currentRank)}` : '—';
  const bestRankLabel = bestRank !== null ? `#${formatNumber(bestRank)}` : '—';

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="box-none" style={[styles.backdrop, { opacity: backdropProgress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.animated,
            {
              opacity: progress,
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={styles.header}>
              <View style={[styles.entityIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Image source={leagueIcon} style={styles.playerIcon} resizeMode="contain" />
              </View>

              <View style={styles.titleBlock}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
                <Pressable onPress={() => tag && Clipboard.setStringAsync(tag)} disabled={!tag}>
                  <Text numberOfLines={1} style={[styles.tag, { color: theme.colors.primary }]}>{tag || 'Player'}</Text>
                </Pressable>
              </View>

              <IconButton
                icon="arrow-expand"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onExpand}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
              <IconButton
                icon="close"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={requestClose}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
            </View>

            {isClan ? (
              <View style={styles.clanBody}>
                <View style={styles.primaryStats}>
                  <View style={styles.primaryStat}>
                    <Image source={pointIcon} style={styles.primaryStatIcon} resizeMode="contain" />
                    <View style={styles.statText}>
                      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Clan score</Text>
                      <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{formatNumber(score)}</Text>
                    </View>
                  </View>
                  <View style={styles.primaryStat}>
                    <MaterialCommunityIcons name="account-multiple" size={21} color={theme.colors.primary} />
                    <View style={styles.statText}>
                      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Members</Text>
                      <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{members !== null ? formatNumber(members) : '—'}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.secondaryRow}>
                  <InfoTile image={leagueIcon} label="War league" value={league || '—'} theme={theme} />
                  <InfoTile icon="earth" label="Country" value={country || '—'} theme={theme} />
                </View>
                <View style={styles.detailLine}>
                  <MaterialCommunityIcons name="account-group" size={18} color={theme.colors.primary} />
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{clanName || '—'}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.tilesGrid}>
                  <InfoTile icon="trophy-outline" label={progressLabel} value={playerLoading ? '…' : formatNumber(progressTrophies)} theme={theme} />
                  <InfoTile icon="podium" label="Current rank" value={playerLoading ? '…' : rankLabel} theme={theme} />
                  <InfoTile icon="trophy-award" label="Best rank" value={playerLoading ? '…' : bestRankLabel} theme={theme} />
                  <InfoTile icon="gamepad-variant" label="Games played" value={playerLoading ? '…' : totalGames > 0 ? formatNumber(totalGames) : '—'} theme={theme} />
                  <InfoTile icon="trophy" label="Total wins" value={playerLoading ? '…' : Number.isFinite(wins) ? formatNumber(wins) : '—'} theme={theme} />
                  <InfoTile icon="percent" label="Win rate" value={playerLoading ? '…' : winRate} theme={theme} />
                  <InfoTile imageUri={favouriteIcon} icon="cards-outline" label="Favorite card" value={null} theme={theme} />
                  <InfoTile icon="account-group" label="Clan" value={clanName || 'No clan'} theme={theme} onPress={clanName && clanTag ? () => onClanPress?.({ name: clanName, tag: clanTag }, 'clan') : undefined} />
                  <InfoTile icon="trophy-outline" label="Best trophies" value={playerLoading ? '…' : formatNumber(playerData?.bestTrophies)} theme={theme} />
                </View>
              </>
            )}

            {playerLoading && !isClan && (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.46)' },
  animated: { width: '84%', maxWidth: 350, height: 385 },
  card: { flex: 1, borderRadius: 24, padding: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', height: 48, marginHorizontal: 5 },
  entityIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  playerIcon: { width: 27, height: 27 },
  titleBlock: { flex: 1, marginLeft: 8, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700' },
  tag: { fontSize: 9.5, marginTop: 1, fontWeight: '600' },
  actionButton: { width: 34, height: 34, borderRadius: 17, margin: 0, marginLeft: 5 },
  tilesGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 6 },
  infoTile: { width: '29%', aspectRatio: 1, minWidth: 0, borderRadius: 14, padding: 6, alignItems: 'center', justifyContent: 'center' },
  tileImage: { width: 40, height: 40, marginBottom: 2 },
  cardIcon: { width: 52, height: 52, marginBottom: 2 },
  tileLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  tileValue: { fontSize: 11.5, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  loader: { position: 'absolute', bottom: 5, alignSelf: 'center' },
  clanBody: { flex: 1, justifyContent: 'center' },
  primaryStats: { flexDirection: 'row', gap: 7, marginTop: 9 },
  primaryStat: { flex: 1, minHeight: 64, borderRadius: 15, paddingHorizontal: 9, backgroundColor: 'rgba(127,127,127,0.10)', flexDirection: 'row', alignItems: 'center' },
  primaryStatIcon: { width: 22, height: 22 },
  statText: { flex: 1, marginLeft: 7, minWidth: 0 },
  statLabel: { fontSize: 9, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  secondaryRow: { flexDirection: 'row', gap: 7, marginTop: 7, height: 58 },
  detailLine: { minHeight: 46, borderRadius: 15, paddingHorizontal: 10, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(127,127,127,0.10)' },
  detailValue: { flex: 1, fontSize: 11.5, fontWeight: '700' },
});