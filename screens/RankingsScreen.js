// * screens/RankingsScreen.js — changed in this revision (v49)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, StyleSheet, Keyboard, RefreshControl, Animated } from 'react-native';
import { Text, Button, IconButton, Surface, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchCountries, fetchPathOfLegendRankings, fetchClanWarRankings, fetchMergeTacticsRankings } from '../api/client';
import AppHeader from '../components/AppHeader';
import LocationBar from '../components/LocationBar';
import TopTabs from '../components/TopTabs';
import RankRow, { ROW_HEIGHT } from '../components/RankRow';
import ClanRow, { CLAN_ROW_HEIGHT } from '../components/ClanRow';

export default function RankingsScreen() {
  const theme = useTheme();
  const [topTab, setTopTab] = useState('players');
  const [countries, setCountries] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({ id: 'global', name: 'Global' });
  const [menuVisible, setMenuVisible] = useState(false);
  const [players, setPlayers] = useState([]);
  const [clans, setClans] = useState([]);
  const [clanRankingMode, setClanRankingMode] = useState('war');
  const [mergers, setMergers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLimit, setSelectedLimit] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('trophies');
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [jumpToTop, setJumpToTop] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const jumpVisibility = useRef(new Animated.Value(0)).current;
  const jumpRotation = useRef(new Animated.Value(0)).current;
  const listRef = useRef(null);
  const lastOffset = useRef(0);
  const lastDirectionOffset = useRef(0);

  useEffect(() => { fetchCountries().then(setCountries).catch(() => setCountries([])); }, []);

  const loadData = useCallback((locationId, type = topTab, clanMode = clanRankingMode) => {
    if (!locationId) return;
    setLoading(true); setError(null); setSelectedLimit(null); setSearchQuery('');
    lastOffset.current = 0; setShowJumpButton(false); setJumpToTop(false);

    const request = type === 'clans'
      ? (clanMode === 'path' ? fetchPathOfLegendRankings(locationId) : fetchClanWarRankings(locationId, 500))
      : type === 'merge' ? fetchMergeTacticsRankings(500) : fetchPathOfLegendRankings(locationId);

    request.then((items) => {
      if (type === 'clans') setClans(items);
      else if (type === 'merge') setMergers(items);
      else setPlayers(items);
      setAnimationKey((value) => value + 1);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
    }).catch((requestError) => setError(requestError?.message || "Couldn't load rankings. Try again."))
      .finally(() => setLoading(false));
  }, [topTab, clanRankingMode]);

  useEffect(() => { loadData(selectedLocation?.id, topTab, clanRankingMode); }, [selectedLocation, topTab, clanRankingMode, loadData]);

  const handleClanRankingModeChange = useCallback((mode) => {
    setClanRankingMode(mode); setTopTab('clans'); setSearchOpen(false); setSearchQuery(''); setSelectedLimit(null);
    setSearchBy(mode === 'war' ? 'name' : 'trophies');
  }, []);

  const handleTopTabChange = useCallback((nextTab) => {
    setTopTab(nextTab); setSearchOpen(false); setSearchQuery(''); setSelectedLimit(null);
    setSearchBy(nextTab === 'clans' ? (clanRankingMode === 'war' ? 'name' : 'trophies') : 'trophies');
  }, [clanRankingMode]);

  const getScore = useCallback((item) => item.trophies ?? item.score ?? item.eloRating ?? item.rating ?? item.leagueNumber ?? item.points ?? '', []);

  const displayedItems = useMemo(() => {
    const source = topTab === 'clans' ? clans : topTab === 'merge' ? mergers : players;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) => {
      if (searchBy === 'name') return String(topTab === 'clans' ? (item.name || item.clan?.name || '') : (item.name || '')).toLowerCase().includes(query);
      const score = topTab === 'clans' && clanRankingMode === 'war'
        ? (item.clanScore ?? item.clanWarTrophies ?? item.score ?? item.trophies ?? item.rating ?? '')
        : getScore(item);
      return String(score).replace(/\D/g, '').startsWith(query.replace(/\D/g, ''));
    });
  }, [topTab, clanRankingMode, clans, mergers, players, searchQuery, searchBy, getScore]);

  const handleSearchRank = useCallback((rankText) => {
    const rankNumber = Number.parseInt(String(rankText).replace(/\D/g, ''), 10);
    if (!Number.isFinite(rankNumber) || rankNumber < 1) return;
    const source = topTab === 'clans' ? clans : topTab === 'merge' ? mergers : players;
    if (source.length === 0) return;
    const exactIndex = source.findIndex((item, index) => Number(item.rank ?? index + 1) === rankNumber);
    const targetIndex = exactIndex >= 0 ? exactIndex : rankNumber - 1;
    if (targetIndex < 0 || targetIndex >= source.length) return;
    const rowHeight = topTab === 'clans' && clanRankingMode === 'war' ? CLAN_ROW_HEIGHT : ROW_HEIGHT;
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: targetIndex * rowHeight, animated: true }));
  }, [topTab, clanRankingMode, clans, mergers, players]);

  const handleSelectLimit = useCallback((limit) => {
    setSelectedLimit(limit); Keyboard.dismiss();
    const sourceLength = topTab === 'clans' ? clans.length : topTab === 'merge' ? mergers.length : players.length;
    if (sourceLength === 0) return;
    const rowHeight = topTab === 'clans' && clanRankingMode === 'war' ? CLAN_ROW_HEIGHT : ROW_HEIGHT;
    const targetIndex = Math.min(limit - 1, sourceLength - 1);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: Math.max(0, targetIndex * rowHeight), animated: true }));
  }, [topTab, clanRankingMode, clans.length, mergers.length, players.length]);

  const handleScroll = useCallback((event) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const offset = Math.max(0, contentOffset.y);
    const delta = offset - lastOffset.current;
    lastOffset.current = offset; setViewportHeight(layoutMeasurement.height);
    if (offset <= 80) {
      setShowJumpButton(false); setJumpToTop(false); lastDirectionOffset.current = offset; return;
    }
    setShowJumpButton(true);
    if (delta < -2) { lastDirectionOffset.current = offset; setJumpToTop(true); }
    else if (delta > 12 || offset > lastDirectionOffset.current + 12) { lastDirectionOffset.current = offset; setJumpToTop(false); }
  }, []);

  useEffect(() => { Animated.spring(jumpVisibility, { toValue: showJumpButton ? 1 : 0, friction: 8, tension: 70, useNativeDriver: true }).start(); }, [showJumpButton, jumpVisibility]);
  useEffect(() => { Animated.spring(jumpRotation, { toValue: jumpToTop ? 1 : 0, friction: 7, tension: 70, useNativeDriver: true }).start(); }, [jumpToTop, jumpRotation]);

  const handleJump = useCallback(() => {
    if (jumpToTop) { listRef.current?.scrollToOffset({ offset: 0, animated: true }); return; }
    listRef.current?.scrollToOffset({ offset: Math.max(0, contentHeight - viewportHeight), animated: true });
  }, [jumpToTop, contentHeight, viewportHeight]);

  const rowHeight = topTab === 'clans' && clanRankingMode === 'war' ? CLAN_ROW_HEIGHT : ROW_HEIGHT;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <AppHeader />
      <TopTabs value={topTab} onChange={handleTopTabChange} clanRankingMode={clanRankingMode} onClanRankingModeChange={handleClanRankingModeChange} />
      <LocationBar countries={countries} selected={selectedLocation} visible={menuVisible} onOpen={() => setMenuVisible(true)} onClose={() => setMenuVisible(false)}
        onSelect={(loc) => { setSelectedLocation(loc); setMenuVisible(false); }} selectedLimit={selectedLimit} onSelectLimit={handleSelectLimit}
        onSearchRank={handleSearchRank} searchOpen={searchOpen} onSearchOpen={() => setSearchOpen(true)} onSearchClose={() => { setSearchOpen(false); setSearchQuery(''); }}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} searchBy={searchBy}
        onSearchByChange={(mode) => { setSearchBy(mode); setSearchQuery(''); }} isMergeTab={topTab === 'merge'} />

      {!error && (
        <View style={styles.listWrap} onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}>
          <FlatList ref={listRef} data={displayedItems}
            keyExtractor={(item, idx) => item.tag || item.id || `${item.name || 'item'}-${item.rank ?? idx}`}
            renderItem={({ item, index }) => topTab === 'clans' && clanRankingMode === 'war'
              ? <ClanRow item={item} index={index} animationKey={animationKey} />
              : <RankRow item={item} index={index} animationKey={animationKey} />}
            contentContainerStyle={styles.listContent} style={styles.list}
            getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
            initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7}
            onScroll={handleScroll} scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadData(selectedLocation?.id, topTab)}
              colors={[theme.colors.primary]} progressBackgroundColor={theme.colors.surfaceContainerHighest} progressViewOffset={4} tintColor={theme.colors.primary} />}
            onContentSizeChange={(_, height) => setContentHeight(height)} keyboardShouldPersistTaps="handled"
            ListEmptyComponent={!loading ? <View style={styles.empty}>
              <MaterialCommunityIcons name={topTab === 'clans' ? 'account-group-outline' : 'account-search-outline'} size={34} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {searchQuery ? 'No results found' : topTab === 'clans' ? (clanRankingMode === 'war' ? 'No Clan Wars rankings available' : 'No Path of Legends rankings available') : topTab === 'merge' ? 'No Merge Tactics rankings available' : 'No rankings available'}
              </Text>
            </View> : null}
          />
          {displayedItems.length > 0 && (
            <Animated.View pointerEvents={showJumpButton ? 'auto' : 'none'} style={[styles.jumpAnimated, {
              opacity: jumpVisibility,
              transform: [
                { scale: jumpVisibility.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
                { translateY: jumpVisibility.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            }]}>
              <Surface style={[styles.jumpSurface, { backgroundColor: theme.colors.primaryContainer }]} elevation={3}>
                <Animated.View style={{ transform: [{ rotate: jumpRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                  <IconButton icon="chevron-down" iconColor={theme.colors.onPrimaryContainer} size={25} onPress={handleJump} style={styles.jumpButton} />
                </Animated.View>
              </Surface>
            </Animated.View>
          )}
          {loading && displayedItems.length === 0 && <View pointerEvents="none" style={styles.initialLoadingOverlay} />}
        </View>
      )}

      {error && <View style={styles.center}>
        <Text style={[styles.errorText, { color: theme.colors.onSurface }]}>{error}</Text>
        <Button mode="contained" onPress={() => loadData(selectedLocation?.id, topTab)} style={styles.retry}>Retry</Button>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listWrap: { flex: 1, marginTop: 6, paddingTop: 0, zIndex: 0, elevation: 0 },
  list: { marginTop: 0, paddingTop: 0 },
  listContent: { paddingTop: 0, paddingBottom: 108, marginTop: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { textAlign: 'center' },
  retry: { marginTop: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 28, paddingHorizontal: 24 },
  emptyText: { marginTop: 8, fontSize: 13 },
  jumpAnimated: { position: 'absolute', right: 18, bottom: 18 },
  jumpSurface: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  jumpButton: { margin: 0, width: 50, height: 50 },
  initialLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});