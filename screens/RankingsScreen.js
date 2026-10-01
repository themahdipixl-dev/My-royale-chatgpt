// * screens/RankingsScreen.js — swipe navigation and clan/player detail routing (v78)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, StyleSheet, Keyboard, RefreshControl, Animated, BackHandler, PanResponder } from 'react-native';
import { Text, IconButton, Surface, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchCountries, fetchPathOfLegendRankings, fetchClanWarRankings, fetchMergeTacticsRankings } from '../api/client';
import AppHeader from '../components/AppHeader';
import LocationBar from '../components/LocationBar';
import TopTabs from '../components/TopTabs';
import RankRow, { ROW_HEIGHT } from '../components/RankRow';
import ClanRow, { CLAN_ROW_HEIGHT } from '../components/ClanRow';
import EntityPreviewModal from '../components/EntityPreviewModal';
import EntityDetailsScreen from './EntityDetailsScreen';

const POL_PLAYER_ICON = 'https://royaleapi.github.io/cr-api-assets/arenas/arena24.png';

const TAB_VALUES = ['players', 'clans', 'merge'];

export default function RankingsScreen({ onRequestHome, onRequestBottomNext }) {
  const theme = useTheme();
  const [topTab, setTopTab] = useState('players');
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
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
  const [pagerWidth, setPagerWidth] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const jumpVisibility = useRef(new Animated.Value(0)).current;
  const jumpRotation = useRef(new Animated.Value(0)).current;
  const listRef = useRef(null);
  const locationBarRef = useRef(null);
  const lastOffset = useRef(0);
  const lastDirectionOffset = useRef(0);
  const scrollOffsetsRef = useRef({ players: 0, clans: 0, merge: 0 });
  const [previewEntity, setPreviewEntity] = useState(null);
  const [previewType, setPreviewType] = useState('player');
  const [detailEntity, setDetailEntity] = useState(null);
  const [detailType, setDetailType] = useState('player');
  const tabPagerX = useRef(new Animated.Value(0)).current;
  const tabSwipeProgress = useRef(new Animated.Value(0)).current;
  const pagerWidthRef = useRef(0);
  const countriesLoadedRef = useRef(false);
  const countriesLoadingRef = useRef(false);
  const topTabRef = useRef(topTab);
  const handleTopTabChangeRef = useRef(null);
  const retryTimerRef = useRef(null);
  const detailEntityRef = useRef(detailEntity);
  const wasDetailOpenRef = useRef(Boolean(detailEntity));
  detailEntityRef.current = detailEntity;
  topTabRef.current = topTab;

  const handleCountryOpen = useCallback(() => {
    if (countriesLoadedRef.current || countriesLoadingRef.current) return;

    countriesLoadingRef.current = true;
    setCountriesLoading(true);

    fetchCountries()
      .then((items) => {
        setCountries(items);
        countriesLoadedRef.current = true;
      })
      .catch(() => setCountries([]))
      .finally(() => {
        countriesLoadingRef.current = false;
        setCountriesLoading(false);
      });
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailEntity) return false;

      if (previewEntity) {
        setPreviewEntity(null);
        return true;
      }

      if (locationBarRef.current?.handleBack?.()) {
        return true;
      }

      if (searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        Keyboard.dismiss();
        return true;
      }

      onRequestHome?.();
      return true;
    });

    return () => subscription.remove();
  }, [detailEntity, previewEntity, searchOpen, onRequestHome]);

  const loadData = useCallback((locationId, type = topTab, clanMode = clanRankingMode) => {
    if (!locationId || detailEntityRef.current) return;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setLoading(true);
    setError(null);
    setSelectedLimit(null);
    setSearchQuery('');
    lastOffset.current = 0;
    setShowJumpButton(false);
    setJumpToTop(false);

    const request = type === 'clans'
      ? (clanMode === 'path' ? fetchPathOfLegendRankings(locationId) : fetchClanWarRankings(locationId, 500))
      : type === 'merge' ? fetchMergeTacticsRankings(500) : fetchPathOfLegendRankings(locationId);

    request
      .then((items) => {
        if (detailEntityRef.current) return;
        if (type === 'clans') setClans(items);
        else if (type === 'merge') setMergers(items);
        else setPlayers(items);
        setAnimationKey((value) => value + 1);
        requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        setLoading(false);
      })
      .catch(() => {
        // Keep the loading state active until a request succeeds.
        // Retry only while Rankings is still the visible section.
        if (!detailEntityRef.current) {
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            loadData(locationId, type, clanMode);
          }, 2000);
        }
      })
  }, [topTab, clanRankingMode]);

  useEffect(() => {
    loadData(selectedLocation?.id, topTab, clanRankingMode);
  }, [selectedLocation, topTab, clanRankingMode, loadData]);

  useEffect(() => {
    if (detailEntity) {
      wasDetailOpenRef.current = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setLoading(false);
      return;
    }

    if (wasDetailOpenRef.current) {
      wasDetailOpenRef.current = false;
      loadData(selectedLocation?.id, topTab, clanRankingMode);
    }
  }, [detailEntity, loadData, selectedLocation, topTab, clanRankingMode]);

  useEffect(() => {
    if (detailEntity) return;
    const savedOffset = scrollOffsetsRef.current[topTab] ?? 0;
    if (savedOffset <= 0) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: savedOffset, animated: false }));
    });
  }, [detailEntity, topTab]);

  const handleClanRankingModeChange = useCallback((mode) => {
    setClanRankingMode(mode); setTopTab('clans'); setSearchOpen(false); setSearchQuery(''); setSelectedLimit(null);
    setSearchBy(mode === 'war' ? 'name' : 'trophies');
  }, []);

  const handleTopTabChange = useCallback((nextTab) => {
    setTopTab(nextTab); setSearchOpen(false); setSearchQuery(''); setSelectedLimit(null);
    setSearchBy(nextTab === 'clans' ? (clanRankingMode === 'war' ? 'name' : 'trophies') : 'trophies');
  }, [clanRankingMode]);

  handleTopTabChangeRef.current = handleTopTabChange;

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
    lastOffset.current = offset;
    scrollOffsetsRef.current[topTabRef.current] = offset;
    setViewportHeight(layoutMeasurement.height);
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

  const openPreview = useCallback((entity, type) => {
    setPreviewEntity(entity);
    setPreviewType(type);
  }, []);

  const openClanDetails = useCallback((clan) => {
    setPreviewEntity(null);
    setDetailEntity(clan);
    setDetailType('clan');
  }, []);

  const horizontalSwipeResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
    onPanResponderGrant: () => tabPagerX.stopAnimation(),
    onPanResponderMove: (_, g) => {
      const width = Math.max(1, pagerWidthRef.current);
      const base = -TAB_VALUES.indexOf(topTabRef.current) * width;
      const minX = -(TAB_VALUES.length - 1) * width;
      const nextX = Math.max(minX, Math.min(0, base + g.dx));
      tabPagerX.setValue(nextX);
      tabSwipeProgress.setValue(-nextX / width);
    },
    onPanResponderRelease: (_, g) => {
      const width = Math.max(1, pagerWidthRef.current);
      const index = TAB_VALUES.indexOf(topTabRef.current);
      const next = Math.abs(g.dx) >= width * 0.22 || Math.abs(g.vx) >= 0.45
        ? Math.max(0, Math.min(TAB_VALUES.length - 1, index + (g.dx < 0 ? 1 : -1)))
        : index;
      Animated.spring(tabPagerX, { toValue: -next * width, friction: 8, tension: 72, useNativeDriver: true }).start();
      Animated.spring(tabSwipeProgress, { toValue: next, friction: 8, tension: 72, useNativeDriver: true }).start();
      if (next !== index) {
        handleTopTabChangeRef.current?.(TAB_VALUES[next]);
      } else if (index === TAB_VALUES.length - 1 && g.dx < 0) {
        // From Mergers, continuing the leftward swipe advances the bottom navigation.
        onRequestBottomNext?.();
      }
    },
    onPanResponderTerminate: () => {
      const width = Math.max(1, pagerWidthRef.current);
      Animated.spring(tabPagerX, { toValue: -TAB_VALUES.indexOf(topTabRef.current) * width, friction: 8, tension: 72, useNativeDriver: true }).start();
      Animated.spring(tabSwipeProgress, { toValue: TAB_VALUES.indexOf(topTabRef.current), friction: 8, tension: 72, useNativeDriver: true }).start();
    },
  })).current;

  useEffect(() => {
    if (pagerWidthRef.current <= 0) return;
    const index = TAB_VALUES.indexOf(topTabRef.current);
    Animated.spring(tabPagerX, { toValue: -index * pagerWidthRef.current, friction: 8, tension: 72, useNativeDriver: true }).start();
    Animated.spring(tabSwipeProgress, { toValue: index, friction: 8, tension: 72, useNativeDriver: true }).start();
  }, [topTab, tabPagerX, tabSwipeProgress]);

  const expandPreview = useCallback(() => {
    setDetailEntity(previewEntity);
    setDetailType(previewType);
    setPreviewEntity(null);
  }, [previewEntity, previewType]);

  if (detailEntity) {
    return <EntityDetailsScreen entity={detailEntity} type={detailType} onBack={() => setDetailEntity(null)} />;
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <AppHeader />
      <TopTabs value={topTab} onChange={handleTopTabChange} clanRankingMode={clanRankingMode} onClanRankingModeChange={handleClanRankingModeChange} swipeProgress={tabSwipeProgress} />
      <LocationBar ref={locationBarRef} countries={countries} countriesLoading={countriesLoading} selected={selectedLocation} visible={menuVisible} onOpen={() => { handleCountryOpen(); setMenuVisible(true); }} onClose={() => setMenuVisible(false)}
        onSelect={(loc) => { setSelectedLocation(loc); setMenuVisible(false); }} selectedLimit={selectedLimit} onSelectLimit={handleSelectLimit}
        onSearchRank={handleSearchRank} searchOpen={searchOpen} onSearchOpen={() => setSearchOpen(true)} onSearchClose={() => { setSearchOpen(false); setSearchQuery(''); }}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} searchBy={searchBy} isClanTab={topTab === 'clans'}
        onSearchByChange={(mode) => { setSearchBy(mode); setSearchQuery(''); }} isMergeTab={topTab === 'merge'} />

      {!error && (
        <View
          {...horizontalSwipeResponder.panHandlers}
          style={styles.listWrap}
          onLayout={(event) => {
            setViewportHeight(event.nativeEvent.layout.height);
            pagerWidthRef.current = event.nativeEvent.layout.width;
            setPagerWidth(event.nativeEvent.layout.width);
          }}
        >
          <Animated.View style={[styles.tabPager, { width: Math.max(1, pagerWidth) * 3, transform: [{ translateX: tabPagerX }] }]}>
            {TAB_VALUES.map((tabKey) => {
              const tabItems = tabKey === 'clans' ? clans : tabKey === 'merge' ? mergers : players;
              // Keep every non-active page visually empty during a swipe.
              // Also hide cached data while the active tab is loading, so the
              // destination never flashes stale/partially refreshed rows.
              const visibleTabItems = tabKey === topTab ? tabItems : [];
              const tabRowHeight = tabKey === 'clans' && clanRankingMode === 'war' ? CLAN_ROW_HEIGHT : ROW_HEIGHT;
              return (
                <View key={tabKey} style={[styles.tabPage, { width: Math.max(1, pagerWidth) }]}>
                  <FlatList
                    ref={tabKey === topTab ? listRef : undefined}
                    data={visibleTabItems}
                    keyExtractor={(item, idx) => item.tag || item.id || (item.name || 'item') + '-' + (item.rank ?? idx)}
                    renderItem={({ item, index }) => tabKey === 'clans' && clanRankingMode === 'war'
                      ? <ClanRow item={item} index={index} animationKey={animationKey} onPress={(entity) => openPreview(entity, 'clan')} />
                      : <RankRow item={item} index={index} animationKey={animationKey} trophyIcon={tabKey === 'merge' ? 'trophy-award' : 'trophy'} playerIconUri={tabKey === 'players' ? POL_PLAYER_ICON : undefined} onPress={(entity) => openPreview(entity, 'player')} />}
                    contentContainerStyle={styles.listContent}
                    style={styles.list}
                    getItemLayout={(_, index) => ({ length: tabRowHeight, offset: tabRowHeight * index, index })}
                    initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7}
                    onScroll={tabKey === topTab ? handleScroll : undefined}
                    onContentSizeChange={tabKey === topTab ? (width, height) => setContentHeight(height) : undefined}
                    scrollEventThrottle={16}
                    refreshControl={tabKey === topTab ? <RefreshControl refreshing={loading} onRefresh={() => loadData(selectedLocation?.id, tabKey)}
                      colors={[theme.colors.primary]} progressBackgroundColor={theme.colors.surfaceContainerHighest} progressViewOffset={4} tintColor={theme.colors.primary} /> : undefined}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={<View style={styles.empty}>
                      <MaterialCommunityIcons name={tabKey === 'clans' ? 'account-group-outline' : 'account-search-outline'} size={34} color={theme.colors.onSurfaceVariant} />
                      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                        {searchQuery ? 'No results found' : tabKey === 'clans' ? (clanRankingMode === 'war' ? 'No Clan Wars rankings available' : 'No Path of Legends rankings available') : tabKey === 'merge' ? 'No Merge Tactics rankings available' : 'No rankings available'}
                      </Text>
                    </View>}
                  />
                </View>
              );
            })}
          </Animated.View>
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

      <EntityPreviewModal visible={!!previewEntity} entity={previewEntity} type={previewType} countryName={selectedLocation?.id === 'global' ? null : selectedLocation?.name} onClose={() => setPreviewEntity(null)} onExpand={expandPreview} onClanPress={openClanDetails} />

      {error && null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listWrap: { flex: 1, marginTop: 6, paddingTop: 0, zIndex: 0, elevation: 0, overflow: 'hidden' },
  tabPager: { flexDirection: 'row', flex: 1 },
  tabPage: { flex: 1 },
  list: { marginTop: 0, paddingTop: 0 },
  listContent: { paddingTop: 0, paddingBottom: 108, marginTop: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { textAlign: 'center' },
  retry: { marginTop: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 28, paddingHorizontal: 24 },
  emptyText: { marginTop: 8, fontSize: 13 },
  jumpAnimated: { position: 'absolute', right: 18, bottom: 82 },
  jumpSurface: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  jumpButton: { margin: 0, width: 50, height: 50 },
  initialLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});