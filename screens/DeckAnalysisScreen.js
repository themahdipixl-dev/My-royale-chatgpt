// * screens/DeckAnalysisScreen.js — Ranked deck analysis with Decks/Cards switch (v2)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchDeckAnalysis } from '../api/client';
import RetryImage from '../components/RetryImage';

function pct(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function compact(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

function DeckImages({ deck, theme }) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  return (
    <View>
      <View style={styles.deckImages}>
        {cards.map((card, index) => (
          <View key={`${card.id || card.name}-${index}`} style={[styles.cardImageWrap, { backgroundColor: theme.colors.surfaceContainerHighest, borderColor: card.cardType === 'evolution' ? '#8B5CF6' : card.cardType === 'hero' ? '#EAB308' : theme.colors.outlineVariant }]}>
            <RetryImage uri={card.iconUrl} style={styles.cardImage} resizeMode="contain" />
          </View>
        ))}
      </View>
      {!!deck?.towerCard && (
        <View style={styles.towerSection}>
          <View style={styles.towerImageOnly}>
            <RetryImage uri={deck.towerCard.iconUrl} style={styles.towerImage} resizeMode="contain" />
          </View>
          <View style={[styles.statBar, { backgroundColor: theme.colors.surfaceContainerHighest, borderColor: theme.colors.outline }]}>
            <View style={styles.statGrid}>
              <View style={styles.stat}><Text style={[styles.statValue, { color: theme.colors.primary }]}>{pct(deck.adjustedWinRate)}</Text><Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Adjusted WR</Text></View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />
              <View style={styles.stat}><Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{pct(deck.winRate)}</Text><Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Win Rate</Text></View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />
              <View style={styles.stat}><Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{deck.games ?? 0}</Text><Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Games</Text></View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.outlineVariant }]} />
              <View style={styles.stat}><Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{deck.totalCrowns ?? 0}</Text><Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Crowns</Text></View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function DeckRow({ item, index, theme, entrance }) {
  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Surface elevation={0} style={[styles.deckCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: index < 3 ? theme.colors.primary : theme.colors.outlineVariant }]}>
        <View style={styles.deckBody}>
          <View style={styles.rankHeader}><Text style={[styles.rank, { color: theme.colors.onSurface }]}>#{index + 1}</Text><Text style={[styles.rankLabel, { color: theme.colors.onSurfaceVariant }]}>RANK</Text></View>
          <View style={styles.metaLine}><Text numberOfLines={1} style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>{item.wins ?? 0}W · {item.losses ?? 0}L · {item.draws ?? 0}D</Text></View>
          <DeckImages deck={item} theme={theme} />
        </View>
      </Surface>
    </Animated.View>
  );
}

function buildCardStats(decks) {
  const stats = new Map();
  decks.forEach((deck) => {
    const games = Number(deck?.games || 0);
    if (!games) return;
    const deckWinRate = Number(deck?.winRate || 0);
    const deckWins = games * deckWinRate / 100;
    const cards = Array.isArray(deck?.cards) ? deck.cards : [];
    cards.forEach((card) => {
      if (!card?.name) return;
      const key = String(card.id ?? card.name);
      const existing = stats.get(key) || { id: card.id ?? key, name: card.name, iconUrl: card.iconUrl || null, cardType: card.cardType || 'normal', games: 0, wins: 0 };
      existing.games += games;
      existing.wins += deckWins;
      if (!existing.iconUrl && card.iconUrl) existing.iconUrl = card.iconUrl;
      if (card.cardType && card.cardType !== 'normal') existing.cardType = card.cardType;
      stats.set(key, existing);
    });
  });
  const totalDeckGames = decks.reduce((sum, deck) => sum + Number(deck?.games || 0), 0);
  return Array.from(stats.values()).map((card) => ({
    ...card,
    usageRate: totalDeckGames ? (card.games / totalDeckGames) * 100 : 0,
    deckWinRate: card.games ? (card.wins / card.games) * 100 : 0,
  })).sort((a, b) => b.usageRate - a.usageRate || b.games - a.games);
}

