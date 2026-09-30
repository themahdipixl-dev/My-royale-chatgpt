// * screens/EntityDetailsScreen.js — full player details page (v83)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchPlayer, fetchPlayerBattlelog } from '../api/client';

const leagueIcon = require('../assets/league-icon.png');
const pointIcon = require('../assets/Point-icon.png');

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString();
}

function formatLeagueNumber(value) {
  if (value === undefined || value === null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Math.min(7, n).toLocaleString();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function shortTag(tag) {
  if (!tag) return '—';
  const clean = String(tag);
  return clean.length > 13 ? `${clean.slice(0, 6)}…${clean.slice(-5)}` : clean;
}

function arenaNumber(arena) {
  const raw = String(arena?.rawName ?? '');
  const normal = raw.match(/^Arena_(\d+)$/i);
  if (normal) return String(Number(normal[1]));
  const league = raw.match(/^Arena_L(\d+)$/i);
  if (league) return String(Number(league[1]) + 14);
  return null;
}

function findSeasonalTrophyRoad(player) {
  let best = null;
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const match = key.match(/^seasonal-trophy-road-(\d+)$/i);
      if (match && child && typeof child === 'object') {
        const seasonId = Number(match[1]);
        const seasonalBest = Number(child.bestTrophies);
        if (Number.isFinite(seasonalBest) && seasonalBest > 0) {
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
  const rawName = String(arena?.rawName ?? '');
  const match = name.match(/^Seasonal Arena\s+(\d+)$/i);
  if (match) return toRoman(Number(match[1])) || null;
  const rawMatch = rawName.match(/SeasonalArenas_\d+_Arena(\d+)$/i);
  if (rawMatch) return toRoman(Number(rawMatch[1])) || null;
  const numeralMatch = name.match(/^Seasonal Arena\s+([IVXLCDM]+)$/i);
  return numeralMatch ? numeralMatch[1].toUpperCase() : null;
}


const DetailAnimationContext = createContext(null);

function AnimatedDetailItem({ children, index = 0, layoutStyle }) {
  const animation = useContext(DetailAnimationContext);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const nodeRef = useRef(null);
  const layout = useRef({ y: 0, h: 1, measured: false }).current;
  const visible = useRef(false);
  const checkRef = useRef(null);
  const idRef = useRef({}).current;

  const animateIn = useCallback(() => {
    opacity.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(0);
    translateY.setValue(14);
    scale.setValue(0.98);
    const delay = Math.min(index, 8) * 24;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, delay, isInteraction: false, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, friction: 8, tension: 60, isInteraction: false, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay, friction: 9, tension: 60, isInteraction: false, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY, scale]);

  checkRef.current = (nextScrollY = 0, nextViewportH = 700) => {
    if (!layout.measured) return;
    const y = layout.y;
    const h = layout.h;
    const isVisible = y < nextScrollY + nextViewportH - 12 && y + h > nextScrollY + 12;
    if (isVisible && !visible.current) {
      visible.current = true;
      animateIn();
    } else if (!isVisible && visible.current) {
      visible.current = false;
    }
  };

  useEffect(() => {
    if (!animation) return undefined;
    animation.registerItem(idRef, (scrollY, viewportH) => checkRef.current?.(scrollY, viewportH));
    return () => animation.unregisterItem(idRef);
  }, [animation, idRef]);

  const measureItem = useCallback(() => {
    if (!animation?.scrollRef?.current || !nodeRef.current) return;
    nodeRef.current.measureInWindow((_, pageY, __, height) => {
      animation.scrollRef.current?.measureInWindow((__, scrollPageY) => {
        layout.y = pageY - scrollPageY + animation.scrollYRef.current;
        layout.h = height || layout.h;
        layout.measured = true;
        checkRef.current?.();
      });
    });
  }, [animation, layout]);

  return (
    <Animated.View
      ref={nodeRef}
      onLayout={measureItem}
      style={[layoutStyle, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      {children}
    </Animated.View>
  );
}

function AnimatedSection({ children, index = 0, register }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const layoutY = useRef(0);
  const layoutH = useRef(1);
  const viewportH = useRef(700);
  const scrollY = useRef(0);
  const visible = useRef(false);
  const checkRef = useRef(null);

  const animateIn = useCallback(() => {
    opacity.setValue(0);
    const delay = Math.min(index, 10) * 28;
    Animated.timing(opacity, { toValue: 1, duration: 220, delay, isInteraction: false, useNativeDriver: true }).start();
  }, [index, opacity]);

  checkRef.current = (nextScrollY = scrollY.current, nextViewportH = viewportH.current) => {
    scrollY.current = nextScrollY;
    viewportH.current = nextViewportH;
    const y = layoutY.current;
    const h = layoutH.current;
    const isVisible = y < nextScrollY + nextViewportH && y + h > nextScrollY;
    if (isVisible && !visible.current) {
      visible.current = true;
      animateIn();
    }
  };

  useEffect(() => {
    const checker = (nextScrollY, nextViewportH) => checkRef.current?.(nextScrollY, nextViewportH);
    register?.(index, checker);
    requestAnimationFrame(() => checkRef.current?.());
    return () => register?.(index, null);
  }, [index, register]);

  return (
    <Animated.View
      onLayout={(event) => {
        layoutY.current = event.nativeEvent.layout.y;
        layoutH.current = event.nativeEvent.layout.height;
        requestAnimationFrame(() => checkRef.current?.());
      }}
      style={{ opacity }}
    >
      {children}
    </Animated.View>
  );
}
function SectionTitle({ icon, title, subtitle, right, theme }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleLeft}>
        <View style={[styles.sectionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name={icon} size={18} color={theme.colors.onPrimaryContainer} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        {subtitle ? (
          <View style={styles.sectionSubtitle}>
            <Text style={[styles.sectionSubtitleLine, { color: theme.colors.onSurfaceVariant }]}>Path Of</Text>
            <Text style={[styles.sectionSubtitleLine, { color: theme.colors.onSurfaceVariant }]}>Legends</Text>
          </View>
        ) : null}
      </View>
      {right ? <Text style={[styles.sectionRight, { color: theme.colors.onSurfaceVariant }]}>{right}</Text> : null}
    </View>
  );
}

function StatTile({ index = 0, icon, label, value, theme, image }) {
  return (
    <AnimatedDetailItem index={index} layoutStyle={styles.statTile}>
      <View style={[styles.statTileInner, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
        <View style={[styles.statIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          {image ? (
            <Image source={image} style={styles.statImage} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name={icon} size={21} color={theme.colors.onPrimaryContainer} />
          )}
        </View>
        <View style={styles.statContent}>
          <Text numberOfLines={1} style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
        </View>
      </View>
    </AnimatedDetailItem>
  );
}

function InfoRow({ index = 0, icon, label, value, theme }) {
  return (
    <AnimatedDetailItem index={index}>
      <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={19} color={theme.colors.primary} />
      <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </AnimatedDetailItem>
  );
}

function resolveCurrentDeckImage(card, index, deck) {
  const urls = card?.iconUrls || {};
  const normal = urls.medium;
  const hero = urls.heroMedium;
  const evolution = urls.evolutionMedium;

  // Slot 1: Evolution only. Never use the Hero asset here.
  if (index === 0) {
    return evolution || normal;
  }

  // Slot 2: Hero only. Never use the Evolution asset here.
  if (index === 1) {
    return hero || normal;
  }

  // Slot 3 depends on whether Slot 2 is a Hero.
  if (index === 2) {
    const secondCardIsHero = Boolean(deck?.[1]?.iconUrls?.heroMedium);

    if (secondCardIsHero) {
      return evolution || normal;
    }

    return hero || evolution || normal;
  }

  // Slots 4-8: always use the normal card asset.
  return normal;
}


function getDeckAverages(deck) {
  const cards = Array.isArray(deck) ? deck : [];
  const elixirs = cards.map((card) => Number(card?.elixirCost)).filter(Number.isFinite);
  const levels = cards.map((card) => Number(card?.level)).filter(Number.isFinite);
  const avgElixir = elixirs.length ? (elixirs.reduce((sum, value) => sum + value, 0) / elixirs.length).toFixed(1) : '—';
  const avgLevel = levels.length ? Math.round(levels.reduce((sum, value) => sum + value, 0) / levels.length) : '—';
  return { avgElixir, avgLevel };
}


function getCardIdentity(card) {
  if (card?.id !== undefined && card?.id !== null) return `id:${card.id}`;
  if (card?.name) return `name:${String(card.name).toLowerCase()}`;
  return null;
}

function getCurrentDeckBattleStats(battlelog, currentDeck, playerTag) {
  const deck = Array.isArray(currentDeck) ? currentDeck : [];
  const deckIds = new Set(deck.map(getCardIdentity).filter(Boolean));
  const battles = Array.isArray(battlelog) ? battlelog.slice(0, 30) : [];

  let games = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let crowns = 0;
  let threeCrownWins = 0;

  battles.forEach((battle) => {
    const team = Array.isArray(battle?.team) ? battle.team : [];
    const opponent = Array.isArray(battle?.opponent) ? battle.opponent : [];
    const player = team.find((entry) => String(entry?.tag || '').toUpperCase() === String(playerTag || '').toUpperCase()) || team[0];

    if (!player || !Array.isArray(player.cards)) return;

    const usedCards = new Set(player.cards.map(getCardIdentity).filter(Boolean));
    let matchingCards = 0;
    deckIds.forEach((id) => {
      if (usedCards.has(id)) matchingCards += 1;
    });

    if (matchingCards < 6) return;

    const teamCrowns = number(player?.crowns);
    const opponentCrowns = opponent.reduce((sum, entry) => sum + number(entry?.crowns), 0);

    games += 1;
    crowns += teamCrowns;

    if (teamCrowns > opponentCrowns) {
      wins += 1;
      if (teamCrowns >= 3) threeCrownWins += 1;
    } else if (teamCrowns < opponentCrowns) {
      losses += 1;
    } else {
      draws += 1;
    }
  });

  return {
    games,
    wins,
    losses,
    draws,
    winRate: games > 0 ? (wins / games) * 100 : 0,
    crowns,
    threeCrownWins,
    threeCrownRate: wins > 0 ? (threeCrownWins / wins) * 100 : 0,
    avgCrowns: games > 0 ? (crowns / games).toFixed(1) : '0.0',
    checkedBattles: Math.min(30, battles.length),
  };
}

function CardItem({ index = 0, card, theme, compact = false, deck }) {
  const image = deck ? resolveCurrentDeckImage(card, index, deck) : (
    card?.iconUrls?.medium || card?.iconUrls?.evolutionMedium || card?.iconUrls?.heroMedium
  );
  return (
    <AnimatedDetailItem index={index} layoutStyle={[styles.cardItem, compact && styles.compactCardItem]}>
      <View style={[styles.cardItemInner, compact && styles.compactCardItemInner, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
        <View style={styles.cardVisual}>
          {image ? (
            <Image source={{ uri: image }} style={compact ? styles.compactCardImage : styles.cardImage} resizeMode="contain" />
          ) : (
            <View style={[styles.cardImageFallback, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="cards-outline" size={28} color={theme.colors.onPrimaryContainer} />
            </View>
          )}
          <View style={styles.cardOverlayMeta}>
            <View style={[styles.cardMetaPill, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.cardLevel, { color: theme.colors.onPrimaryContainer }]}>L {card?.level ?? '—'}</Text>
            </View>
            {card?.elixirCost !== undefined ? (
              <View style={[styles.cardMetaPill, { backgroundColor: theme.colors.primaryContainer }]}>

                <MaterialCommunityIcons name="water" size={9} color={theme.colors.onPrimaryContainer} />
                <Text style={[styles.cardElixir, { color: theme.colors.onPrimaryContainer }]}>{card.elixirCost}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedDetailItem>
  );
}

function BadgeItem({ index = 0, badge, theme }) {
  const image = badge?.iconUrls?.large || badge?.iconUrls?.medium;
  const progress = number(badge?.progress);
  const target = number(badge?.target);
  const ratio = target > 0 ? Math.min(1, progress / target) : 0;

  return (
    <AnimatedDetailItem index={index} layoutStyle={styles.badgeItem}>
      <View style={[styles.badgeItemInner, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      {image ? (
        <Image source={{ uri: image }} style={styles.badgeImage} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name="medal-outline" size={34} color={theme.colors.primary} />
      )}
      <Text numberOfLines={2} style={[styles.badgeName, { color: theme.colors.onSurface }]}>
        {badge?.name || 'Badge'}
      </Text>
      <Text style={[styles.badgeLevel, { color: theme.colors.primary }]}>
        Level {badge?.level ?? '—'}{badge?.maxLevel ? ` / ${badge.maxLevel}` : ''}
      </Text>
      {target > 0 ? (
        <>
          <View style={[styles.badgeTrack, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.badgeFill, { width: `${ratio * 100}%`, backgroundColor: theme.colors.primary }]} />
          </View>
          <Text style={[styles.badgeProgress, { color: theme.colors.onSurfaceVariant }]}>
            {formatNumber(progress)} / {formatNumber(target)}
          </Text>
        </>
      ) : null}
      </View>
    </AnimatedDetailItem>
  );
}

function BattleRow({ battle, theme, index }) {
  const team = Array.isArray(battle?.team) ? battle.team : [];
  const opponent = Array.isArray(battle?.opponent) ? battle.opponent : [];
  const teamCrowns = team.reduce((sum, p) => sum + number(p?.crowns), 0);
  const opponentCrowns = opponent.reduce((sum, p) => sum + number(p?.crowns), 0);
  const won = teamCrowns > opponentCrowns;
  const draw = teamCrowns === opponentCrowns;
  const mode = firstValue(battle?.gameMode?.name, battle?.gameMode?.id, battle?.type, battle?.arena?.name, 'Battle');
  const date = firstValue(battle?.battleTime, battle?.createdDate, battle?.date);

  return (
    <AnimatedDetailItem index={index}>
      <View style={[styles.battleRow, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      <View style={[styles.resultIcon, {
        backgroundColor: draw ? theme.colors.surfaceContainer : won ? theme.colors.primaryContainer : theme.colors.errorContainer,
      }]}>
        <MaterialCommunityIcons
          name={draw ? 'minus' : won ? 'check' : 'close'}
          size={18}
          color={draw ? theme.colors.onSurfaceVariant : won ? theme.colors.onPrimaryContainer : theme.colors.onErrorContainer}
        />
      </View>
      <View style={styles.battleMain}>
        <Text numberOfLines={1} style={[styles.battleMode, { color: theme.colors.onSurface }]}>{mode}</Text>
        <Text numberOfLines={1} style={[styles.battleDate, { color: theme.colors.onSurfaceVariant }]}>
          {date ? formatDate(date) : `Battle ${index + 1}`}
        </Text>
      </View>
      <Text style={[styles.battleScore, { color: theme.colors.onSurface }]}>
        {teamCrowns} — {opponentCrowns}
      </Text>
      </View>
    </AnimatedDetailItem>
  );
}

export default function EntityDetailsScreen({ entity, type = 'player', onBack }) {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(18)).current;
  const entranceScale = useRef(new Animated.Value(0.97)).current;
  const scrollRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [battlelog, setBattlelog] = useState([]);
  const [loading, setLoading] = useState(type === 'player');
  const [battleLoading, setBattleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const isClan = type === 'clan';
  const tag = firstValue(entity?.tag, entity?.playerTag);

  const animatedItems = useRef(new Map()).current;
  const scrollYRef = useRef(0);
  const registerAnimatedItem = useCallback((id, checker) => {
    if (checker) animatedItems.set(id, checker);
    else animatedItems.delete(id);
  }, [animatedItems]);
  const unregisterAnimatedItem = useCallback((id) => {
    animatedItems.delete(id);
  }, [animatedItems]);
  const detailAnimation = useMemo(() => ({
    scrollRef,
    scrollYRef,
    registerItem: registerAnimatedItem,
    unregisterItem: unregisterAnimatedItem,
  }), [registerAnimatedItem, unregisterAnimatedItem, scrollRef, scrollYRef]);

  const animatedSections = useRef(new Map()).current;
  const registerAnimatedSection = useCallback((index, checker) => {
    if (checker) animatedSections.set(index, checker);
    else animatedSections.delete(index);
  }, [animatedSections]);

  const handleDetailsScroll = useCallback((event) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    scrollYRef.current = contentOffset.y;
    animatedSections.forEach((checker) => checker(contentOffset.y, layoutMeasurement.height));
    animatedItems.forEach((checker) => checker(contentOffset.y, layoutMeasurement.height));
  }, [animatedSections, animatedItems]);

  useEffect(() => {
    entrance.setValue(0);
    entranceY.setValue(18);
    entranceScale.setValue(0.97);
    Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(entranceY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.spring(entranceScale, { toValue: 1, friction: 9, tension: 55, useNativeDriver: true }),
    ]).start();
  }, [entrance, entranceY, entranceScale]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  useEffect(() => {
    if (isClan || !tag) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPlayer(tag)
      .then((data) => {
        if (!cancelled) setPlayer(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load player details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isClan, tag]);

  const loadBattlelog = useCallback(() => {
    if (isClan || !tag) return;
    setBattleLoading(true);
    fetchPlayerBattlelog(tag)
      .then((items) => setBattlelog(Array.isArray(items) ? items : []))
      .catch(() => setBattlelog([]))
      .finally(() => setBattleLoading(false));
  }, [isClan, tag]);

  useEffect(() => {
    loadBattlelog();
  }, [loadBattlelog]);

  const data = player || entity || {};
  const wins = number(data.wins);
  const losses = number(data.losses);
  const battles = number(data.battleCount) || wins + losses;
  const winRate = battles > 0 ? (wins / battles) * 100 : 0;
  const lossRate = battles > 0 ? (losses / battles) * 100 : 0;
  const threeCrowns = number(data.threeCrownWins);
  const threeCrownRate = wins > 0 ? Math.round((threeCrowns / wins) * 100) : 0;
  const currentPol = data.currentPathOfLegendSeasonResult;
  const lastPol = data.lastPathOfLegendSeasonResult;
  const bestPol = data.bestPathOfLegendSeasonResult;
  const seasonalTrophyRoad = findSeasonalTrophyRoad(data);
  const seasonalBestTrophies = seasonalTrophyRoad?.bestTrophies;
  const seasonalArena = seasonalTrophyRoad?.arena;
  const sourceBestTrophies = data?.bestTrophies ?? entity?.bestTrophies;
  const displayedBestTrophies = Number.isFinite(Number(seasonalBestTrophies)) && Number(seasonalBestTrophies) > 0
    ? Number(seasonalBestTrophies)
    : Number.isFinite(Number(sourceBestTrophies))
      ? Number(sourceBestTrophies)
      : null;
  const displayedArenaName = seasonalArena
    ? (formatSeasonalArena(seasonalArena) || seasonalArena.name || data.arena?.name || '—')
    : firstValue(data.arena?.name, '—');
  const displayedArenaNumber = seasonalArena
    ? (formatSeasonalArena(seasonalArena) || null)
    : arenaNumber(data.arena);
  const favouriteCard = data.currentFavouriteCard;
  const currentDeck = useMemo(() => (Array.isArray(data.currentDeck) ? data.currentDeck : []), [data.currentDeck]);
  const currentDeckSupport = Array.isArray(data.currentDeckSupportCards) ? data.currentDeckSupportCards : [];
  const deckBattleStats = useMemo(
    () => getCurrentDeckBattleStats(battlelog, currentDeck, tag),
    [battlelog, currentDeck, tag],
  );
  const badges = Array.isArray(data.badges) ? data.badges : [];

  const allCards = useMemo(() => {
    const cards = Array.isArray(data.cards) ? data.cards : [];
    const supportCards = Array.isArray(data.supportCards) ? data.supportCards : [];
    const seen = new Set();
    return [...cards, ...supportCards].filter((card) => {
      const key = card?.id ?? card?.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data.cards, data.supportCards]);

  const cardCount = allCards.length;
  const maxLevelCards = allCards.filter((card) => number(card?.level) >= number(card?.maxLevel) && card?.maxLevel).length;
  const evolvedCards = allCards.filter((card) => number(card?.evolutionLevel) > 0).length;

  const title = isClan
    ? firstValue(data.name, data.clan?.name, 'Clan')
    : firstValue(data.name, entity?.name, 'Player');
  const headerTitle = isClan ? 'Clan Details' : 'Player Details';

  if (showAllBadges && !isClan) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={() => setShowAllBadges(false)} style={styles.back} />
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Badges & achievements
          </Text>
          <Text style={[styles.sectionRight, { color: theme.colors.onSurfaceVariant, marginRight: 8 }]}>
            {badges.length}
          </Text>
        </View>

        <FlatList
          data={badges}
          keyExtractor={(badge, index) => String(badge?.name || badge?.id || index)}
          numColumns={3}
          renderItem={({ item }) => <BadgeItem badge={item} theme={theme} />}
          contentContainerStyle={styles.badgesPageContent}
          columnWrapperStyle={styles.badgesPageRow}
          showsVerticalScrollIndicator={false}
          initialNumToRender={9}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews
        />
      </SafeAreaView>
    );
  }

  if (isClan) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={onBack} style={styles.back} />
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{headerTitle}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AnimatedSection index={0} register={registerAnimatedSection}><Surface elevation={0} style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="account-group" size={30} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={[styles.heroName, { color: theme.colors.onSurface }]}>{title}</Text>
            <Text style={[styles.heroTag, { color: theme.colors.primary }]}>{firstValue(data.tag, data.clan?.tag, '—')}</Text>
            <View style={styles.statGrid}>
              <StatTile icon="trophy-outline" label="Clan score" value={formatNumber(firstValue(data.clanScore, data.clanWarTrophies, data.score, data.trophies))} theme={theme} image={pointIcon} />
              <StatTile icon="account-group" label="Members" value={formatNumber(firstValue(data.members, data.memberCount, data.membersCount))} theme={theme} />
            </View>
          </Surface></AnimatedSection>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={onBack} style={styles.back} />
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{headerTitle}</Text>
        </View>

        {loading && !player ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading player...</Text>
          </View>
        ) : error && !player ? (
          <View style={styles.center}>
            <View style={[styles.errorIcon, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons name="alert-outline" size={28} color={theme.colors.onErrorContainer} />
            </View>
            <Text style={[styles.errorTitle, { color: theme.colors.onSurface }]}>Couldn't load player</Text>
            <Text style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>{error}</Text>
            <Pressable onPress={() => {
              setError(null);
              setLoading(true);
              fetchPlayer(tag)
                .then(setPlayer)
                .catch((err) => setError(err?.message || 'Could not load player details.'))
                .finally(() => setLoading(false));
            }} style={[styles.retryButton, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.retryText, { color: theme.colors.onPrimaryContainer }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <DetailAnimationContext.Provider value={detailAnimation}>
            <Animated.ScrollView
              ref={scrollRef}
              onScroll={handleDetailsScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <AnimatedSection index={1} register={registerAnimatedSection}><Surface elevation={0} style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Image source={leagueIcon} style={styles.heroLeagueIcon} resizeMode="contain" />
                </View>
                <View style={styles.heroIdentity}>
                  <Text numberOfLines={1} style={[styles.heroName, { color: theme.colors.onSurface }]}>{title}</Text>
                  <Text numberOfLines={1} style={[styles.heroTag, { color: theme.colors.primary }]}>{shortTag(data.tag || tag)}</Text>
                  <Text numberOfLines={1} style={[styles.heroSub, { color: theme.colors.onSurfaceVariant }]}>
                    {firstValue(data.role, 'Player')} · {displayedArenaName || 'Arena'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroTrophy}>
                  <Image source={pointIcon} style={styles.heroPointIcon} resizeMode="contain" />
                  <View>
                    <Text style={[styles.heroStatLabel, { color: theme.colors.onSurfaceVariant }]}>Trophies</Text>
                    <Text style={[styles.heroTrophyValue, { color: theme.colors.onSurface }]}>{formatNumber(data.trophies)}</Text>
                  </View>
                </View>
                <View style={styles.heroBest}>
                  <MaterialCommunityIcons name="trophy-award" size={22} color={theme.colors.primary} />
                  <View>
                    <Text style={[styles.heroStatLabel, { color: theme.colors.onSurfaceVariant }]}>Best</Text>
                    <Text style={[styles.heroBestValue, { color: theme.colors.onSurface }]}>{formatNumber(displayedBestTrophies)}</Text>
                  </View>
                </View>
              </View>
            </Surface></AnimatedSection>

            <View style={styles.statGrid}>
              <StatTile index={0} icon="gamepad-variant" label="Battles" value={formatNumber(data.battleCount)} theme={theme} />
              <StatTile index={1} icon="check-circle-outline" label="Wins" value={formatNumber(data.wins)} theme={theme} />
              <StatTile index={2} icon="close-circle-outline" label="Losses" value={formatNumber(data.losses)} theme={theme} />
              <StatTile index={3} icon="crown" label="3-crown wins" value={formatNumber(data.threeCrownWins)} theme={theme} />
              <StatTile index={4} icon="percent-outline" label="3-crown rate" value={threeCrownRate + '%'} theme={theme} />
              <StatTile index={5} icon="fire" label="Win streak" value={formatNumber(data.currentWinLoseStreak)} theme={theme} />
            </View>

            <AnimatedSection index={2} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="chart-donut" title="Battle performance" theme={theme} />
              <View style={styles.performanceNumbers}>
                <View>
                  <Text style={[styles.bigPercent, { color: theme.colors.onSurface }]}>{winRate.toFixed(1)}%</Text>
                  <Text style={[styles.smallMuted, { color: theme.colors.onSurfaceVariant }]}>Win rate</Text>
                </View>
                <View style={styles.performanceSide}>
                  <Text style={[styles.performanceLabel, { color: theme.colors.onSurfaceVariant }]}>Wins {formatNumber(wins)}</Text>
                  <Text style={[styles.performanceLabel, { color: theme.colors.onSurfaceVariant }]}>Losses {formatNumber(losses)}</Text>
                </View>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <View style={[styles.winBar, { width: `${winRate}%`, backgroundColor: theme.colors.primary }]} />
                <View style={[styles.lossBar, { width: `${lossRate}%`, backgroundColor: theme.colors.error }]} />
              </View>
              <View style={styles.barLegend}>
                <Text style={[styles.legendText, { color: theme.colors.primary }]}>Wins {winRate.toFixed(1)}%</Text>
                <Text style={[styles.legendText, { color: theme.colors.error }]}>Losses {lossRate.toFixed(1)}%</Text>
              </View>
            </Surface></AnimatedSection>

            <AnimatedSection index={3} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="sword-cross" title="Player information" theme={theme} />
              <InfoRow icon="account" label="Tag" value={data.tag || '—'} theme={theme} />
              <InfoRow icon="shield-account" label="Role" value={data.role || '—'} theme={theme} />
              <InfoRow icon="castle" label="Arena" value={displayedArenaName} theme={theme} />
              <InfoRow icon="numeric" label="Arena number" value={displayedArenaNumber || '—'} theme={theme} />
              <InfoRow icon="star-four-points" label="Experience level" value={formatNumber(data.expLevel)} theme={theme} />
              <InfoRow icon="star-circle" label="Collection level" value={formatNumber(data.collectionLevel)} theme={theme} />
              <InfoRow icon="star" label="Star points" value={formatNumber(data.starPoints)} theme={theme} />
              <InfoRow icon="database" label="Experience points" value={formatNumber(data.expPoints)} theme={theme} />
              <InfoRow icon="trophy-outline" label="Legacy trophy high score" value={formatNumber(data.legacyTrophyRoadHighScore)} theme={theme} />
            </Surface></AnimatedSection>

            <AnimatedSection index={4} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="sword" title="POL" subtitle="Path Of Legends" theme={theme} />
              <View style={styles.seasonTable}>
                <View style={styles.seasonHeader}>
                  <Text style={[styles.seasonHeaderText, styles.seasonHeaderFirst, { color: theme.colors.onSurfaceVariant }]}>Season</Text>
                  <Text style={[styles.seasonHeaderText, { color: theme.colors.onSurfaceVariant }]}>League</Text>
                  <Text style={[styles.seasonHeaderText, { color: theme.colors.onSurfaceVariant }]}>Ratings</Text>
                  <Text style={[styles.seasonHeaderText, styles.seasonHeaderLast, { color: theme.colors.onSurfaceVariant }]}>Rank</Text>
                </View>
                <View style={styles.seasonRow}>
                  <Text style={[styles.seasonText, styles.seasonTextFirst, { color: theme.colors.onSurface }]}>Current</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{formatLeagueNumber(currentPol?.leagueNumber)}</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{formatNumber(currentPol?.trophies)}</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{currentPol?.rank ? `#${formatNumber(currentPol.rank)}` : '—'}</Text>
                </View>
                <View style={styles.seasonRow}>
                  <Text style={[styles.seasonText, styles.seasonTextFirst, { color: theme.colors.onSurface }]}>Last</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{formatLeagueNumber(lastPol?.leagueNumber)}</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{formatNumber(lastPol?.trophies)}</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{lastPol?.rank ? `#${formatNumber(lastPol.rank)}` : '—'}</Text>
                </View>
                <View style={styles.seasonRow}>
                  <Text style={[styles.seasonText, styles.seasonTextFirst, { color: theme.colors.onSurface }]}>Best</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{formatLeagueNumber(bestPol?.leagueNumber)}</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{formatNumber(bestPol?.trophies)}</Text>
                  <Text style={[styles.seasonText, { color: theme.colors.onSurface }]}>{bestPol?.rank ? `#${formatNumber(bestPol.rank)}` : '—'}</Text>
                </View>
              </View>
            </Surface></AnimatedSection>

            <AnimatedSection index={5} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="account-group" title="Clan" theme={theme} />
              <View style={styles.clanHero}>
                <View style={[styles.clanBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="shield-account" size={28} color={theme.colors.onPrimaryContainer} />
                </View>
                <View style={styles.clanIdentity}>
                  <Text numberOfLines={1} style={[styles.clanName, { color: theme.colors.onSurface }]}>{data.clan?.name || 'No clan'}</Text>
                  <Text style={[styles.clanTag, { color: theme.colors.primary }]}>{data.clan?.tag || '—'}</Text>
                </View>
              </View>
              <InfoRow icon="shield-star" label="Badge ID" value={formatNumber(data.clan?.badgeId)} theme={theme} />
              <InfoRow icon="account-multiple" label="Role" value={data.role || '—'} theme={theme} />
              <InfoRow icon="gift" label="Donations" value={formatNumber(data.donations)} theme={theme} />
              <InfoRow icon="gift-outline" label="Donations received" value={formatNumber(data.donationsReceived)} theme={theme} />
              <InfoRow icon="gift-open" label="Total donations" value={formatNumber(data.totalDonations)} theme={theme} />
              <InfoRow icon="sword-cross" label="War day wins" value={formatNumber(data.warDayWins)} theme={theme} />
              <InfoRow icon="cards" label="Clan cards collected" value={formatNumber(data.clanCardsCollected)} theme={theme} />
            </Surface></AnimatedSection>

            <AnimatedSection index={6} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="cards" title="Current deck" right={`${currentDeck.length} cards`} theme={theme} />
              <View style={styles.deckGrid}>
                {currentDeck.map((card, index) => <CardItem key={card?.id ?? index} card={card} theme={theme} compact deck={currentDeck} index={index} />)}
              </View>
              {currentDeckSupport.length > 0 ? (
                <>
                  <Text style={[styles.subSectionTitle, { color: theme.colors.onSurfaceVariant }]}>Tower Card</Text>
                  <View style={styles.towerInfoRow}>
                    <View style={styles.towerCardSlot}>
                      {currentDeckSupport.map((card, index) => <CardItem key={card?.id ?? index} card={card} theme={theme} compact />)}
                    </View>
                    <View style={[styles.towerDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                    <View style={styles.deckStatsColumn}>
                      <View style={styles.deckBattleStatsGrid}>
                        {[
                          ['water', 'Avg Elixir:', getDeckAverages(currentDeck).avgElixir],
                          ['star-four-points', 'Avg Level:', getDeckAverages(currentDeck).avgLevel],
                          ['sword-cross', 'Games:', formatNumber(deckBattleStats.games)],
                          ['trophy', 'Wins:', formatNumber(deckBattleStats.wins)],
                          ['close-circle-outline', 'Losses:', formatNumber(deckBattleStats.losses)],
                          ['minus-circle-outline', 'Draws:', formatNumber(deckBattleStats.draws)],
                          ['percent', 'Win Rate:', `${deckBattleStats.winRate.toFixed(1)}%`],
                          ['crown', 'Crowns:', formatNumber(deckBattleStats.crowns)],
                          ['crown-outline', '3-CRN wins:', formatNumber(deckBattleStats.threeCrownWins)],
                          ['chart-line', 'Avg Crown:', deckBattleStats.avgCrowns],
                        ].map(([icon, label, value]) => (
                          <View key={label} style={styles.deckBattleStatItem}>
                            <MaterialCommunityIcons name={icon} size={13} color={theme.colors.primary} />
                            <View style={styles.deckBattleStatText}>
                              <Text style={[styles.deckBattleStatLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
                              <Text style={[styles.deckBattleStatValue, { color: theme.colors.onSurface }]}>{value}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                      <View style={styles.deckBattleStatsNote}>
                        <MaterialCommunityIcons name="information-outline" size={11} color={theme.colors.onSurfaceVariant} />
                        <Text style={[styles.deckBattleStatsNoteText, { color: theme.colors.onSurfaceVariant }]}>
                          Stats are based on the player's last 30 battles.
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : null}
            </Surface></AnimatedSection>

            <AnimatedSection index={7} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="cards-outline" title="Favourite card" theme={theme} />
              {favouriteCard ? (
                <View style={styles.favoriteRow}>
                  <CardItem card={favouriteCard} theme={theme} compact />
                  <View style={styles.favoriteDetails}>
                    <InfoRow icon="cards-heart" label="Name" value={favouriteCard.name || '—'} theme={theme} />
                    <InfoRow icon="diamond-stone" label="Rarity" value={favouriteCard.rarity || '—'} theme={theme} />
                    <InfoRow icon="lightning-bolt" label="Elixir" value={formatNumber(favouriteCard.elixirCost)} theme={theme} />
                    <InfoRow icon="star" label="Star level" value={formatNumber(favouriteCard.starLevel)} theme={theme} />
                  </View>
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No favourite card data.</Text>
              )}
            </Surface></AnimatedSection>

            <AnimatedSection index={8} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="archive" title="Card collection" right={`${cardCount} cards`} theme={theme} />
              <View style={styles.collectionSummary}>
                <StatTile icon="check-decagram" label="Max level" value={formatNumber(maxLevelCards)} theme={theme} />
                <StatTile icon="auto-fix" label="Evolved" value={formatNumber(evolvedCards)} theme={theme} />
              </View>
              <View style={styles.allCardsGrid}>
                {allCards.map((card, index) => <CardItem key={card?.id ?? index} card={card} theme={theme} />)}
              </View>
            </Surface></AnimatedSection>

            <AnimatedSection index={9} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="medal" title="Badges & achievements" right={`${badges.length}`} theme={theme} />
              {badges.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No badge data.</Text>
              ) : (
                <>
                  <View style={styles.badgesGrid}>
                    {badges.slice(0, 6).map((badge, index) => (
                      <BadgeItem key={badge?.name || badge?.id || index} badge={badge} theme={theme} />
                    ))}
                  </View>
                  {badges.length > 6 ? (
                    <Pressable
                      onPress={() => setShowAllBadges(true)}
                      style={[styles.viewAllButton, { backgroundColor: theme.colors.primaryContainer }]}
                    >
                      <Text style={[styles.viewAllText, { color: theme.colors.onPrimaryContainer }]}>
                        View all badges
                      </Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={18}
                        color={theme.colors.onPrimaryContainer}
                      />
                    </Pressable>
                  ) : null}
                </>
              )}
            </Surface></AnimatedSection>

            <AnimatedSection index={10} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer }]}>
              <SectionTitle icon="sword-cross" title="Battle log" right={battlelog.length ? `${battlelog.length} battles` : undefined} theme={theme} />
              {battleLoading ? (
                <View style={styles.battleLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : battlelog.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No battle log available.</Text>
              ) : (
                battlelog.map((battle, index) => (
                  <BattleRow key={battle?.battleTime || index} battle={battle} theme={theme} index={index} />
                ))
              )}
            </Surface></AnimatedSection>

            <View style={styles.bottomSpace} />
            </Animated.ScrollView>
          </DetailAnimationContext.Provider>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  back: { margin: 0 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  content: { padding: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingText: { marginTop: 10, fontSize: 13 },
  errorIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { marginTop: 12, fontSize: 17, fontWeight: '700' },
  errorText: { marginTop: 6, textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  retryText: { fontSize: 13, fontWeight: '700' },

  heroCard: { borderRadius: 24, padding: 16, marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { width: 64, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  heroLeagueIcon: { width: 42, height: 42 },
  heroIdentity: { flex: 1, marginLeft: 13 },
  heroName: { fontSize: 22, fontWeight: '800' },
  heroTag: { marginTop: 3, fontSize: 13, fontWeight: '700' },
  heroSub: { marginTop: 5, fontSize: 12 },
  heroStats: { flexDirection: 'row', marginTop: 18, gap: 10 },
  heroTrophy: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroBest: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroPointIcon: { width: 24, height: 24, marginRight: 8 },
  heroStatLabel: { fontSize: 11 },
  heroTrophyValue: { marginTop: 2, fontSize: 18, fontWeight: '800' },
  heroBestValue: { marginTop: 2, fontSize: 18, fontWeight: '800' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  statTile: { width: '31.5%', minHeight: 52, marginBottom: 7 },
  statTileInner: { flex: 1, minHeight: 52, borderRadius: 15, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  statIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  statImage: { width: 17, height: 17 },
  statContent: { flex: 1, minWidth: 0, alignItems: 'flex-start', justifyContent: 'center' },
  statLabel: { fontSize: 8.5, fontWeight: '600', textAlign: 'left' },
  statValue: { marginTop: 0, fontSize: 15, fontWeight: '900', letterSpacing: -0.2, textAlign: 'left' },

  sectionCard: { borderRadius: 22, padding: 14, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginLeft: 9, fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { marginLeft: 6, justifyContent: 'center' },
  sectionSubtitleLine: { fontSize: 8.5, lineHeight: 9, fontWeight: '600' },
  sectionRight: { marginLeft: 8, fontSize: 11 },

  performanceNumbers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigPercent: { fontSize: 28, fontWeight: '900' },
  smallMuted: { fontSize: 11, marginTop: 1 },
  performanceSide: { alignItems: 'flex-end', gap: 4 },
  performanceLabel: { fontSize: 12 },
  barTrack: { height: 12, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', marginTop: 14 },
  winBar: { height: '100%' },
  lossBar: { height: '100%' },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  legendText: { fontSize: 10.5, fontWeight: '700' },

  infoRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoLabel: { width: 112, fontSize: 11.5 },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 12.5, fontWeight: '700' },

  seasonTable: { borderRadius: 16, overflow: 'hidden' },
  seasonHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.035)' },
  seasonRow: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 10 },
  seasonHeaderText: { flex: 1, fontSize: 10.5, fontWeight: '700', textAlign: 'center' },
  seasonHeaderFirst: { textAlign: 'left' },
  seasonHeaderLast: { textAlign: 'center' },
  seasonText: { flex: 1, fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  seasonTextFirst: { textAlign: 'left' },

  clanHero: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  clanBadge: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  clanIdentity: { flex: 1, marginLeft: 11 },
  clanName: { fontSize: 16, fontWeight: '800' },
  clanTag: { marginTop: 3, fontSize: 12, fontWeight: '700' },

  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 11, rowGap: 9, alignItems: 'flex-start' },
  subSectionTitle: { marginTop: 15, marginBottom: 8, fontSize: 12, fontWeight: '700' },
  towerInfoRow: { position: 'relative', flexDirection: 'row', alignItems: 'stretch' },
  towerCardSlot: { position: 'absolute', left: 0, top: 0, width: '25%', minWidth: 0, flexShrink: 0 },
  towerDivider: { position: 'absolute', left: '30%', top: 0, bottom: 0, width: 1 },
  deckStatsColumn: { flex: 1, minWidth: 0, marginLeft: '30%' },
  deckBattleStatsGrid: { marginTop: 0, flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 8 },
  deckBattleStatItem: { width: '47%', flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  deckBattleStatText: { flex: 1, marginLeft: 6, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  deckBattleStatLabel: { fontSize: 9.5, fontWeight: '600' },
  deckBattleStatValue: { marginTop: 0, marginLeft: 3, fontSize: 12, fontWeight: '800' },
  deckBattleStatsNote: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4 },
  deckBattleStatsNoteText: { fontSize: 8, textAlign: 'center' },
  cardItem: { width: '22.2%', height: 120 },
  cardItemInner: { height: 120, borderRadius: 16, padding: 5 },
  compactCardItem: { width: '22.2%', height: 120 },
  compactCardItemInner: { height: 120, borderRadius: 16, padding: 5 },
  cardImage: { width: '100%', height: 82 },
  compactCardImage: { width: '100%', height: 84 },
  cardImageFallback: { width: '100%', height: 76, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardVisual: { position: 'relative' },
  cardOverlayMeta: { marginTop: 4, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  cardMetaPill: { width: 27, height: 15, borderRadius: 7.5, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 },
  cardLevel: { fontSize: 8, fontWeight: '800' },
  cardElixir: { fontSize: 8, fontWeight: '800' },

  favoriteRow: { flexDirection: 'row', alignItems: 'flex-start' },
  favoriteDetails: { flex: 1, marginLeft: 8 },
  collectionSummary: { flexDirection: 'row', gap: 9, marginBottom: 10 },
  allCardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  viewAllButton: { marginTop: 12, minHeight: 44, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  viewAllText: { fontSize: 12.5, fontWeight: '800' },
  badgesPageContent: { padding: 14, paddingBottom: 36 },
  badgesPageRow: { gap: 8, marginBottom: 8 },
  badgeItem: { width: '31.8%', minHeight: 150 },
  badgeItemInner: { flex: 1, minHeight: 150, borderRadius: 16, padding: 9, alignItems: 'center' },
  badgeImage: { width: 58, height: 58 },
  badgeName: { marginTop: 5, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  badgeLevel: { marginTop: 3, fontSize: 9.5, fontWeight: '800', textAlign: 'center' },
  badgeTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 7 },
  badgeFill: { height: '100%', borderRadius: 3 },
  badgeProgress: { marginTop: 3, fontSize: 8.5 },

  battleLoading: { paddingVertical: 20, alignItems: 'center' },
  battleRow: { minHeight: 58, borderRadius: 16, padding: 9, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  resultIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  battleMain: { flex: 1, marginLeft: 9 },
  battleMode: { fontSize: 12.5, fontWeight: '700' },
  battleDate: { marginTop: 3, fontSize: 10 },
  battleScore: { marginLeft: 8, fontSize: 13, fontWeight: '900' },

  emptyText: { fontSize: 12, lineHeight: 18 },
  bottomSpace: { height: 50 },
});
