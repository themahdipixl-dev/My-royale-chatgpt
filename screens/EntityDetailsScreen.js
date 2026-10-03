// * screens/EntityDetailsScreen.js — full player details page (v83)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Animated,
  LayoutAnimation,
  BackHandler,
  Platform,
  UIManager,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { fetchPlayer, fetchPlayerBattlelog } from '../api/client';
import { getClanBadgeImage } from '../utils/clanBadges';
import { getPlayerLeagueImage } from '../utils/playerLeagueassets';
import RetryImage from '../components/RetryImage';
const pointIcon = require('../assets/Point-icon.png');
const loadedBadgeImageUris = new Set();

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatGameDisplayName(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  let name = String(value).trim();
  if (!name) return fallback;

  name = name
    .replace(/[_-]+/g, ' ')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9]+)/g, '$1 $2')
    .replace(/([0-9]+)([A-Za-z])/g, '$1 $2')
    .replace(/\\s+/g, ' ')
    .trim();

  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      if (/^[0-9]+(?:v[0-9]+)?$/i.test(word)) return word.toLowerCase().replace(/v/g, 'v');
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
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
  const hasAnimated = useRef(false);
  const checkRef = useRef(null);
  const idRef = useRef({}).current;

  const animateIn = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    opacity.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(0);
    translateY.setValue(14);
    scale.setValue(1);
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

  if (!animation) {
    return <View style={layoutStyle}>{children}</View>;
  }

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