function CardTile({ item, maxUsage, theme, entrance }) {
  const usageWidth = maxUsage ? Math.max(5, Math.min(100, (item.usageRate / maxUsage) * 100)) : 5;
  const typeColor = item.cardType === 'evolution' ? '#8B5CF6' : item.cardType === 'hero' ? '#EAB308' : theme.colors.outlineVariant;
  return (
    <Animated.View style={[styles.cardTileOuter, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Surface elevation={0} style={[styles.cardTile, { backgroundColor: theme.colors.surfaceContainer, borderColor: typeColor }]}>
        <View style={styles.cardTileImageWrap}>
          <RetryImage uri={item.iconUrl} style={styles.cardTileImage} resizeMode="contain" />
          {item.cardType !== 'normal' && <View style={[styles.typeDot, { backgroundColor: typeColor }]} />}
        </View>
        <Text numberOfLines={1} style={[styles.cardName, { color: theme.colors.onSurface }]}>{item.name}</Text>
        <View style={styles.cardMetricRow}><Text style={[styles.cardMetricValue, { color: theme.colors.primary }]}>{pct(item.usageRate)}</Text><Text style={[styles.cardMetricLabel, { color: theme.colors.onSurfaceVariant }]}>usage</Text></View>
        <View style={[styles.usageTrack, { backgroundColor: theme.colors.surfaceContainerHighest }]}><View style={[styles.usageFill, { width: `${usageWidth}%`, backgroundColor: theme.colors.primary }]} /></View>
        <View style={styles.cardFooter}><View><Text style={[styles.smallValue, { color: theme.colors.onSurface }]}>{pct(item.deckWinRate)}</Text><Text style={[styles.smallLabel, { color: theme.colors.onSurfaceVariant }]}>Deck WR</Text></View><View style={styles.cardFooterRight}><Text style={[styles.smallValue, { color: theme.colors.onSurface }]}>{compact(item.games)}</Text><Text style={[styles.smallLabel, { color: theme.colors.onSurfaceVariant }]}>games</Text></View></View>
      </Surface>
    </Animated.View>
  );
}

export default function DeckAnalysisScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState('decks');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const result = await fetchDeckAnalysis();
      setData(result);
      entrance.setValue(0);
      Animated.spring(entrance, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
    } catch {
      setError('Could not load deck analysis. Check your internet connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entrance]);

  useEffect(() => { load(); }, [load]);

  const decks = useMemo(() => (Array.isArray(data?.decks) ? data.decks : []), [data?.decks]);
  const cardStats = useMemo(() => buildCardStats(decks), [decks]);
  const maxUsage = cardStats[0]?.usageRate || 0;

  const listRefresh = (
    <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={[styles.title, { color: theme.colors.onSurface }]}>Deck Analysis</Text><Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Ranked / Path of Legends</Text></View>
        <View style={[styles.switch, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
          <Pressable onPress={() => setMode('decks')} style={[styles.switchItem, mode === 'decks' && { backgroundColor: theme.colors.primaryContainer }]}><MaterialCommunityIcons name="cards-playing-outline" size={17} color={mode === 'decks' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} /><Text style={[styles.switchText, { color: mode === 'decks' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>Decks</Text></Pressable>
          <Pressable onPress={() => setMode('cards')} style={[styles.switchItem, mode === 'cards' && { backgroundColor: theme.colors.primaryContainer }]}><MaterialCommunityIcons name="card-outline" size={17} color={mode === 'cards' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} /><Text style={[styles.switchText, { color: mode === 'cards' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>Cards</Text></Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyState}><MaterialCommunityIcons name="loading" size={38} color={theme.colors.primary} /><Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>Loading deck analysis…</Text></View>
      ) : error ? (
        <View style={styles.emptyState}><MaterialCommunityIcons name="wifi-alert" size={42} color={theme.colors.primary} /><Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Unable to load</Text><Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{error}</Text><Pressable onPress={() => load()} style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}><Text style={[styles.retryText, { color: theme.colors.onPrimary }]}>Retry</Text></Pressable></View>
      ) : mode === 'cards' ? (
        <FlatList key="cards" data={cardStats} keyExtractor={(item) => String(item.id || item.name)} numColumns={4} columnWrapperStyle={styles.cardRow} contentContainerStyle={styles.cardList} showsVerticalScrollIndicator={false} refreshControl={listRefresh}
          renderItem={({ item, index }) => <CardTile item={item} index={index} maxUsage={maxUsage} theme={theme} entrance={entrance} />}
          ListHeaderComponent={<View style={styles.cardsHeader}><View><Text style={[styles.cardsTitle, { color: theme.colors.onSurface }]}>Cards</Text><Text style={[styles.cardsSubtitle, { color: theme.colors.onSurfaceVariant }]}>Ranked deck sample</Text></View><View style={[styles.cardCountPill, { backgroundColor: theme.colors.surfaceContainerHighest }]}><Text style={[styles.cardCountText, { color: theme.colors.onSurfaceVariant }]}>{cardStats.length} cards</Text></View></View>}
          ListFooterComponent={<Text style={[styles.updated, { color: theme.colors.onSurfaceVariant }]}>Usage is based on the current ranked deck dataset · Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}</Text>}
        />
      ) : (
        <FlatList key="decks" data={decks} keyExtractor={(item) => item.key} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} refreshControl={listRefresh}
          renderItem={({ item, index }) => <DeckRow item={item} index={index} theme={theme} entrance={entrance} />}
          ListHeaderComponent={<View style={styles.infoHeader}><View style={styles.infoBlock}><Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{decks.length}</Text><Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Decks</Text></View><View style={styles.infoBlock}><Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{data?.source?.playersCollected ?? 0}</Text><Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Players analyzed</Text></View><View style={styles.infoBlock}><Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{data?.source?.battlesPerPlayer ?? 0}</Text><Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Battles / player</Text></View></View>}
          ListFooterComponent={<Text style={[styles.updated, { color: theme.colors.onSurfaceVariant }]}>Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { marginTop: 2, fontSize: 12.5, fontWeight: '600' },
  switch: { flexDirection: 'row', padding: 3, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  switchItem: { minWidth: 67, height: 34, borderRadius: 17, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  switchText: { fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingBottom: 100, gap: 8 },
  infoHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  infoBlock: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  infoValue: { fontSize: 18, fontWeight: '800' },
  infoLabel: { marginTop: 2, fontSize: 10.5, fontWeight: '600', textAlign: 'center' },
  deckCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 12, paddingTop: 8 },
  rankHeader: { alignItems: 'center', marginBottom: 6 },
  rank: { fontSize: 24, fontWeight: '900' },
  rankLabel: { marginTop: -1, fontSize: 7, fontWeight: '800', letterSpacing: 0.6 },
  deckBody: { flex: 1 },
  deckImages: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingRight: 2, justifyContent: 'space-between' },
  cardImageWrap: { width: 78, height: 99, borderRadius: 14, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardImage: { width: 76, height: 97 },
  towerSection: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 7, width: '100%' },
  towerImageOnly: { width: 48, height: 56, alignItems: 'flex-start', justifyContent: 'center', overflow: 'visible', flexShrink: 0, transform: [{ translateY: -3 }] },
  towerImage: { width: 44, height: 54 },
  statBar: { flex: 1, minWidth: 0, height: 45, borderRadius: 12, paddingHorizontal: 2, justifyContent: 'center', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, transform: [{ translateX: -3 }] },
  statGrid: { flex: 1, minWidth: 0, height: '100%', flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: '58%', alignSelf: 'center' },
  statValue: { fontSize: 11.5, fontWeight: '800' },
  statLabel: { marginTop: 1, fontSize: 7.2, fontWeight: '600', textAlign: 'center' },
  metaLine: { marginTop: 0, alignItems: 'flex-end' },
  metaText: { fontSize: 8.5, fontWeight: '700', textAlign: 'right' },
  cardsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  cardsTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.2 },
  cardsSubtitle: { marginTop: 2, fontSize: 11, fontWeight: '600' },
  cardCountPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  cardCountText: { fontSize: 10.5, fontWeight: '800' },
  cardList: { paddingHorizontal: 10, paddingBottom: 100 },
  cardRow: { gap: 6, marginBottom: 6 },
  cardTileOuter: { flex: 1, minWidth: 0 },
  cardTile: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, paddingTop: 6, paddingBottom: 6, minHeight: 142, overflow: 'hidden' },
  cardTileImageWrap: { height: 66, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardTileImage: { width: '100%', height: 64 },
  typeDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, right: 1, top: 1 },
  cardName: { fontSize: 9.2, fontWeight: '800', textAlign: 'center', marginTop: 1 },
  cardMetricRow: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 3 },
  cardMetricValue: { fontSize: 11.5, fontWeight: '900' },
  cardMetricLabel: { fontSize: 7.2, fontWeight: '700' },
  usageTrack: { height: 3, borderRadius: 999, overflow: 'hidden', marginTop: 3, marginHorizontal: 2 },
  usageFill: { height: '100%', borderRadius: 999 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingHorizontal: 1 },
  cardFooterRight: { alignItems: 'flex-end' },
  smallValue: { fontSize: 8.5, fontWeight: '800' },
  smallLabel: { fontSize: 6.5, fontWeight: '600', marginTop: -1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 9 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: { fontSize: 13, fontWeight: '800' },
  updated: { textAlign: 'center', fontSize: 10.5, fontWeight: '600', paddingVertical: 12 },
});