// components/EntityPreviewModal.js
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
  return Number.isFinite(number) ? String(number) : String(value);
}

function formatArenaNumber(arena) {
  const rawName = String(arena?.rawName ?? '');

  // Arena_14 → 14
  const normalMatch = rawName.match(/^Arena_(\d+)$/i);
  if (normalMatch) {
    return String(Number(normalMatch[1]));
  }

  // Arena_L1 → 15, Arena_L2 → 16, ... Arena_L18 → 32
  const leagueMatch = rawName.match(/^Arena_L(\d+)$/i);
  if (leagueMatch) {
    return String(Number(leagueMatch[1]) + 14);
  }

  return '—';
}


function findSeasonalTrophyRoad(player) {
  let best = null;
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/^seasonal-trophy-road-(\d+)$/i.test(key) && child && typeof child === 'object') {
        const numericBest = Number(child.bestTrophies);
        if (Number.isFinite(numericBest)) {
          const seasonId = Number(key.match(/(\d+)$/)?.[1] || 0);
          if (!best || seasonId > best.seasonId) best = { seasonId, data: child };
        }
      }
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(player);
  return best?.data ?? null;
}

function toRoman(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 3999) return null;
  const values = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let result = '';
  let remaining = number;
  for (const [unit, symbol] of values) {
    while (remaining >= unit) { result += symbol; remaining -= unit; }
  }
  return result;
}

function formatSeasonalArena(arena) {
  const name = String(arena?.name ?? '');
  const match = name.match(/^Seasonal Arena\s+(\d+)$/i);
  if (!match) return null;
  const roman = toRoman(Number(match[1]));
  return roman ? 'Seasonal Arena ' + roman : name;
}

function AnimatedTypingText({ children, style, numberOfLines, ellipsizeMode, delay = 0 }) {
  const fullText = String(children ?? '');
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    let timer;
    let index = 0;
    setVisibleText('');

    const start = () => {
      timer = setInterval(() => {
        index += 1;
        setVisibleText(fullText.slice(0, index));
        if (index >= fullText.length) clearInterval(timer);
      }, 24);
    };

    const delayTimer = setTimeout(start, delay);
    return () => {
      clearTimeout(delayTimer);
      if (timer) clearInterval(timer);
    };
  }, [fullText, delay]);

  return (
    <Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={style}>
      {visibleText}
    </Text>
  );
}