function AnimatedSection({ children, index = 0, register, onLayout }) {
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
        onLayout?.(event);
        requestAnimationFrame(() => checkRef.current?.());
      }}
      style={{ opacity }}
    >
      {children}
    </Animated.View>
  );
}
function SectionTitle({ icon, title, subtitle, right, theme, noBottomMargin = false }) {
  return (
    <View style={[styles.sectionTitleRow, noBottomMargin && { marginBottom: 0 }]}>
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

function TowerCardInfoHint({ theme }) {
  return (
    <View style={styles.towerCardNoteInline}>
      <MaterialCommunityIcons
        name="information-outline"
        size={13}
        color={theme.colors.onSurfaceVariant}
      />
      <Text style={[styles.towerCardNoteText, { color: theme.colors.onSurfaceVariant }]}>
        Stats are based on the player's last 30 battles.
      </Text>
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

function InfoRow({ index = 0, icon, label, value, theme, onPress }) {
  return (
    <AnimatedDetailItem index={index}>
      <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={19} color={theme.colors.primary} />
      <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      {onPress ? (
        <Pressable
          onPress={onPress}
          onLongPress={onPress}
          delayLongPress={350}
          style={styles.infoValuePressable}
          hitSlop={4}
        >
          <Text
            selectable
            numberOfLines={1}
            style={[styles.infoValue, { color: theme.colors.onSurface }]}
          >
            {value}
          </Text>
          <MaterialCommunityIcons name="content-copy" size={14} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      ) : (
        <Text numberOfLines={1} style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
      )}
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


  const CARD_RARITY_ORDER = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    champion: 5,
  };

const CARD_LEVEL_OFFSETS = {
  common: 0,
  rare: 2,
  epic: 5,
  legendary: 8,
  champion: 10,
};

function getDisplayCardLevel(card) {
  const level = Number(card?.level);
  if (!Number.isFinite(level)) return null;
  const rarity = String(card?.rarity ?? '').trim().toLowerCase();
  return level + (CARD_LEVEL_OFFSETS[rarity] ?? 0);
}

function normalizeCardName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\\s+/g, ' ');
}

function resolveFavouriteCardLevel(favouriteCard, playerCards) {
  if (!favouriteCard || !Array.isArray(playerCards)) return favouriteCard;

  const favouriteName = normalizeCardName(favouriteCard.name);
  if (!favouriteName) return favouriteCard;

  const playerCard = playerCards.find(
    (card) => normalizeCardName(card?.name) === favouriteName,
  );

  if (!playerCard) return favouriteCard;

  return {
    ...favouriteCard,
    level: playerCard.level,
    rarity: favouriteCard.rarity || playerCard.rarity,
  };
}

function openCurrentDeckInClashRoyale(deck) {
  const cards = Array.isArray(deck) ? deck : [];
  const cardIds = cards
    .map((card) => card?.id)
    .filter((id) => id !== undefined && id !== null);

  if (cardIds.length !== 8) return;

  const deckLink = `https://link.clashroyale.com/deck/en?deck=${cardIds.join(';')}`;
  Linking.openURL(deckLink).catch(() => {});
}

function getDeckAverages(deck) {
  const cards = Array.isArray(deck) ? deck : [];
  const elixirs = cards.map((card) => Number(card?.elixirCost)).filter(Number.isFinite);
  const levels = cards.map(getDisplayCardLevel).filter(Number.isFinite);
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

function CardCollectionFilterTile({ type, icon, label, value, selected, onPress, theme, animation }) {
  const progress = animation[type];
  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', type === 'heroes' ? '#FFD54F' : '#AB47BC'],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  });

  return (
    <Pressable onPress={onPress} style={styles.collectionFilterPressable}>
      <Animated.View
        style={[
          styles.collectionFilterTile,
          {
            backgroundColor: theme.colors.surfaceContainerHighest,
            borderColor,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.statIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name={icon} size={21} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={styles.statContent}>
          <Text numberOfLines={1} style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function CardSortControls({ sortBy, setSortBy, ascending, setAscending, theme }) {
  const [open, setOpen] = useState(false);
  const menuProgress = useRef(new Animated.Value(0)).current;

  const options = [
    { key: 'name', label: 'By name' },
    { key: 'level', label: 'By level' },
    { key: 'rarity', label: 'By rarity' },
    { key: 'elixir', label: 'By elixir' },
  ];

  const toggleMenu = () => {
    const nextOpen = !open;
    if (nextOpen) {
      setOpen(true);
      menuProgress.setValue(0);
      Animated.spring(menuProgress, {
        toValue: 1,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuProgress, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setOpen(false);
      });
    }
  };

  const selectOption = (key) => {
    Animated.timing(menuProgress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setOpen(false);
        setSortBy(key);
      }
    });
  };

  const selectedOption = options.find((option) => option.key === sortBy);
  const selectedLabel = selectedOption?.label ?? 'Sort by';

  return (
    <View style={styles.cardSortControls}>
      {open ? (
        <Pressable
          onPress={() => {
            Animated.timing(menuProgress, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) setOpen(false);
            });
          }}
          style={styles.cardSortDismissArea}
        />
      ) : null}

      <Pressable
        onPress={() => setAscending(!ascending)}
        style={({ pressed }) => [
          styles.cardSortDirection,
          {
            backgroundColor: theme.colors.primaryContainer,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
        accessibilityLabel={ascending ? 'Descending' : 'Ascending'}
      >
        <View style={styles.cardSortTriangle}>
          <MaterialCommunityIcons
            name={ascending ? 'triangle-down' : 'triangle'}
            size={12}
            color={theme.colors.onPrimaryContainer}
          />
        </View>
      </Pressable>

      <View style={styles.cardSortMenuWrap}>
        <Pressable
          onPress={toggleMenu}
          style={({ pressed }) => [
            styles.cardSortCapsule,
            {
              backgroundColor: theme.colors.primaryContainer,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <Text style={[styles.cardSortText, { color: theme.colors.onPrimaryContainer }]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <MaterialCommunityIcons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={theme.colors.onPrimaryContainer}
          />
        </Pressable>

        {open ? (
          <Animated.View
            style={[
              styles.cardSortDropdown,
              {
                backgroundColor: theme.colors.surfaceContainerHigh,
                opacity: menuProgress,
                transform: [
                  {
                    translateY: menuProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-7, 0],
                    }),
                  },
                  {
                    scale: menuProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {options.map((option, index) => (
              <Pressable
                key={option.key}
                onPress={() => selectOption(option.key)}
                style={({ pressed }) => [
                  styles.cardSortOption,
                  { opacity: pressed ? 0.68 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.cardSortOptionText,
                    {
                      color: option.key === sortBy
                        ? theme.colors.primary
                        : theme.colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {index < options.length - 1 ? (
                  <View
                    style={[
                      styles.cardSortDivider,
                      { backgroundColor: theme.colors.outlineVariant },
                    ]}
                  />
                ) : null}
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
function CardItem({ index = 0, card, theme, compact = false, deck, tower = false, grid = false, collectionFilter = null }) {
  const image = deck
    ? resolveCurrentDeckImage(card, index, deck)
    : collectionFilter === 'heroes'
      ? (card?.iconUrls?.heroMedium || card?.iconUrls?.medium)
      : collectionFilter === 'evolutions'
        ? (card?.iconUrls?.evolutionMedium || card?.iconUrls?.medium)
        : (card?.iconUrls?.medium || card?.iconUrls?.evolutionMedium || card?.iconUrls?.heroMedium);
  const cardLayoutStyle = [
    styles.cardItem,
    compact && styles.compactCardItem,
    tower && styles.towerCardItem,
    grid && index % 4 !== 3 && styles.cardGridGap,
  ];

  const rarity = String(card?.rarity ?? '').trim().toLowerCase();
  const rarityColor = {
    common: '#42A5F5',
    rare: '#FF9800',
    epic: '#AB47BC',
    legendary: '#66BB6A',
    champion: '#FFD54F',
  }[rarity] || null;

  const cardBody = (
    <View
      style={[
        styles.cardItemInner,
        compact && styles.compactCardItemInner,
        {
          backgroundColor: theme.colors.surfaceContainerHighest,
          ...(rarityColor
            ? {
                borderWidth: 1,
                borderColor: rarityColor,
              }
            : null),
        },
      ]}
    >
      <View style={styles.cardVisual}>
        {image ? (
          <RetryImage
            uri={image}
            style={compact ? styles.compactCardImage : styles.cardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.cardImageFallback, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="cards-outline"
              size={28}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
        )}
        <View style={styles.cardOverlayMeta}>
          <View style={[styles.cardMetaPill, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.cardLevel, { color: theme.colors.onPrimaryContainer }]}>
              L {getDisplayCardLevel(card) ?? '—'}
            </Text>
          </View>
          {card?.elixirCost !== undefined ? (
            <View style={[styles.cardMetaPill, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="water"
                size={9}
                color={theme.colors.onPrimaryContainer}
              />
              <Text style={[styles.cardElixir, { color: theme.colors.onPrimaryContainer }]}>
                {card.elixirCost}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  const decoratedCardContent = cardBody;

  return grid ? (
    <View style={cardLayoutStyle}>{decoratedCardContent}</View>
  ) : (
    <AnimatedDetailItem index={index} layoutStyle={cardLayoutStyle}>{decoratedCardContent}</AnimatedDetailItem>
  );
}

function getBadgePriority(badge) {
  const name = String(badge?.name ?? '').trim().toLowerCase();

  // Mastery badges are always the final group.
  if (name.startsWith('mastery') || name.includes('mastery')) return 99;

  // Clash Royale's current collection categories:
  // Champion → Annual → Normal → Merge Tactics → Archived.
  if (name.includes('champion')) return 0;
  if (/20\\d{2}/.test(name) || name.includes('yearbadge') || name.includes('annual') || name.includes('season')) return 1;
  if (name.includes('merge') || name.includes('tactics') || name.includes('autochess')) return 3;
  if (name.includes('archived') || name.includes('legacy')) return 4;
  return 2;
}

function sortBadgesByGameCategory(badges) {
  const items = Array.isArray(badges) ? [...badges] : [];

  items.sort((a, b) => {
    const categoryComparison = getBadgePriority(a) - getBadgePriority(b);
    if (categoryComparison !== 0) return categoryComparison;

    // The API does not expose badge rarity/official priority as a field.
    // Within a category, show the most progressed upgradeable badges first.
    const levelA = Number(a?.level);
    const levelB = Number(b?.level);
    const hasLevelA = Number.isFinite(levelA);
    const hasLevelB = Number.isFinite(levelB);

    if (hasLevelA !== hasLevelB) return hasLevelA ? -1 : 1;
    if (hasLevelA && levelA !== levelB) return levelB - levelA;

    const targetA = Number(a?.target);
    const targetB = Number(b?.target);
    const progressA = Number(a?.progress);
    const progressB = Number(b?.progress);
    const ratioA = Number.isFinite(targetA) && targetA > 0 && Number.isFinite(progressA)
      ? progressA / targetA
      : -1;
    const ratioB = Number.isFinite(targetB) && targetB > 0 && Number.isFinite(progressB)
      ? progressB / targetB
      : -1;

    if (ratioA !== ratioB) return ratioB - ratioA;

    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''));
  });

  return items;
}

function MissingBadgeIcon({ theme, size = 42, crownColor }) {
  const iconSize = Math.max(18, Math.round(size * 0.84));

  return (
    <View
      style={[
        styles.missingBadgeIcon,
        {
          width: size,
          height: size,
          overflow: 'hidden',
        },
      ]}
    >
      <MaterialCommunityIcons
        name="hexagon-outline"
        size={iconSize}
        color={theme.colors.primaryContainer}
      />
      <MaterialCommunityIcons
        name="crown"
        size={Math.max(12, Math.round(size * 0.38))}
        color={crownColor || theme.colors.primaryContainer}
        style={styles.missingBadgeCrown}
      />
    </View>
  );
}

function BadgeVisual({ item, theme, size = 58, crownColor }) {
  const imageCandidates = useMemo(() => {
    const urls = item?.iconUrls || {};
    return [urls.large, urls.medium, urls.small].filter(
      (url, candidateIndex, list) => Boolean(url) && list.indexOf(url) === candidateIndex,
    );
  }, [item]);

  const [imageIndex, setImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    setImageIndex(0);
    const firstUri = imageCandidates[0] || null;
    setImageLoaded(Boolean(firstUri && loadedBadgeImageUris.has(firstUri)));
  }, [item, imageCandidates]);

  const image = imageCandidates[imageIndex] || null;

  return (
    <View style={[styles.badgeVisual, { width: size, height: size }]}>
      {!imageLoaded ? <MissingBadgeIcon theme={theme} size={size} crownColor={crownColor} /> : null}
      {image ? (
        <RetryImage
          uri={image}
          style={[styles.badgeImage, { width: size, height: size }]}
          resizeMode="contain"
          onLoad={() => {
            loadedBadgeImageUris.add(image);
            setImageLoaded(true);
          }}
          onExhausted={() => {
            setImageLoaded(false);
            setImageIndex((current) => (
              current + 1 < imageCandidates.length ? current + 1 : current
            ));
          }}
        />
      ) : null}
    </View>
  );
}

function BadgeItem({ index = 0, badge, theme, playerDetailsGrid = false, activeBadgeKey = null, onToggleBadgePopup }) {
  const progress = number(badge?.progress);
  const target = number(badge?.target);
  const ratio = target > 0 ? Math.min(1, progress / target) : 0;
  const badgeKey = String(badge?.name || badge?.id || index);
  const popupVisible = playerDetailsGrid && activeBadgeKey === badgeKey;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const [popupMounted, setPopupMounted] = useState(false);

  useEffect(() => {
    if (!playerDetailsGrid) return undefined;

    if (popupVisible) {
      setPopupMounted(true);
      popupOpacity.stopAnimation();
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }).start();
    } else if (popupMounted) {
      popupOpacity.stopAnimation();
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setPopupMounted(false);
      });
    }

    return undefined;
  }, [playerDetailsGrid, popupVisible, popupMounted, popupOpacity]);

  const content = (
    <Pressable
      onPress={() => onToggleBadgePopup?.(popupVisible ? null : badgeKey)}
      style={styles.badgePressable}
    >
      <View style={[
        styles.badgeItemInner,
        { backgroundColor: theme.colors.surfaceContainerHighest },
        popupVisible && styles.badgeItemActive,
      ]}>
        <BadgeVisual item={badge} theme={theme} size={96} />

        {popupMounted ? (
          <Animated.View
            style={[
              styles.badgeInfoPopup,
              {
                backgroundColor: theme.colors.surfaceContainerHighest,
                borderColor: theme.colors.outlineVariant,
                opacity: popupOpacity,
              },
            ]}
          >
            <Text numberOfLines={2} style={[styles.badgePopupName, { color: theme.colors.onSurface }]}>
              {formatGameDisplayName(badge?.name, 'Badge')}
            </Text>
            <Text style={[styles.badgePopupLevel, { color: theme.colors.primary }]}>
              {badge?.level != null
                ? `Level ${badge.level}${badge?.maxLevel ? ` / ${badge.maxLevel}` : ''}`
                : 'Achievement'}
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
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <AnimatedDetailItem
      index={index}
      layoutStyle={[
        playerDetailsGrid ? styles.badgeItemPlayerDetails : styles.badgeItem,
        popupVisible && styles.badgeItemPopupActive,
      ]}
    >
      {content}
    </AnimatedDetailItem>
  );
}

function formatBattleMode(battle) {
  const raw = firstValue(
    battle?.gameMode?.name,
    battle?.gameMode?.id,
    battle?.type,
    battle?.arena?.name,
    'Battle',
  );
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'team vs team' || normalized === 'teamvsteam' || normalized === '2v2') return '2v2';
  if (normalized === 'ladder' || normalized === 'trophyroad') return 'Ladder';
  if (normalized === 'ranked' || normalized.includes('ranked')) return 'Ranked';
  if (normalized === 'friendly' || normalized.includes('friendly')) return 'Friendly';
  return formatGameDisplayName(raw, 'Battle');
}

function getBattlePlayedAt(battle) {
  const raw = firstValue(
    battle?.utcTime,
    battle?.battleTime,
    battle?.createdDate,
    battle?.date,
  );
  if (raw === undefined || raw === null || raw === '') return null;

  if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return null;
    return new Date(numeric < 1e12 ? numeric * 1000 : numeric);
  }

  const normalized = String(raw).trim().replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z?$/,
    function (_, year, month, day, hour, minute, second, fraction) {
      return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + '.' + (fraction || '000') + 'Z';
    },
  );
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBattleAge(value) {
  const date = value instanceof Date ? value : null;
  if (!date) return '—';

  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getBattleDeck(player) {
  return Array.isArray(player?.cards) ? player.cards.slice(0, 8) : [];
}

function getBattleTowerCard(player) {
  const candidates = [
    ...(Array.isArray(player?.supportCards) ? player.supportCards : []),
    ...(Array.isArray(player?.towerCards) ? player.towerCards : []),
  ];
  return candidates[0] || null;
}

function getBattleTrophyChange(player) {
  const value = firstValue(player?.trophyChange, player?.trophiesChange, player?.trophyDelta);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBattleTrophies(player) {
  const direct = firstValue(player?.trophies, player?.currentTrophies, player?.startingTrophies, player?.startTrophies);
  const parsed = Number(direct);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBattleModeImage(battle) {
  return firstValue(
    battle?.gameMode?.iconUrls?.medium,
    battle?.gameMode?.iconUrls?.small,
    battle?.gameMode?.iconUrl,
    battle?.mode?.iconUrls?.medium,
    battle?.mode?.iconUrls?.small,
    battle?.mode?.iconUrl,
  );
}

function getExplicitBattleCardKind(card) {
  const rawKind = firstValue(card?.cardType, card?.cardKind, card?.variant, card?.form, card?.typeName);
  if (typeof rawKind === 'string') {
    const kind = rawKind.toLowerCase();
    if (kind.includes('hero')) return 'hero';
    if (kind.includes('evolution') || kind.includes('evo')) return 'evolution';
    if (kind.includes('normal') || kind.includes('standard') || kind === 'card') return 'normal';
  }
  if (card?.isHero === true || card?.hero === true || Number(card?.heroLevel) > 0) return 'hero';
  if (card?.isEvolution === true || card?.evolution === true || Number(card?.evolutionLevel) > 0) return 'evolution';
  return null;
}

function resolveBattleCardImage(card, index, deck) {
  if (!card) return null;
  const explicitKind = getExplicitBattleCardKind(card);
  const urls = card?.iconUrls || {};
  if (explicitKind === 'hero') return firstValue(urls.heroMedium, urls.medium, urls.small, card?.iconUrl);
  if (explicitKind === 'evolution') return firstValue(urls.evolutionMedium, urls.medium, urls.small, card?.iconUrl);
  if (explicitKind === 'normal') return firstValue(urls.medium, urls.small, urls.large, card?.iconUrl);
  return resolveCurrentDeckImage(card, index, deck);
}

function BattleCardImage({ card, theme, size = 42, index = 0, deck = [] }) {
  const image = resolveBattleCardImage(card, index, deck);
  return (
    <View style={[styles.battleCard, { width: size, height: Math.round(size * 1.22) }]}>
      {image ? (
        <RetryImage uri={image} style={styles.battleCardImage} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name="cards-outline" size={Math.round(size * 0.48)} color={theme.colors.onSurfaceVariant} />
      )}
    </View>
  );
}

function BattleDeck({ player, theme, mirrored = false, onCopy, onSave, saved }) {
  const deck = getBattleDeck(player);
  const towerCard = getBattleTowerCard(player);
  const average = getDeckAverages(deck).avgElixir;
  const cards = Array.from({ length: 8 }, (_, index) => deck[index] || null);

  return (
    <View style={[styles.battleSide, mirrored && styles.battleSideMirrored]}>
      <View style={styles.battleCardsGrid}>
        {cards.map((card, index) => (
          <BattleCardImage
            key={card?.id ?? card?.name ?? index}
            card={card}
            theme={theme}
            size={39}
            index={index}
            deck={deck}
          />
        ))}
      </View>
      <View style={[styles.battleDeckTools, mirrored && styles.battleDeckToolsMirrored]}>
        <View style={styles.battleTowerTool}>
          {towerCard ? (
            <BattleCardImage card={towerCard} theme={theme} size={39} />
          ) : (
            <MaterialCommunityIcons name="shield-outline" size={20} color={theme.colors.onSurfaceVariant} />
          )}
        </View>
        <Pressable onPress={onCopy} disabled={deck.length !== 8} style={({ pressed }) => [
          styles.battleToolButton,
          {
            backgroundColor: theme.colors.primaryContainer,
            opacity: deck.length === 8 ? (pressed ? 0.55 : 1) : 0.4,
          },
        ]} accessibilityLabel="Copy battle deck">
          <MaterialCommunityIcons name="content-copy" size={16} color={theme.colors.onPrimaryContainer} />
        </Pressable>
        <Pressable onPress={onSave} disabled={deck.length !== 8} style={({ pressed }) => [
          styles.battleToolButton,
          {
            backgroundColor: theme.colors.primaryContainer,
            opacity: deck.length === 8 ? (pressed ? 0.55 : 1) : 0.4,
          },
        ]} accessibilityLabel={saved ? "Remove saved battle deck" : "Save battle deck"}>
          <MaterialCommunityIcons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={16}
            color={theme.colors.onPrimaryContainer}
          />
        </Pressable>
        <View style={styles.battleElixirPill}>
          <MaterialCommunityIcons name="water" size={13} color={theme.colors.onPrimaryContainer} />
          <Text style={[styles.battleElixirText, { color: theme.colors.onPrimaryContainer }]}>{average}</Text>
        </View>
      </View>
    </View>
  );
}

function BattleRow({ battle, theme, index, expanded, onToggle, onCopyDeck, onSaveDeck, savedLeft, savedRight }) {
  const team = Array.isArray(battle?.team) ? battle.team : [];
  const opponent = Array.isArray(battle?.opponent) ? battle.opponent : [];
  const teamCrowns = team.reduce((sum, p) => sum + number(p?.crowns ?? p?.crownsEarned), 0);
  const opponentCrowns = opponent.reduce((sum, p) => sum + number(p?.crowns ?? p?.crownsEarned), 0);
  const won = teamCrowns > opponentCrowns;
  const draw = teamCrowns === opponentCrowns;
  const mode = formatBattleMode(battle);
  const modeImage = getBattleModeImage(battle);
  const playedAt = getBattlePlayedAt(battle);
  const leftPlayer = team[0] || {};
  const rightPlayer = opponent[0] || {};
  const leftChange = getBattleTrophyChange(leftPlayer);
  const rightChange = getBattleTrophyChange(rightPlayer);
  const leftTrophies = getBattleTrophies(leftPlayer);
  const rightTrophies = getBattleTrophies(rightPlayer);
  const hasTrophyInfo = leftTrophies !== null || rightTrophies !== null || leftChange !== null || rightChange !== null;
  const resultText = String(teamCrowns) + " : " + String(opponentCrowns);
  const battleKey = String(playedAt?.getTime() || "battle") + "-" + String(index);

  const leftAccent = teamCrowns > opponentCrowns ? "#35D07F" : teamCrowns < opponentCrowns ? "#FF5C67" : theme.colors.primary;
  const rightAccent = opponentCrowns > teamCrowns ? "#35D07F" : opponentCrowns < teamCrowns ? "#FF5C67" : theme.colors.primary;

  const renderTrophy = (trophies, change, side) => {
    if (trophies === null && change === null) return null;
    const positive = Number(change) > 0;
    const negative = Number(change) < 0;
    const accent = positive ? "#35D07F" : negative ? "#FF5C67" : theme.colors.onSurfaceVariant;
    return (
      <View style={[styles.battleTrophyCluster, side === "right" && styles.battleTrophyClusterRight]}>
        {trophies !== null ? (
          <View style={[styles.battleTrophyValue, { borderColor: accent }]}>
            <Image source={pointIcon} style={styles.battleTrophyIcon} resizeMode="contain" />
            <Text style={[styles.battleTrophyText, { color: theme.colors.onSurface }]}>{formatNumber(trophies)}</Text>
          </View>
        ) : null}
        {change !== null ? (
          <View style={[styles.battleTrophyChange, { borderColor: accent }]}>
            <Text style={[styles.battleTrophyChangeText, { color: accent }]}>
              {change > 0 ? "+" : ""}{formatNumber(change)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const innerCard = (
    <View style={[styles.battleRowInner, !expanded && styles.battleRowInnerCollapsed, expanded && styles.battleRowInnerExpanded, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      <View style={[styles.battleHeader, expanded && styles.battleHeaderExpanded]}>
        <View style={styles.battlePlayerBlock}>
          {hasTrophyInfo ? renderTrophy(leftTrophies, leftChange, "left") : null}
          <Text numberOfLines={1} style={[styles.battlePlayerName, { color: theme.colors.onSurface }]}>
            {firstValue(leftPlayer?.name, "Player")}
          </Text>
          <Text numberOfLines={1} style={[styles.battlePlayerClan, { color: theme.colors.onSurfaceVariant }]}>
            {firstValue(leftPlayer?.clan?.name, leftPlayer?.clan?.tag, "—")}
          </Text>
        </View>

        <View style={styles.battleCenterHeader}>
          {modeImage ? (
            <RetryImage uri={modeImage} style={styles.battleModeImage} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name="gamepad-variant-outline" size={23} color={theme.colors.primary} />
          )}
          <Text numberOfLines={1} style={[styles.battleRankedLabel, { color: theme.colors.onSurface }]}>Ranked</Text>
        </View>

        <View style={[styles.battlePlayerBlock, styles.battlePlayerBlockRight]}>
          {hasTrophyInfo ? renderTrophy(rightTrophies, rightChange, "right") : null}
          <Text numberOfLines={1} style={[styles.battlePlayerName, { color: theme.colors.onSurface }]}>
            {firstValue(rightPlayer?.name, "Player")}
          </Text>
          <Text numberOfLines={1} style={[styles.battlePlayerClan, { color: theme.colors.onSurfaceVariant }]}>
            {firstValue(rightPlayer?.clan?.name, rightPlayer?.clan?.tag, "—")}
          </Text>
        </View>
      </View>

      {!expanded ? (
        <>
          <View style={styles.battleCollapsedMeta}>
            <View style={[styles.battleResultBadge, { backgroundColor: draw ? theme.colors.surfaceContainer : won ? "#35D07F" : "#FF5C67" }]}>
              <Text style={styles.battleResultBadgeText}>{resultText}</Text>
            </View>
          </View>
          <View style={styles.battleCollapsedTimeRow}>
            <Text style={[styles.battleCollapsedTime, { color: theme.colors.onSurfaceVariant }]}>{formatBattleAge(playedAt)}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.battleExpandedDeckRow}>
            <BattleDeck
              player={leftPlayer}
              theme={theme}
              onCopy={() => onCopyDeck(getBattleDeck(leftPlayer), battleKey + "-left")}
              onSave={() => onSaveDeck(battleKey + "-left")}
              saved={savedLeft}
            />
            <View style={styles.battleExpandedDivider}>
              <View style={[styles.battleResultBadge, { backgroundColor: draw ? theme.colors.surfaceContainer : won ? "#35D07F" : "#FF5C67" }]}>
                <Text style={styles.battleResultBadgeText}>{resultText}</Text>
              </View>
            </View>
            <BattleDeck
              player={rightPlayer}
              theme={theme}
              mirrored
              onCopy={() => onCopyDeck(getBattleDeck(rightPlayer), battleKey + "-right")}
              onSave={() => onSaveDeck(battleKey + "-right")}
              saved={savedRight}
            />
          </View>
          <View style={styles.battleFooter}>
            <Text style={[styles.battleDate, { color: theme.colors.onSurfaceVariant }]}>{formatBattleAge(playedAt)}</Text>
          </View>
        </>
      )}

      <Pressable onPress={onToggle} style={({ pressed }) => [
        styles.battleChevronButton,
        !expanded && styles.battleChevronButtonCollapsed,
        { opacity: pressed ? 0.5 : 1 },
      ]} accessibilityLabel={expanded ? "Collapse battle details" : "Expand battle details"}>
        <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );

  return (
    <AnimatedDetailItem index={index}>
      <LinearGradient colors={[leftAccent, rightAccent]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.battleRowGradient}>
        {innerCard}
      </LinearGradient>
    </AnimatedDetailItem>
  );
}

function sortCardList(cards, sortBy, ascending) {
  const items = Array.isArray(cards) ? [...cards] : [];
  const direction = ascending ? 1 : -1;

  const getSortValue = (card) => {
    if (sortBy === 'name') return String(card?.name ?? '').toLowerCase();
    if (sortBy === 'level') return number(getDisplayCardLevel(card));
    if (sortBy === 'rarity') return CARD_RARITY_ORDER[String(card?.rarity ?? '').toLowerCase()] ?? 99;
    if (sortBy === 'elixir') return number(card?.elixirCost);
    return 0;
  };

  items.sort((a, b) => {
    const av = getSortValue(a);
    const bv = getSortValue(b);

    let comparison = 0;
    if (typeof av === 'string' && typeof bv === 'string') {
      comparison = av < bv ? -1 : av > bv ? 1 : 0;
    } else {
      comparison = av - bv;
      if (!Number.isFinite(comparison)) comparison = 0;
    }

    if (comparison === 0) {
      const an = String(a?.name ?? '').toLowerCase();
      const bn = String(b?.name ?? '').toLowerCase();
      comparison = an < bn ? -1 : an > bn ? 1 : 0;
    }

    return comparison * direction;
  });

  return items;
}

function EntityDetailsScreen({ entity, type = 'player', onBack }) {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(18)).current;
  const entranceScale = useRef(new Animated.Value(0.97)).current;
  const scrollRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [battlelog, setBattlelog] = useState([]);
  const [loading, setLoading] = useState(type === 'player');
  const [refreshing, setRefreshing] = useState(false);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleError, setBattleError] = useState(null);
  const battlelogLoadingRef = useRef(false);
  const [error, setError] = useState(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [activeBadgeKey, setActiveBadgeKey] = useState(null);
  const [showCopyDeckModal, setShowCopyDeckModal] = useState(false);
  const [copyDeckTarget, setCopyDeckTarget] = useState(null);
  const [expandedBattles, setExpandedBattles] = useState({});
  const [savedBattleDecks, setSavedBattleDecks] = useState({});
  const [cardSortBy, setCardSortBy] = useState('name');
  const [cardSortAscending, setCardSortAscending] = useState(false);

  const [cardCollectionFilter, setCardCollectionFilter] = useState(null);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const cardsExpandProgress = useRef(new Animated.Value(0)).current;
  const cardCollectionOffsetY = useRef(0);
  const cardCollectionContentY = useRef(0);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const achievementsExpandProgress = useRef(new Animated.Value(0)).current;
  const achievementContentY = useRef(0);
  const [battleLogExpanded, setBattleLogExpanded] = useState(false);
  const battleLogExpandProgress = useRef(new Animated.Value(0)).current;
  const filterStrokeProgress = useRef({
    evolutions: new Animated.Value(0),
    heroes: new Animated.Value(0),
  }).current;
  const copyDeckModalOpacity = useRef(new Animated.Value(0)).current;
  const copyDeckModalScale = useRef(new Animated.Value(0.92)).current;
  const copyDeckModalY = useRef(new Animated.Value(18)).current;

  const isClan = type === 'clan';
  const tag = firstValue(entity?.tag, entity?.playerTag);

  const animatedItems = useRef(new Map()).current;
  const scrollYRef = useRef(0);
  const headerScrollY = useRef(new Animated.Value(0)).current;
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

  const detailsScrollHandler = useMemo(
    () => Animated.event(
      [{ nativeEvent: { contentOffset: { y: headerScrollY } } }],
      { useNativeDriver: true, listener: handleDetailsScroll },
    ),
    [headerScrollY, handleDetailsScroll],
  );

  const headerDetailsOpacity = headerScrollY.interpolate({
    inputRange: [18, 72],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const headerPlayerOpacity = headerScrollY.interpolate({
    inputRange: [30, 82],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const headerPlayerTranslateY = headerScrollY.interpolate({
    inputRange: [30, 82],
    outputRange: [7, 0],
    extrapolate: 'clamp',
  });
  const headerPlayerScale = headerScrollY.interpolate({
    inputRange: [30, 82],
    outputRange: [0.94, 1],
    extrapolate: 'clamp',
  });

  const playEntranceAnimation = useCallback(() => {
    entrance.stopAnimation();
    entranceY.stopAnimation();
    entranceScale.stopAnimation();

    entrance.setValue(0);
    entranceY.setValue(18);
    entranceScale.setValue(0.97);

    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(entranceY, {
        toValue: 0,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        friction: 9,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entrance, entranceY, entranceScale]);

  useEffect(() => {
    playEntranceAnimation();
  }, [playEntranceAnimation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showAllBadges) {
        setShowAllBadges(false);
        return true;
      }
      onBack?.();
      return true;
    });
    return () => subscription.remove();
  }, [onBack, showAllBadges]);

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
        if (cancelled) return;
        setPlayer(data);
        // Start Battle Log only after the player request has completed.
        // This avoids firing both Worker requests simultaneously on first entry.
        loadBattlelog();
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
  }, [isClan, tag, loadBattlelog]);

  const loadBattlelog = useCallback(() => {
    if (isClan || !tag || battlelogLoadingRef.current) return;

    battlelogLoadingRef.current = true;
    setBattleLoading(true);
    setBattleError(null);

    fetchPlayerBattlelog(tag)
      .then((items) => {
        setBattlelog(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        setBattleError(err?.message || 'Could not load battle log.');
      })
      .finally(() => {
        battlelogLoadingRef.current = false;
        setBattleLoading(false);
      });
  }, [isClan, tag]);

  const refreshProgress = useRef(new Animated.Value(0)).current;
  const refreshRotate = useRef(new Animated.Value(0)).current;

  const refreshPlayerData = useCallback(async () => {
    if (isClan || !tag || refreshing) return;

    setRefreshing(true);
    refreshProgress.setValue(0);
    refreshRotate.setValue(0);

    Animated.parallel([
      Animated.spring(refreshProgress, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(refreshRotate, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ),
    ]).start();

    let latestError = null;
    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const freshPlayer = await fetchPlayer(tag);
          setPlayer(freshPlayer);
          setError(null);
          latestError = null;
          requestAnimationFrame(() => playEntranceAnimation());
          break;
        } catch (err) {
          latestError = err;
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }

      loadBattlelog();
      if (latestError) {
        setError('Please check your internet connection and try again.');
      }
    } finally {
      refreshRotate.stopAnimation();
      refreshRotate.setValue(0);
      Animated.timing(refreshProgress, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => setRefreshing(false));
    }
  }, [isClan, tag, refreshing, refreshProgress, refreshRotate, loadBattlelog, playEntranceAnimation]);



  const data = player || entity || {};
  const currentDeck = useMemo(() => (Array.isArray(data.currentDeck) ? data.currentDeck : []), [data.currentDeck]);
  const handleCopyTag = useCallback(async () => {
    const tagToCopy = firstValue(data.tag, data.clan?.tag);
    if (!tagToCopy) return;
    await Clipboard.setStringAsync(String(tagToCopy));
  }, [data.tag, data.clan?.tag]);

  const handleCopyClanTag = useCallback(async () => {
    const clanTag = data.clan?.tag;
    if (!clanTag) return;
    await Clipboard.setStringAsync(String(clanTag));
  }, [data.clan?.tag]);

  const openCopyDeckModal = useCallback((deck = currentDeck) => {
    if (!Array.isArray(deck) || deck.length !== 8) return;
    setCopyDeckTarget(deck);
    setShowCopyDeckModal(true);
    copyDeckModalOpacity.setValue(0);
    copyDeckModalScale.setValue(0.92);
    copyDeckModalY.setValue(18);
    Animated.parallel([
      Animated.timing(copyDeckModalOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(copyDeckModalScale, { toValue: 1, friction: 8, tension: 75, useNativeDriver: true }),
      Animated.spring(copyDeckModalY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
    ]).start();
  }, [currentDeck, copyDeckModalOpacity, copyDeckModalScale, copyDeckModalY]);

  const closeCopyDeckModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(copyDeckModalOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(copyDeckModalScale, { toValue: 0.94, duration: 150, useNativeDriver: true }),
      Animated.timing(copyDeckModalY, { toValue: 12, duration: 150, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowCopyDeckModal(false);
        setCopyDeckTarget(null);
      }
    });
  }, [copyDeckModalOpacity, copyDeckModalScale, copyDeckModalY]);

  const confirmCopyDeck = useCallback(() => {
    const deck = Array.isArray(copyDeckTarget) ? copyDeckTarget : currentDeck;
    closeCopyDeckModal();
    setTimeout(() => openCurrentDeckInClashRoyale(deck), 165);
  }, [closeCopyDeckModal, copyDeckTarget, currentDeck]);

  const toggleBattleExpanded = useCallback((key) => {
    LayoutAnimation.configureNext({
      duration: 360,
      create: {
        type: LayoutAnimation.Types.easeOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.82,
      },
      delete: {
        type: LayoutAnimation.Types.easeIn,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setExpandedBattles((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const toggleSavedBattleDeck = useCallback((key) => {
    setSavedBattleDecks((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const openBattleDeckCopy = useCallback((deck) => {
    openCopyDeckModal(deck);
  }, [openCopyDeckModal]);
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
  const playerLeagueImage = getPlayerLeagueImage(data);
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
  const currentDeckSupport = Array.isArray(data.currentDeckSupportCards) ? data.currentDeckSupportCards : [];
  const allPlayerCards = useMemo(() => {
    const cards = Array.isArray(data.cards) ? data.cards : [];
    const supportCards = Array.isArray(data.supportCards) ? data.supportCards : [];
    return [...cards, ...supportCards];
  }, [data.cards, data.supportCards]);
  const favouriteCardResolved = useMemo(
    () => resolveFavouriteCardLevel(favouriteCard, allPlayerCards),
    [favouriteCard, allPlayerCards],
  );
  const deckBattleStats = useMemo(
    () => getCurrentDeckBattleStats(battlelog, currentDeck, tag),
    [battlelog, currentDeck, tag],
  );
  const badges = useMemo(() => sortBadgesByGameCategory(data.badges), [data.badges]);
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];

  const cardCollections = useMemo(() => {
    const cards = Array.isArray(data.cards) ? data.cards : [];
    const supportCards = Array.isArray(data.supportCards) ? data.supportCards : [];

    const dedupe = (items) => {
      const seen = new Set();
      return items.filter((card) => {
        const key = card?.id ?? card?.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    return {
      cards: dedupe(cards),
      supportCards: dedupe(supportCards),
    };
  }, [data.cards, data.supportCards]);

  const allCards = [...cardCollections.cards, ...cardCollections.supportCards];
  const supportCards = cardCollections.supportCards;
  const playerCards = Array.isArray(data.cards) ? data.cards : [];
  const maxLevelCards = allCards.filter((card) => number(card?.level) >= number(card?.maxLevel) && card?.maxLevel).length;

  // Player API ownership bit field:
  // 1 = Evolution, 2 = Hero, 3 = both Evolution + Hero.
  const evolutionCards = playerCards.filter((card) => {
    const evolutionLevel = Number(card?.evolutionLevel);
    return evolutionLevel === 1 || evolutionLevel === 3;
  }).length;
  const heroCards = playerCards.filter((card) => {
    const evolutionLevel = Number(card?.evolutionLevel);
    return evolutionLevel === 2 || evolutionLevel === 3;
  }).length;

  const filteredPlayerCards = useMemo(() => {
    if (cardCollectionFilter === 'heroes') {
      return cardCollections.cards.filter((card) => {
        const evolutionLevel = Number(card?.evolutionLevel);
        return evolutionLevel === 2 || evolutionLevel === 3;
      });
    }

    if (cardCollectionFilter === 'evolutions') {
      return cardCollections.cards.filter((card) => {
        const evolutionLevel = Number(card?.evolutionLevel);
        return evolutionLevel === 1 || evolutionLevel === 3;
      });
    }

    return cardCollections.cards;
  }, [cardCollections.cards, cardCollectionFilter]);

  const sortedPlayerCards = useMemo(
    () => sortCardList(filteredPlayerCards, cardSortBy, cardSortAscending),
    [filteredPlayerCards, cardSortBy, cardSortAscending],
  );

  const normalCardRowCount = Math.ceil(sortedPlayerCards.length / 4);
  const collapsedCardsHeight = sortedPlayerCards.length > 0
    ? (sortedPlayerCards.length > 4 ? 169 : 120)
    : 0;
  const expandedCardsHeight = normalCardRowCount > 0
    ? normalCardRowCount * 120 + Math.max(0, normalCardRowCount - 1) * 9
    : 0;

  const toggleCardsExpanded = useCallback(() => {
    const nextExpanded = !cardsExpanded;

    if (!nextExpanded) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, cardCollectionContentY.current - 6),
          animated: true,
        });
      });
    }

    setCardsExpanded(nextExpanded);
    Animated.spring(cardsExpandProgress, {
      toValue: nextExpanded ? 1 : 0,
      friction: 8,
      tension: 65,
      useNativeDriver: false,
    }).start();
  }, [cardsExpanded, cardsExpandProgress, scrollRef]);

  const achievementRowHeight = 58;
  const achievementRowGap = 7;
  const achievementCollapsedHeight = achievements.length > 2
    ? achievementRowHeight * 2 + achievementRowGap * 2 + achievementRowHeight / 2
    : achievements.length * achievementRowHeight + Math.max(0, achievements.length - 1) * achievementRowGap;
  const achievementExpandedHeight = achievements.length > 0
    ? achievements.length * achievementRowHeight + Math.max(0, achievements.length - 1) * achievementRowGap
    : 0;

  const toggleBattleLogExpanded = useCallback(() => {
    const nextExpanded = !battleLogExpanded;

    LayoutAnimation.configureNext({
      duration: 360,
      create: {
        type: LayoutAnimation.Types.easeOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeIn,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    setBattleLogExpanded(nextExpanded);
    Animated.timing(battleLogExpandProgress, {
      toValue: nextExpanded ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [battleLogExpanded, battleLogExpandProgress]);

  const toggleAchievementsExpanded = useCallback(() => {
    const nextExpanded = !achievementsExpanded;

    if (!nextExpanded) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, achievementContentY.current - 6),
          animated: true,
        });
      });
    }

    setAchievementsExpanded(nextExpanded);
    Animated.spring(achievementsExpandProgress, {
      toValue: nextExpanded ? 1 : 0,
      friction: 8,
      tension: 65,
      useNativeDriver: false,
    }).start();
  }, [achievementsExpanded, achievementsExpandProgress, scrollRef]);

  // Tower Cards are intentionally excluded from sorting.
  // Sort controls affect only the normal player-card collection.
  const sortedSupportCards = cardCollections.supportCards;


  const title = isClan
    ? firstValue(data.name, data.clan?.name, 'Clan')
    : firstValue(data.name, entity?.name, 'Player');
  const headerTitle = isClan ? 'Clan Details' : 'Player Details';

  if (isClan) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={onBack} style={styles.back} />
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{headerTitle}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AnimatedSection index={0} register={registerAnimatedSection}><Surface elevation={0} style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
            <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="account-group" size={30} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={[styles.heroName, { color: theme.colors.onSurface }]}>{title}</Text>
            <Pressable
              onPress={handleCopyTag}
              disabled={!firstValue(data.tag, data.clan?.tag)}
              hitSlop={4}
            >
              <Text
                selectable
                style={[styles.heroTag, { color: theme.colors.primary }]}
              >
                {firstValue(data.tag, data.clan?.tag, '—')}
              </Text>
            </Pressable>
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
          <View style={styles.headerTitleContainer}>
            <Animated.Text numberOfLines={1} style={[styles.headerTitle, styles.headerTitleLayer, { color: theme.colors.onSurface, opacity: headerDetailsOpacity }]}>
              {headerTitle}
            </Animated.Text>
            <Animated.Text
              numberOfLines={1}
              style={[styles.headerTitle, styles.headerTitleLayer, { color: theme.colors.onSurface, opacity: headerPlayerOpacity, transform: [{ translateY: headerPlayerTranslateY }, { scale: headerPlayerScale }] }]}
            >
              {title}
            </Animated.Text>
          </View>
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
              onScroll={detailsScrollHandler}
              scrollEventThrottle={16}
              style={{
                opacity: entrance,
                transform: [{ translateY: entranceY }, { scale: entranceScale }],
              }}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces
              alwaysBounceVertical
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshPlayerData}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                  progressBackgroundColor={theme.colors.surfaceContainerHighest}
                  progressViewOffset={4}
                />
              }
            >
            <AnimatedSection index={1} register={registerAnimatedSection}><Surface elevation={0} style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  {playerLeagueImage ? (
                    <RetryImage uri={playerLeagueImage} style={styles.heroLeagueIcon} resizeMode="contain" />
                  ) : (
                    <MaterialCommunityIcons name="account-circle-outline" size={46} color={theme.colors.primary} />
                  )}
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

            <AnimatedSection index={2} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
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

            <AnimatedSection index={3} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <SectionTitle icon="sword-cross" title="Player information" theme={theme} />
              <InfoRow icon="account" label="Tag" value={data.tag || '—'} theme={theme} onPress={handleCopyTag} />
              <InfoRow icon="shield-account" label="Role" value={data.role || '—'} theme={theme} />
              <InfoRow icon="castle" label="Arena" value={displayedArenaName} theme={theme} />
              <InfoRow icon="numeric" label="Arena number" value={displayedArenaNumber || '—'} theme={theme} />
              <InfoRow icon="star-four-points" label="Experience level" value={formatNumber(data.expLevel)} theme={theme} />
              <InfoRow icon="star-circle" label="Collection level" value={formatNumber(data.collectionLevel)} theme={theme} />
              <InfoRow icon="star" label="Star points" value={formatNumber(data.starPoints)} theme={theme} />
              <InfoRow icon="database" label="Experience points" value={formatNumber(data.expPoints)} theme={theme} />
              <InfoRow icon="trophy-outline" label="Legacy trophy high score" value={formatNumber(data.legacyTrophyRoadHighScore)} theme={theme} />
            </Surface></AnimatedSection>

            <AnimatedSection index={4} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
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

            <AnimatedSection index={5} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <SectionTitle icon="account-group" title="Clan" theme={theme} />
              <View style={styles.clanHero}>
                <View style={styles.clanBadge}>
                  {getClanBadgeImage(data.clan?.badgeId) ? (
                    <RetryImage uri={getClanBadgeImage(data.clan?.badgeId)} style={styles.clanBadgeImage} resizeMode="contain" />
                  ) : null}
                </View>
                <View style={styles.clanIdentity}>
                  <Text numberOfLines={1} style={[styles.clanName, { color: theme.colors.onSurface }]}>{data.clan?.name || 'No clan'}</Text>
                  <Pressable
                    onPress={handleCopyClanTag}
                    disabled={!data.clan?.tag}
                    hitSlop={4}
                  >
                    <Text
                      selectable
                      style={[styles.clanTag, { color: theme.colors.primary }]}
                    >
                      {data.clan?.tag || '—'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <InfoRow icon="account-multiple" label="Role" value={data.role || '—'} theme={theme} />
              <InfoRow icon="gift" label="Donations" value={formatNumber(data.donations)} theme={theme} />
              <InfoRow icon="gift-outline" label="Donations received" value={formatNumber(data.donationsReceived)} theme={theme} />
              <InfoRow icon="gift-open" label="Total donations" value={formatNumber(data.totalDonations)} theme={theme} />
              <InfoRow icon="sword-cross" label="War day wins" value={formatNumber(data.warDayWins)} theme={theme} />
              <InfoRow icon="cards" label="Clan cards collected" value={formatNumber(data.clanCardsCollected)} theme={theme} />
            </Surface></AnimatedSection>

            <AnimatedSection index={6} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <View style={styles.currentDeckHeader}>
                <View style={styles.currentDeckHeaderTitle}>
                  <SectionTitle icon="cards" title="Current deck" theme={theme} noBottomMargin />
                </View>
                <Pressable
                  onPress={openCopyDeckModal}
                  disabled={currentDeck.length !== 8}
                  style={({ pressed }) => [
                    styles.copyDeckButton,
                    { backgroundColor: theme.colors.primaryContainer, opacity: pressed ? 0.7 : currentDeck.length === 8 ? 1 : 0.45 },
                  ]}
                  hitSlop={4}
                >
                  <MaterialCommunityIcons
                    name="arrow-top-right"
                    size={18}
                    color={theme.colors.onPrimaryContainer}
                  />
                </Pressable>
              </View>
              <View style={styles.deckGrid}>
                {currentDeck.map((card, index) => <CardItem key={card?.id ?? index} card={card} theme={theme} compact deck={currentDeck} index={index} grid />)}
              </View>
              {currentDeckSupport.length > 0 ? (
                <>
                  <View style={styles.subSectionTitleRow}>
                    <Text style={[styles.subSectionTitle, { color: theme.colors.onSurfaceVariant }]}>Tower Card</Text>
                  </View>
                  <View style={styles.towerInfoRow}>
                    <View style={styles.towerCardSlot}>
                      {currentDeckSupport.map((card, index) => <CardItem key={card?.id ?? index} card={card} theme={theme} compact tower />)}
                    </View>
                    <View style={[styles.towerDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                    <View style={styles.deckStatsColumn}>
                      <View style={styles.deckBattleStatsGrid}>
                        {[
                          ['water', 'Avg Elixir:', getDeckAverages(currentDeck).avgElixir],
                          ['sword-cross', 'Games:', formatNumber(deckBattleStats.games)],
                          ['star-four-points', 'Avg Level:', getDeckAverages(currentDeck).avgLevel],
                          ['check-circle', 'Wins:', formatNumber(deckBattleStats.wins)],
                          ['crown', 'Crowns:', formatNumber(deckBattleStats.crowns)],
                          ['close-circle-outline', 'Losses:', formatNumber(deckBattleStats.losses)],
                          ['chart-line', 'Avg Crown:', deckBattleStats.avgCrowns],
                          ['minus-circle-outline', 'Draws:', formatNumber(deckBattleStats.draws)],
                          ['crown-outline', '3-CRN wins:', formatNumber(deckBattleStats.threeCrownWins)],
                          ['percent', 'Win Rate:', `${deckBattleStats.winRate.toFixed(1)}%`],
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

                    </View>
                  </View>
                  <TowerCardInfoHint theme={theme} />
                </>
              ) : null}
            </Surface></AnimatedSection>

            <Modal
              visible={showCopyDeckModal}
              transparent
              animationType="none"
              onRequestClose={closeCopyDeckModal}
              statusBarTranslucent
            >
              <View style={styles.copyDeckModalRoot}>
                <Pressable style={styles.copyDeckModalBackdrop} onPress={closeCopyDeckModal} />
                <Animated.View
                  style={[
                    styles.copyDeckModalCard,
                    {
                      backgroundColor: theme.colors.surfaceContainerHigh,
                      opacity: copyDeckModalOpacity,
                      transform: [
                        { translateY: copyDeckModalY },
                        { scale: copyDeckModalScale },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.copyDeckModalIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                      name="arrow-top-right"
                      size={24}
                      color={theme.colors.onPrimaryContainer}
                    />
                  </View>
                  <Text style={[styles.copyDeckModalTitle, { color: theme.colors.onSurface }]}>
                    Copy deck to Clash Royale?
                  </Text>
                  <Text style={[styles.copyDeckModalText, { color: theme.colors.onSurfaceVariant }]}>
                    This will open Clash Royale with the current deck ready to use.
                  </Text>
                  <View style={styles.copyDeckModalActions}>
                    <Pressable
                      onPress={closeCopyDeckModal}
                      style={({ pressed }) => [
                        styles.copyDeckModalButton,
                        { backgroundColor: theme.colors.surfaceContainerHighest, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[styles.copyDeckModalButtonText, { color: theme.colors.onSurface }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={confirmCopyDeck}
                      style={({ pressed }) => [
                        styles.copyDeckModalButton,
                        { backgroundColor: theme.colors.primary, opacity: pressed ? 0.78 : 1 },
                      ]}
                    >
                      <Text style={[styles.copyDeckModalButtonText, { color: theme.colors.onPrimary }]}>Open</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            </Modal>

            <AnimatedSection index={7} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <SectionTitle icon="cards-outline" title="Favourite card" theme={theme} />
              {favouriteCard ? (
                <View style={styles.favoriteRow}>
                  <CardItem card={favouriteCardResolved} theme={theme} compact />
                  <View style={styles.favoriteDetails}>
                    <InfoRow icon="cards-heart" label="Name" value={favouriteCard.name || '—'} theme={theme} />
                    <InfoRow icon="diamond-stone" label="Rarity" value={favouriteCard.rarity || '—'} theme={theme} />
                    <InfoRow icon="lightning-bolt" label="Elixir" value={formatNumber(favouriteCard.elixirCost)} theme={theme} />
                  </View>
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No favourite card data.</Text>
              )}
            </Surface></AnimatedSection>

            <AnimatedSection
              index={8}
              register={registerAnimatedSection}
              onLayout={(event) => {
                cardCollectionContentY.current = event.nativeEvent.layout.y;
              }}
            >
              <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant } ]}>
              <View
                style={styles.cardCollectionHeader}
              >
                <View style={styles.cardCollectionTitleWrap}>
                  <SectionTitle icon="archive" title="Card collection" theme={theme} noBottomMargin />
                </View>
                <CardSortControls
                  sortBy={cardSortBy}
                  setSortBy={setCardSortBy}
                  ascending={cardSortAscending}
                  setAscending={setCardSortAscending}
                  theme={theme}
                />
              </View>
              <View style={styles.collectionSummary}>
                <StatTile icon="check-decagram" label="Max level" value={formatNumber(maxLevelCards)} theme={theme} />
                <CardCollectionFilterTile
                  type="evolutions"
                  icon="auto-fix"
                  label="Evolutions"
                  value={formatNumber(evolutionCards)}
                  selected={cardCollectionFilter === 'evolutions'}
                  onPress={() => {
                    const nextSelected = cardCollectionFilter === 'evolutions' ? null : 'evolutions';
                    Animated.spring(filterStrokeProgress.evolutions, {
                      toValue: nextSelected === 'evolutions' ? 1 : 0,
                      friction: 8,
                      tension: 100,
                      useNativeDriver: false,
                    }).start();
                    Animated.timing(filterStrokeProgress.heroes, {
                      toValue: 0,
                      duration: 180,
                      useNativeDriver: false,
                    }).start();
                    setCardCollectionFilter(nextSelected);
                  }}
                  theme={theme}
                  animation={filterStrokeProgress}
                />
                <CardCollectionFilterTile
                  type="heroes"
                  icon="account-star"
                  label="Heroes"
                  value={formatNumber(heroCards)}
                  selected={cardCollectionFilter === 'heroes'}
                  onPress={() => {
                    const nextSelected = cardCollectionFilter === 'heroes' ? null : 'heroes';
                    Animated.spring(filterStrokeProgress.heroes, {
                      toValue: nextSelected === 'heroes' ? 1 : 0,
                      friction: 8,
                      tension: 100,
                      useNativeDriver: false,
                    }).start();
                    Animated.timing(filterStrokeProgress.evolutions, {
                      toValue: 0,
                      duration: 180,
                      useNativeDriver: false,
                    }).start();
                    setCardCollectionFilter(nextSelected);
                  }}
                  theme={theme}
                  animation={filterStrokeProgress}
                />
              </View>
              <View style={styles.normalCardsSection}>
                <Animated.View
                  style={[
                    styles.normalCardsRevealWrap,
                    {
                      height: cardsExpandProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [collapsedCardsHeight, expandedCardsHeight],
                      }),
                    },
                  ]}
                >
                  <View style={styles.allCardsGrid}>
                    {sortedPlayerCards.map((card, index) => (
                      <CardItem key={card?.id ?? ('card-' + String(card?.name ?? index))} card={card} theme={theme} index={index} grid collectionFilter={cardCollectionFilter} />
                    ))}
                  </View>

                  {sortedPlayerCards.length > 4 ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.cardsCollapseFade,
                        {
                          opacity: cardsExpandProgress.interpolate({
                            inputRange: [0, 0.4, 1],
                            outputRange: [1, 0.55, 0],
                          }),
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={[
                          'transparent',
                          'rgba(0,0,0,0.025)',
                          'rgba(0,0,0,0.10)',
                          theme.colors.surfaceContainer,
                        ]}
                        locations={[0, 0.38, 0.68, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        dither
                        style={styles.cardsFadeGradient}
                      />
                    </Animated.View>
                  ) : null}
                </Animated.View>

                {sortedPlayerCards.length > 4 ? (
                  <Pressable
                    onPress={toggleCardsExpanded}
                    accessibilityLabel={cardsExpanded ? 'Collapse cards' : 'Expand cards'}
                    style={({ pressed }) => [
                      styles.cardsExpandButton,
                      { opacity: pressed ? 0.55 : 1 },
                    ]}
                  >
                    <Animated.View
                      style={{
                        transform: [{
                          rotate: cardsExpandProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                          }),
                        }],
                      }}
                    >
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Animated.View>
                  </Pressable>
                ) : null}
              </View>
              {supportCards.length > 0 ? (
                <>
                  <View style={styles.collectionSubSectionTitle}>
                    <Text style={[styles.subSectionTitle, { color: theme.colors.onSurface }]}>Tower Cards</Text>
                  </View>
                  <View style={styles.allCardsGrid}>
                    {sortedSupportCards.map((card, index) => (
                      <CardItem key={card?.id ?? ('support-' + index)} card={card} theme={theme} index={index} grid />
                    ))}
                  </View>
                </>
              ) : null}
            </Surface></AnimatedSection>

            <AnimatedSection index={9} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <SectionTitle icon="medal" title="Badges" right={`${badges.length}`} theme={theme} />
              {badges.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No badge data.</Text>
              ) : (
                <>
                  <View style={styles.badgesGrid}>
                    {activeBadgeKey ? (
                      <Pressable
                        style={styles.badgesPopupDismiss}
                        onPress={() => setActiveBadgeKey(null)}
                      />
                    ) : null}
                    {badges.slice(0, 6).map((badge, index) => (
                      <BadgeItem
                        key={badge?.name || badge?.id || index}
                        badge={badge}
                        theme={theme}
                        playerDetailsGrid
                        activeBadgeKey={activeBadgeKey}
                        onToggleBadgePopup={setActiveBadgeKey}
                      />
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

            <AnimatedSection
              index={10}
              register={registerAnimatedSection}
              onLayout={(event) => {
                achievementContentY.current = event.nativeEvent.layout.y;
              }}
            >
              <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
                <SectionTitle icon="trophy-outline" title="Achievements" right={`${achievements.length}`} theme={theme} />
                {achievements.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No achievement data.</Text>
                ) : (
                  <>
                    <Animated.View
                      style={[
                        styles.achievementsRevealWrap,
                        {
                          height: achievementsExpandProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [achievementCollapsedHeight, achievementExpandedHeight],
                          }),
                        },
                      ]}
                    >
                      <View style={styles.achievementsList}>
                        {achievements.map((achievement, index) => (
                          <View
                            key={achievement?.name || index}
                            style={[
                              styles.achievementRow,
                              { backgroundColor: theme.colors.surfaceContainerHighest },
                              index < achievements.length - 1 && { marginBottom: achievementRowGap },
                            ]}
                          >
                            <View style={[styles.achievementIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                              <BadgeVisual
                                item={achievement}
                                theme={theme}
                                size={46}
                                crownColor={theme.colors.onSurface}
                              />
                            </View>
                            <View style={styles.achievementMain}>
                              <Text numberOfLines={1} style={[styles.achievementName, { color: theme.colors.onSurface }]}>
                                {formatGameDisplayName(achievement?.name, 'Achievement')}
                              </Text>
                              <Text numberOfLines={1} style={[styles.achievementInfo, { color: theme.colors.onSurfaceVariant }]}>
                                {achievement?.info || 'Achievement progress'}
                              </Text>
                            </View>
                            <View style={styles.achievementStars}>
                              <MaterialCommunityIcons name="star" size={14} color={theme.colors.primary} />
                              <Text style={[styles.achievementStarsText, { color: theme.colors.onSurface }]}>
                                {number(achievement?.stars)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>

                      {achievements.length > 2 ? (
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.achievementsCollapseFade,
                            {
                              opacity: achievementsExpandProgress.interpolate({
                                inputRange: [0, 0.4, 1],
                                outputRange: [1, 0.55, 0],
                              }),
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={[
                              'transparent',
                              'rgba(0,0,0,0.025)',
                              'rgba(0,0,0,0.10)',
                              theme.colors.surfaceContainer,
                            ]}
                            locations={[0, 0.38, 0.68, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            dither
                            style={styles.achievementsFadeGradient}
                          />
                        </Animated.View>
                      ) : null}
                    </Animated.View>

                    {achievements.length > 2 ? (
                      <Pressable
                        onPress={toggleAchievementsExpanded}
                        accessibilityLabel={achievementsExpanded ? 'Collapse achievements' : 'Expand achievements'}
                        style={({ pressed }) => [
                          styles.achievementsExpandButton,
                          { opacity: pressed ? 0.55 : 1 },
                        ]}
                      >
                        <Animated.View
                          style={{
                            transform: [{
                              rotate: achievementsExpandProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '180deg'],
                              }),
                            }],
                          }}
                        >
                          <MaterialCommunityIcons
                            name="chevron-down"
                            size={24}
                            color={theme.colors.onSurfaceVariant}
                          />
                        </Animated.View>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </Surface>
            </AnimatedSection>

            <AnimatedSection index={11} register={registerAnimatedSection}><Surface elevation={0} style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
              <SectionTitle icon="sword-cross" title="Battle log" right={battlelog.length ? `${battlelog.length} battles` : undefined} theme={theme} />
              {battleLoading ? (
                <View style={styles.battleLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : battleError && battlelog.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{battleError}</Text>
                  <Pressable
                    onPress={loadBattlelog}
                    style={[styles.retryButton, { backgroundColor: theme.colors.primaryContainer }]}
                  >
                    <Text style={[styles.retryText, { color: theme.colors.onPrimaryContainer }]}>Retry</Text>
                  </Pressable>
                </View>
              ) : battlelog.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No battle log available.</Text>
              ) : (
                <>
                  <View
                    style={[
                      styles.battleLogRevealWrap,
                      !battleLogExpanded && styles.battleLogCollapsedWrap,
                    ]}
                  >
                    {battlelog.map((battle, index) => {
                      const battleKey = `${battle?.battleTime || battle?.createdDate || battle?.date || 'battle'}-${index}`;
                      return (
                        <BattleRow
                          key={battleKey}
                          battle={battle}
                          theme={theme}
                          index={index}
                          expanded={Boolean(expandedBattles[battleKey])}
                          onToggle={() => toggleBattleExpanded(battleKey)}
                          onCopyDeck={openBattleDeckCopy}
                          onSaveDeck={toggleSavedBattleDeck}
                          savedLeft={Boolean(savedBattleDecks[`${battleKey}-left`])}
                          savedRight={Boolean(savedBattleDecks[`${battleKey}-right`])}
                        />
                      );
                    })}
                    {!battleLogExpanded && battlelog.length > 1 ? (
                      <View pointerEvents="none" style={styles.battleLogCollapseFade}>
                        <LinearGradient
                          colors={[
                            'transparent',
                            'rgba(0,0,0,0.025)',
                            'rgba(0,0,0,0.10)',
                            theme.colors.surfaceContainer,
                          ]}
                          locations={[0, 0.38, 0.68, 1]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          dither
                          style={styles.battleLogFadeGradient}
                        />
                      </View>
                    ) : null}
                  </View>
                  {battlelog.length > 1 ? (
                    <Pressable
                      onPress={toggleBattleLogExpanded}
                      accessibilityLabel={battleLogExpanded ? 'Collapse battle log' : 'Expand battle log'}
                      style={({ pressed }) => [
                        styles.battleLogExpandButton,
                        { opacity: pressed ? 0.55 : 1 },
                      ]}
                    >
                      <Animated.View
                        style={{
                          transform: [{
                            rotate: battleLogExpandProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '180deg'],
                            }),
                          }],
                        }}
                      >
                        <MaterialCommunityIcons
                          name="chevron-down"
                          size={24}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </Animated.View>
                    </Pressable>
                  ) : null}
                </>
              )}
            </Surface></AnimatedSection>

            <View style={styles.bottomSpace} />
            </Animated.ScrollView>
          </DetailAnimationContext.Provider>
        )}
      </View>
        <Modal
          visible={showAllBadges && !isClan}
          animationType="slide"
          onRequestClose={() => setShowAllBadges(false)}
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => setShowAllBadges(false)}
                style={styles.back}
              />
              <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                Badges & achievements
              </Text>
              <Text style={[styles.sectionRight, { color: theme.colors.onSurfaceVariant, marginRight: 8 }]}>
                {badges.length}
              </Text>
            </View>

            {activeBadgeKey ? (
              <Pressable
                style={styles.badgesPopupDismiss}
                onPress={() => setActiveBadgeKey(null)}
              />
            ) : null}
            <FlatList
              data={badges}
              keyExtractor={(badge, index) => String(badge?.name || badge?.id || index)}
              numColumns={3}
              renderItem={({ item, index }) => (
                <BadgeItem
                  badge={item}
                  theme={theme}
                  index={index}
                  playerDetailsGrid
                  activeBadgeKey={activeBadgeKey}
                  onToggleBadgePopup={setActiveBadgeKey}
                />
              )}
              contentContainerStyle={styles.badgesPageContent}
              columnWrapperStyle={styles.badgesPageRow}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  back: { margin: 0 },
  headerTitleContainer: { flex: 1, height: 42, justifyContent: 'center', overflow: 'hidden', marginLeft: 4 },
  headerTitleLayer: { position: 'absolute', left: 0, right: 0 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingText: { marginTop: 10, fontSize: 13 },
  errorIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { marginTop: 12, fontSize: 17, fontWeight: '700' },
  errorText: { marginTop: 6, textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  retryText: { fontSize: 13, fontWeight: '700' },

  heroCard: { borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1 },
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
  collectionFilterPressable: { width: '31.5%', minHeight: 52, marginBottom: 7 },
  collectionFilterTile: { minHeight: 52, borderRadius: 15, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  statTileInner: { flex: 1, minHeight: 52, borderRadius: 15, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  statIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  statImage: { width: 17, height: 17 },
  statContent: { flex: 1, minWidth: 0, alignItems: 'flex-start', justifyContent: 'center' },
  statLabel: { fontSize: 8.5, fontWeight: '600', textAlign: 'left' },
  statValue: { marginTop: 0, fontSize: 15, fontWeight: '900', letterSpacing: -0.2, textAlign: 'left' },

  sectionCard: { borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginLeft: 9, fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { marginLeft: 6, justifyContent: 'center' },
  sectionSubtitleLine: { fontSize: 8.5, lineHeight: 9, fontWeight: '600' },
  sectionRight: { marginLeft: 8, fontSize: 11 },
  currentDeckHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 13, width: '100%' },
  currentDeckHeaderTitle: { flex: 1, minWidth: 0 },
  copyDeckButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0 },
  copyDeckModalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  copyDeckModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  copyDeckModalCard: { width: '100%', maxWidth: 390, borderRadius: 28, padding: 22, elevation: 8 },
  copyDeckModalIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  copyDeckModalTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  copyDeckModalText: { marginTop: 8, fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  copyDeckModalActions: { flexDirection: 'row', gap: 9, marginTop: 20 },
  copyDeckModalButton: { flex: 1, minHeight: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copyDeckModalButtonText: { fontSize: 13, fontWeight: '800' },

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
  infoValuePressable: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },

  seasonTable: { borderRadius: 16, overflow: 'hidden' },
  seasonHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.035)' },
  seasonRow: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 10 },
  seasonHeaderText: { flex: 1, fontSize: 10.5, fontWeight: '700', textAlign: 'center' },
  seasonHeaderFirst: { textAlign: 'left' },
  seasonHeaderLast: { textAlign: 'center' },
  seasonText: { flex: 1, fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  seasonTextFirst: { textAlign: 'left' },

  clanHero: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  clanBadge: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  clanBadgeImage: { width: 45, height: 45 },
  clanIdentity: { flex: 1, marginLeft: 11 },
  clanName: { fontSize: 16, fontWeight: '800' },
  clanTag: { marginTop: 3, fontSize: 12, fontWeight: '700' },

  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 9, alignItems: 'flex-start' },
  subSectionTitleRow: { position: 'relative', flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 8 },
  collectionSubSectionTitle: { marginTop: 15, marginBottom: 8 },
  subSectionTitle: { fontSize: 12, fontWeight: '700' },
  towerCardNoteInline: { marginTop: -4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 4 },
  towerCardNoteText: { fontSize: 8.5, lineHeight: 12, textAlign: 'center' },
  towerInfoRow: { position: 'relative', flexDirection: 'row', alignItems: 'stretch' },
  towerCardSlot: { width: '25%', minWidth: 0, flexGrow: 0, flexShrink: 0, flexBasis: '25%' },
  towerCardItem: { width: '100%', height: 120 },
  towerDivider: { position: 'absolute', left: '30%', top: -21, bottom: 21, width: 1 },
  deckStatsColumn: { flex: 1, minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: 0, marginLeft: 21, transform: [{ translateX: 12 }, { translateY: -18 }] },
  deckBattleStatsGrid: { marginTop: -8, flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 8 },
  deckBattleStatItem: { width: '47%', flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  deckBattleStatText: { flex: 1, marginLeft: 6, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  deckBattleStatLabel: { fontSize: 9.5, fontWeight: '600' },
  deckBattleStatValue: { marginTop: 0, marginLeft: 3, fontSize: 12, fontWeight: '800' },
  cardItem: { width: '23.5%', height: 120 },
  cardItemInner: { height: 120, borderRadius: 16, padding: 5, overflow: 'visible' },
          compactCardItem: { width: '23.5%', height: 120 },
  cardGridGap: { marginRight: '2%' },
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
  cardCollectionHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 13 },
  cardCollectionTitleWrap: { flex: 1, minWidth: 0 },
  cardSortControls: { flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 8, flexShrink: 0, zIndex: 20 },
  cardSortDirection: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  cardSortTriangle: { position: 'absolute', top: 9, left: 9, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  cardSortMenuWrap: { position: 'relative', zIndex: 20 },
  cardSortDismissArea: { position: 'absolute', left: -1000, right: -1000, top: -1000, bottom: -1000, zIndex: 0 },
  cardSortCapsule: { minWidth: 82, height: 32, paddingHorizontal: 11, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  cardSortText: { fontSize: 11, fontWeight: '800' },
  cardSortDropdown: { position: 'absolute', top: 38, right: 0, width: 132, borderRadius: 17, overflow: 'hidden', elevation: 8, zIndex: 30 },
  cardSortOption: { height: 49, paddingHorizontal: 13, justifyContent: 'center', position: 'relative' },
  cardSortOptionText: { fontSize: 11.5, fontWeight: '700' },
  cardSortDivider: { position: 'absolute', left: 13, right: 13, bottom: 0, height: StyleSheet.hairlineWidth },

  collectionSummary: { flexDirection: 'row', gap: 9, marginBottom: 10 },
  allCardsGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 9, alignItems: 'flex-start' },
  normalCardsSection: { width: '100%' },
  normalCardsRevealWrap: { width: '100%', overflow: 'hidden' },
  cardsCollapseFade: { position: 'absolute', left: 0, right: 0, top: 72, height: 97, overflow: 'hidden' },
  cardsFadeGradient: { flex: 1, width: '100%' },
  cardsExpandButton: { alignSelf: 'center', width: 34, height: 30, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  badgesGrid: { position: 'relative', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  badgesPopupDismiss: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  badgeItemPopupActive: { zIndex: 10 },
  badgePressable: { width: '100%', height: '100%' },
  viewAllButton: { marginTop: 12, minHeight: 44, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  viewAllText: { fontSize: 12.5, fontWeight: '800' },
  badgesPageContent: { padding: 14, paddingBottom: 36 },
  badgesPageRow: { gap: 8, marginBottom: 8 },
  badgeItem: { width: '31.5%', aspectRatio: 1, zIndex: 1 },
  badgeItemPlayerDetails: { width: '31.5%', aspectRatio: 1, zIndex: 1 },
  badgeItemActive: { zIndex: 11 },
  badgeItemInner: { width: '100%', height: '100%', borderRadius: 16, padding: 4, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  badgeImage: { width: 96, height: 96 },
  missingBadgeIcon: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  missingBadgeCrown: { position: 'absolute' },
  badgeVisual: { alignItems: 'center', justifyContent: 'center' },
  badgeInfoPopup: { position: 'absolute', left: -6, right: -6, top: 94, minHeight: 78, borderRadius: 14, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', elevation: 8, zIndex: 20 },
  badgePopupName: { fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  badgePopupLevel: { marginTop: 2, fontSize: 9.5, fontWeight: '800', textAlign: 'center' },
  badgeTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 7 },
  badgeFill: { height: '100%', borderRadius: 3 },
  badgeProgress: { marginTop: 3, fontSize: 8.5 },

  achievementsList: { width: '100%' },
  achievementsRevealWrap: { width: '100%', overflow: 'hidden' },
  achievementsCollapseFade: { position: 'absolute', left: 0, right: 0, top: 123, height: 36, overflow: 'hidden' },
  achievementsFadeGradient: { flex: 1, width: '100%' },
  achievementsExpandButton: { alignSelf: 'center', width: 34, height: 30, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  achievementRow: { minHeight: 58, height: 58, borderRadius: 16, padding: 9, flexDirection: 'row', alignItems: 'center' },
  achievementIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: -5 },
  achievementMain: { flex: 1, minWidth: 0, marginLeft: 9 },
  achievementName: { fontSize: 12.5, fontWeight: '800' },
  achievementInfo: { marginTop: 3, fontSize: 9.5 },
  achievementStars: { marginLeft: 8, flexDirection: 'row', alignItems: 'center', minWidth: 30, justifyContent: 'flex-end' },
  achievementStarsText: { marginLeft: 2, fontSize: 11, fontWeight: '800' },
  battleLogRevealWrap: { width: "100%" },
  battleLogCollapsedWrap: { height: 158, overflow: "hidden" },
  battleLogCollapseFade: { position: "absolute", left: 0, right: 0, top: 112, height: 46, overflow: "hidden" },
  battleLogFadeGradient: { flex: 1, width: "100%" },
  battleLogExpandButton: { alignSelf: "center", width: 34, height: 30, marginTop: 8, alignItems: "center", justifyContent: "center" },
  battleLoading: { paddingVertical: 20, alignItems: 'center' },
  battleRowGradient: { width: "100%", borderRadius: 18, padding: 1.2, marginBottom: 8 },
  battleRowInner: { minHeight: 0, borderRadius: 17, paddingHorizontal: 10, paddingTop: 7, paddingBottom: 2, overflow: "hidden" },
  battleRowInnerCollapsed: { height: 112, paddingTop: 12, paddingBottom: 0, position: "relative" },
  battleRowInnerExpanded: { minHeight: 250, paddingTop: 10 },
  battleHeader: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 58 },
  battleHeaderExpanded: { minHeight: 58 },
  battlePlayerBlock: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  battlePlayerBlockRight: { alignItems: "flex-end" },
  battlePlayerName: { maxWidth: "100%", marginTop: 4, fontSize: 12.5, fontWeight: "800" },
  battlePlayerClan: { marginTop: 2, maxWidth: "100%", fontSize: 9.5, fontWeight: "600" },
  battleCenterHeader: { width: 70, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 3, paddingTop: 2, transform: [{ translateY: -8 }] },
  battleModeImage: { width: 21, height: 21, marginBottom: 0 },
  battleRankedLabel: { fontSize: 8.5, fontWeight: "800", textAlign: "center" },
  battleTrophyCluster: { flexDirection: "row", alignItems: "center", gap: 4 },
  battleTrophyClusterRight: { flexDirection: "row-reverse", justifyContent: "flex-start" },
  battleTrophyValue: { minHeight: 25, borderRadius: 9, borderWidth: 1, paddingHorizontal: 6, flexDirection: "row", alignItems: "center" },
  battleTrophyIcon: { width: 14, height: 14, marginRight: 3 },
  battleTrophyText: { fontSize: 10, fontWeight: "900" },
  battleTrophyChange: { minHeight: 25, minWidth: 34, borderRadius: 8, borderWidth: 1.2, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  battleTrophyChangeText: { fontSize: 10, fontWeight: "900" },
  battleCollapsedMeta: { position: "absolute", left: 0, right: 0, bottom: 26, alignItems: "center", justifyContent: "center" },
  battleCollapsedTimeRow: { position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 2 },
  battleCollapsedTime: { fontSize: 9.5, fontWeight: "700" },
  battleExpandedDeckRow: { width: "100%", flexDirection: "row", alignItems: "flex-start", marginTop: 9 },
  battleSide: { flex: 1, minWidth: 0 },
  battleSideMirrored: { alignItems: "flex-end" },
  battleCardsGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 0, columnGap: 0, rowGap: 0, justifyContent: "flex-start" },
  battleDeckTools: { width: 134, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2, marginTop: 7 },
  battleDeckToolsMirrored: { alignSelf: "flex-end", flexDirection: "row-reverse", justifyContent: "flex-start" },
  battleTowerTool: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  battleToolButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  battleElixirPill: { width: 32, height: 25, borderRadius: 8, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", flexDirection: "row", backgroundColor: "#6C4BD6" },
  battleElixirText: { marginLeft: 1, fontSize: 9.5, fontWeight: "900" },
  battleCard: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  battleCardImage: { width: "100%", height: "100%" },
  battleExpandedDivider: { width: 24, alignItems: "center", justifyContent: "center", paddingTop: 38 },
  battleResultBadge: { minWidth: 38, minHeight: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  battleResultBadgeText: { fontSize: 12, fontWeight: "900", color: "#101112" },
  battleFooter: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", marginTop: 9, paddingHorizontal: 2 },
  battleDate: { fontSize: 9.5, fontWeight: "700" },
  battleChevronButton: { width: 34, height: 25, alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 2 },
  battleChevronButtonCollapsed: { position: "absolute", left: "50%", width: 34, marginLeft: -7, bottom: 1, marginTop: 0, alignSelf: "auto" },


  emptyText: { fontSize: 12, lineHeight: 18 },
  bottomSpace: { height: 50 },
});


export default EntityDetailsScreen;