function AnimatedCounterText({ value, children, style, numberOfLines = 1, ellipsizeMode = 'tail', delay = 0 }) {
  const raw = String(value ?? children ?? '');
  const numericText = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  const target = numericText ? Number(numericText[0]) : null;
  const prefix = numericText ? raw.slice(0, numericText.index) : '';
  const suffix = numericText ? raw.slice(numericText.index + numericText[0].length) : '';
  const decimals = numericText?.[0].includes('.') ? numericText[0].split('.')[1].length : 0;
  const [display, setDisplay] = useState(raw);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(raw);
      return undefined;
    }

    let frame;
    let timer;
    const duration = 650;
    const start = () => {
      const startedAt = Date.now();

      const tick = () => {
        const progress = Math.min((Date.now() - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        const formatted = decimals
          ? current.toFixed(decimals)
          : Math.round(current).toString();
        setDisplay(prefix + formatted + suffix);

        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      };

      frame = requestAnimationFrame(tick);
    };

    timer = setTimeout(start, delay);

    return () => {
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [raw, target, prefix, suffix, decimals, delay]);

  return (
    <Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={style}>
      {display}
    </Text>
  );
}
function AnimatedIcon({ children, delay = 0, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      friction: 7,
      tension: 80,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function InfoTile({ icon, image, label, value, theme, imageUri, onPress, variant = 'default', delay = 0 }) {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.infoTile,
        isFeatured && styles.featuredTile,
        isCompact && styles.compactTile,
        { backgroundColor: theme.colors.surfaceContainerHighest },
      ]}
    >
      <View style={[styles.tileContent, isFeatured && styles.featuredContent, isCompact && styles.compactContent]}>
        <View style={[styles.tileIconWrap, isFeatured && styles.featuredIconWrap]}>
          <AnimatedIcon delay={delay}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={[styles.cardIcon, isFeatured && styles.featuredCardIcon]} resizeMode="contain" />
            ) : image ? (
              <Image source={image} style={[styles.tileImage, isFeatured && styles.featuredTileImage]} resizeMode="contain" />
            ) : (
              <MaterialCommunityIcons
                name={icon}
                size={isFeatured ? 48 : isCompact ? 21 : 27}
                color={theme.colors.primary}
              />
            )}
          </AnimatedIcon>
        </View>

        <View style={[styles.tileTextBlock, isFeatured && styles.featuredTextBlock, isCompact && styles.compactTextBlock]}>
          <AnimatedTypingText
            style={[styles.tileLabel, isFeatured && styles.featuredLabel, isCompact && styles.compactLabel, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={isFeatured ? 2 : 1}
            delay={delay + 70}
          >
            {label}
          </AnimatedTypingText>
          {value !== null && value !== undefined && (
            <AnimatedCounterText
              style={[styles.tileValue, isFeatured && styles.featuredValue, isCompact && styles.compactValue, { color: theme.colors.onSurface }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              delay={delay + 180}
            >
              {value}
            </AnimatedCounterText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function EntityPreviewModal({ visible, entity, type = 'player', countryName, onClose, onExpand, onClanPress }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const backdropProgress = useRef(new Animated.Value(0)).current;
  const contentProgress = useRef(new Animated.Value(0)).current;
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
    fetchPlayer(tag).then((player) => {
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
      contentProgress.setValue(0);
      Animated.parallel([
        Animated.spring(progress, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }),
        Animated.timing(backdropProgress, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(contentProgress, { toValue: 1, friction: 10, tension: 65, delay: 90, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (!visible && modalVisible && !closing.current) {
      closing.current = true;
      Animated.parallel([
        Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(backdropProgress, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(contentProgress, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setModalVisible(false);
          closing.current = false;
        }
      });
    }
  }, [visible, entity, modalVisible, progress, backdropProgress, contentProgress]);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropProgress, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(contentProgress, { toValue: 0, duration: 120, useNativeDriver: true }),
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

  const seasonalTrophyRoad = findSeasonalTrophyRoad(playerData);
  const seasonalBestTrophies = seasonalTrophyRoad?.bestTrophies;
  const seasonalArena = seasonalTrophyRoad?.arena;

  const playerCurrentPol = playerData?.currentPathOfLegendSeasonResult;
  const playerBestPol = playerData?.bestPathOfLegendSeasonResult;
  const currentRank = firstValue(playerCurrentPol?.rank, entity.rank);
  const bestRank = firstValue(playerBestPol?.rank, entity.bestRank);
  const progressTrophies = firstValue(playerCurrentPol?.trophies, playerData?.trophies);
  const progressLabel = 'Path Of\nLegends';

  const battleCount = Number(playerData?.battleCount);
  const rawWins = Number(playerData?.wins);
  const rawLosses = Number(playerData?.losses);
  const wins = Number.isFinite(rawWins) ? rawWins : 0;
  const losses = Number.isFinite(rawLosses) ? rawLosses : Math.max(0, battleCount - wins);
  const totalGames = Number.isFinite(battleCount) ? battleCount : wins + losses;
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
            <Animated.View
              style={[
                styles.contentAnimated,
                {
                  opacity: contentProgress,
                  transform: [{ translateY: contentProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                },
              ]}
            >
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
                <View style={styles.playerDashboard}>
                  <View style={styles.heroRow}>
                    <View style={styles.rankCluster}>
                      <InfoTile
                        icon="trophy-outline"
                        label={progressLabel}
                        value={playerLoading ? '…' : String(progressTrophies ?? '—')}
                        theme={theme}
                        variant="featured"
                        delay={80}
                      />
                      <View style={styles.rankColumn}>
                        <InfoTile
                          icon="podium"
                          label="Current"
                          value={playerLoading ? '…' : rankLabel}
                          theme={theme}
                          variant="compact"
                          delay={170}
                        />
                        <InfoTile
                          icon="trophy-award"
                          label="Best"
                          value={playerLoading ? '…' : bestRankLabel}
                          theme={theme}
                          variant="compact"
                          delay={240}
                        />
                      </View>
                    </View>

                    <View style={styles.favoriteVisual}>
                      {favouriteIcon ? (
                        <AnimatedIcon delay={300}>
                          <Image source={{ uri: favouriteIcon }} style={styles.favoriteCardImage} resizeMode="contain" />
                        </AnimatedIcon>
                      ) : (
                        <AnimatedIcon delay={300}>
                          <MaterialCommunityIcons name="cards-outline" size={48} color={theme.colors.primary} />
                        </AnimatedIcon>
                      )}
                      <AnimatedTypingText
                        delay={370}
                        style={[styles.favoriteCardLabel, { color: theme.colors.onSurfaceVariant }]}
                        numberOfLines={1}
                      >
                        Favorite card
                      </AnimatedTypingText>
                    </View>
                  </View>

                  <View style={styles.dashboardSection}>
                    <View style={styles.dashboardRow}>
                      <InfoTile
                        icon="gamepad-variant"
                        label="Games played"
                        delay={320}
                        value={playerLoading ? '…' : totalGames > 0 ? formatNumber(totalGames) : '—'}
                        theme={theme}
                        variant="compact"
                      />
                      <InfoTile
                        icon="trophy"
                        label="Total wins"
                        delay={390}
                        value={playerLoading ? '…' : formatNumber(wins)}
                        theme={theme}
                        variant="compact"
                      />
                      <InfoTile
                        icon="percent"
                        label="Win rate"
                        delay={460}
                        value={playerLoading ? '…' : winRate}
                        theme={theme}
                        variant="compact"
                      />
                    </View>
                  </View>

                  <View style={styles.dashboardSection}>
                    <View style={styles.dashboardRow}>
                      <Pressable
                        disabled={!clanTag}
                        onPress={clanTag ? () => onClanPress?.({ name: clanName, tag: clanTag }, 'clan') : undefined}
                        style={[styles.clanCard, { backgroundColor: theme.colors.surfaceContainerHighest }]}
                      >
                        <AnimatedIcon delay={540} style={[styles.clanIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                          <MaterialCommunityIcons name="account-group" size={20} color={theme.colors.primary} />
                        </AnimatedIcon>
                        <View style={styles.clanCardText}>
                          <Text style={[styles.clanCardLabel, { color: theme.colors.onSurfaceVariant }]}>Clan</Text>
                          <Text numberOfLines={1} style={[styles.clanCardValue, { color: theme.colors.onSurface }]}>
                            {clanName || 'No clan'}
                          </Text>
                        </View>
                        {clanTag ? (
                          <AnimatedIcon delay={610}>
                            <MaterialCommunityIcons name="chevron-right" size={19} color={theme.colors.onSurfaceVariant} />
                          </AnimatedIcon>
                        ) : null}
                      </Pressable>

                      <View style={[styles.bestArenaCard, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                        <View style={styles.bestTrophiesBlock}>
                          <AnimatedIcon delay={680}>
                            <MaterialCommunityIcons name="trophy-variant-outline" size={26} color={theme.colors.primary} />
                          </AnimatedIcon>
                          <View style={styles.bestTrophiesText}>
                            <AnimatedTypingText
                              delay={750}
                              style={[styles.clanCardLabel, { color: theme.colors.onSurfaceVariant }]}
                              numberOfLines={1}
                            >
                              Best trophy
                            </AnimatedTypingText>
                            <AnimatedCounterText
                              delay={820}
                              style={[styles.clanCardValue, { color: theme.colors.onSurface }]}
                              numberOfLines={1}
                            >
                              {playerLoading ? '…' : formatNumber(seasonalBestTrophies ?? playerData?.bestTrophies)}
                            </AnimatedCounterText>
                          </View>
                        </View>

                        <View style={[styles.arenaDivider, { backgroundColor: theme.colors.outlineVariant }]} />

                        <View style={styles.arenaBlock}>
                          <AnimatedTypingText
                            delay={750}
                            style={[styles.arenaLabel, { color: theme.colors.onSurfaceVariant }]}
                            numberOfLines={1}
                          >
                            Arena
                          </AnimatedTypingText>
                          <AnimatedCounterText
                            delay={820}
                            style={[styles.arenaValue, { color: theme.colors.primary }]}
                            numberOfLines={1}
                          >
                            {playerLoading ? '…' : seasonalArena ? (formatSeasonalArena(seasonalArena) || seasonalArena.name || '—') : formatArenaNumber(playerData?.arena)}
                          </AnimatedCounterText>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {playerLoading && !isClan && (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
            )}
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const popupHeight = 315;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.46)' },
  animated: { width: '90%', maxWidth: 390, height: popupHeight },
  contentAnimated: { flex: 1 },
  card: { flex: 1, borderRadius: 30, padding: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', height: 62, marginBottom: 8 },
  entityIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  playerIcon: { width: 38, height: 38 },
  titleBlock: { flex: 1, marginLeft: 11, minWidth: 0 },
  title: { fontSize: 20.5, fontWeight: '800', letterSpacing: -0.3, transform: [{ translateY: -5 }] },
  tag: { fontSize: 10, marginTop: 2, fontWeight: '700', transform: [{ translateY: -3 }] },
  actionButton: { width: 38, height: 38, borderRadius: 19, margin: 0, marginLeft: 6 },
  playerDashboard: { flex: 1, gap: 8 },
  heroRow: { height: 88, flexDirection: 'row', gap: 6 },
  rankCluster: { flex: 2.18, flexDirection: 'row', gap: 4, minWidth: 0, transform: [{ translateX: -4 }] },
  rankColumn: { flex: 1.02, gap: 8, minWidth: 0, transform: [{ translateX: 6 }] },
  favoriteVisual: { flex: 0.46, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1, transform: [{ translateX: 1 }, { translateY: -8 }] },
  favoriteCardImage: { width: 87, height: 87, marginBottom: 1 },
  favoriteCardLabel: { fontSize: 7.5, fontWeight: '700', textAlign: 'center' },
  dashboardSection: { flex: 0, height: 56 },
  dashboardRow: { flex: 1, flexDirection: 'row', gap: 6 },
  infoTile: { flex: 1, minWidth: 0, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 7, overflow: 'hidden', justifyContent: 'center' },
  featuredTile: { flex: 1.58, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 8, transform: [{ translateX: 4 }] },
  compactTile: { borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6 },
  tileContent: { width: '100%', flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  featuredContent: { flex: 1 },
  compactContent: { flex: 1 },
  tileIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featuredIconWrap: { width: 66, height: 66, borderRadius: 18, marginLeft: 4 },
  tileTextBlock: { flex: 1, minWidth: 0, marginLeft: 7, alignItems: 'flex-start', justifyContent: 'center' },
  featuredTextBlock: { marginLeft: 5, alignItems: 'center' },
  compactTextBlock: { marginLeft: 2, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -3 }] },
  tileImage: { width: 28, height: 28 },
  featuredTileImage: { width: 58, height: 58 },
  cardIcon: { width: 30, height: 30 },
  featuredCardIcon: { width: 50, height: 50 },
  tileLabel: { fontSize: 8.5, fontWeight: '600', textAlign: 'left', flexShrink: 1 },
  featuredLabel: { fontSize: 9.5, fontWeight: '700', lineHeight: 11, textAlign: 'center' },
  compactLabel: { fontSize: 8, fontWeight: '600', textAlign: 'center' },
  tileValue: { fontSize: 12, fontWeight: '800', marginTop: 1, textAlign: 'left', flexShrink: 1 },
  featuredValue: { fontSize: 21, fontWeight: '900', marginTop: 2, letterSpacing: -0.4 },
  compactValue: { fontSize: 12, fontWeight: '800', marginTop: 1, textAlign: 'center' },
  clanCard: { flex: 1, minWidth: 0, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  bestArenaCard: { flex: 1, minWidth: 0, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  bestTrophiesBlock: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', transform: [{ translateX: 4 }] },
  bestTrophiesText: { flex: 1, minWidth: 0, marginLeft: 6 },
  arenaDivider: { position: 'absolute', left: 100, width: 1, height: 28, borderRadius: 1 },
  arenaBlock: { width: 54, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: 4 }] },
  arenaLabel: { fontSize: 8, fontWeight: '600' },
  arenaValue: { fontSize: 11.5, fontWeight: '800', marginTop: 1 },
  clanIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  clanCardText: { flex: 1, minWidth: 0, marginLeft: 7 },
  clanCardLabel: { fontSize: 8, fontWeight: '600' },
  clanCardValue: { fontSize: 11.5, fontWeight: '800', marginTop: 1 },

  loader: { position: 'absolute', bottom: 5, alignSelf: 'center' },
  clanBody: { flex: 1, justifyContent: 'center' },
  primaryStats: { flexDirection: 'row', gap: 7, marginTop: 9 },
  primaryStat: { flex: 1, minHeight: 64, borderRadius: 15, paddingHorizontal: 9, backgroundColor: 'rgba(127,127,127,0.10)', flexDirection: 'row', alignItems: 'center' },
  primaryStatIcon: { width: 22, height: 22 },
  statText: { flex: 1, marginLeft: 7, minWidth: 0 },
  statLabel: { fontSize: 9, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  secondaryRow: { flexDirection: 'row', gap: 5, marginTop: 7, height: 58 },
  detailLine: { minHeight: 46, borderRadius: 15, paddingHorizontal: 10, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(127,127,127,0.10)' },
});