// * screens/HomeScreen.js — Home search with results, history, and tag lookup (v54)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchSearch } from '../api/client';
import EntityDetailsScreen from './EntityDetailsScreen';
import TournamentDetailsScreen from './TournamentDetailsScreen';

export default function HomeScreen({ onNavigate }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;
  const searchProgress = useRef(new Animated.Value(0)).current;
  const resultsProgress = useRef(new Animated.Value(0)).current;
  const spinnerProgress = useRef(new Animated.Value(0)).current;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSearchOpen(false);
      return true;
    });

    return () => subscription.remove();
  }, [searchOpen]);

  useEffect(() => {
    Animated.spring(searchProgress, { toValue: searchOpen ? 1 : 0, friction: 8, tension: 75, useNativeDriver: true }).start();
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      Keyboard.dismiss();
    }
  }, [searchOpen, searchProgress]);

  useEffect(() => {
    if (!searching) {
      spinnerProgress.stopAnimation();
      spinnerProgress.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(spinnerProgress, { toValue: 1, duration: 800, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [searching, spinnerProgress]);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults([]);
      setSearching(false);
      resultsProgress.setValue(0);
      return undefined;
    }

    resultsProgress.setValue(0);
    Animated.spring(resultsProgress, {
      toValue: 1,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        let items = [];
        items = await fetchSearch(value);

        if (cancelled) return;
        setResults(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, resultsProgress]);

  const addToHistory = (result) => {
    const data = result.data || result;
    const entry = {
      type: result.type || data.type,
      name: result.name || data.name || 'Unknown',
      tag: result.tag || data.tag || '',
      data,
    };
    setSearchHistory((current) => [
      entry,
      ...current.filter((item) =>
        (item.type + ':' + (item.tag || item.name)) !== (entry.type + ':' + (entry.tag || entry.name))
      ),
    ].slice(0, 3));
  };

  const removeHistory = (item) => {
    const key = item.type + ':' + (item.tag || item.name);
    setSearchHistory((current) =>
      current.filter((entry) => (entry.type + ':' + (entry.tag || entry.name)) !== key)
    );
  };

  const openHistoryItem = (item) => {
    setQuery(item.tag || item.name);
  };

  if (selectedEntity) {
    if (selectedEntity.type === 'tournament') {
      return <TournamentDetailsScreen entity={selectedEntity.data} onBack={() => setSelectedEntity(null)} />;
    }
    return <EntityDetailsScreen entity={selectedEntity.data} type={selectedEntity.type} onBack={() => setSelectedEntity(null)} />;
  }

  const resultsTop = insets.top + 68;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.homeTopBar, { top: insets.top + 10 }]}>
        <Animated.View
          style={[
            styles.searchCapsule,
            {
              backgroundColor: theme.colors.surfaceContainer,
              borderColor: theme.colors.outlineVariant,
              opacity: searchProgress,
              transform: [{ translateY: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
          pointerEvents={searchOpen ? 'auto' : 'none'}
        >
          <MaterialCommunityIcons name="magnify" size={21} color={theme.colors.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search player, clan or tournament"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[styles.searchInput, { color: theme.colors.onSurface }]}
            editable={true}
            autoFocus={searchOpen}
            contextMenuHidden={false}
          />
          {searching ? (
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spinnerProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <MaterialCommunityIcons name="loading" size={19} color={theme.colors.primary} />
            </Animated.View>
          ) : (
            <Pressable onPress={() => setSearchOpen(false)} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={19} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.searchButtonWrap,
            {
              opacity: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ scale: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }],
            },
          ]}
          pointerEvents={searchOpen ? 'none' : 'auto'}
        >
          <Pressable
            onPress={() => setSearchOpen(true)}
            style={[styles.searchButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
          >
            <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.onSurface} />
          </Pressable>
        </Animated.View>
      </View>

      {searchOpen && !query.trim() && searchHistory.length > 0 && (
        <View
          style={[
            styles.historyPanel,
            {
              top: resultsTop,
              backgroundColor: theme.colors.surfaceContainer,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {searchHistory.map((item, index) => (
            <Pressable
              key={item.type + ':' + (item.tag || item.name) + ':' + index}
              onPress={() => openHistoryItem(item)}
              style={styles.historyRow}
            >
              <MaterialCommunityIcons
                name={item.type === 'player' ? 'account' : item.type === 'clan' ? 'account-group' : 'trophy-outline'}
                size={19}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.historyText}>
                <Text numberOfLines={1} style={[styles.historyName, { color: theme.colors.onSurface }]}>
                  {item.name}
                </Text>
                {!!item.tag && (
                  <Text numberOfLines={1} style={[styles.historyTag, { color: theme.colors.onSurfaceVariant }]}>
                    {item.tag}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => removeHistory(item)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {searchOpen && (query.trim() || searching) && (
        <Animated.View
          style={[
            styles.resultsPanel,
            {
              top: resultsTop,
              backgroundColor: theme.colors.surfaceContainer,
              borderColor: theme.colors.outlineVariant,
              opacity: resultsProgress,
              transform: [
                { translateY: resultsProgress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
                { scale: resultsProgress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          {results.length === 0 && !searching ? (
            <Text style={[styles.noResults, { color: theme.colors.onSurfaceVariant }]}>No results found</Text>
          ) : (
            results.map((result, index) => {
              const data = result.data || result;
              const type = result.type || data.type;
              const name = result.name || data.name || 'Unknown';
              const tag = result.tag || data.tag;

              return (
                <Pressable
                  key={String(result.id || tag || name + index)}
                  onPress={() => {
                    Keyboard.dismiss();
                    addToHistory(result);
                    setSelectedEntity({ type, data });
                  }}
                  style={styles.resultRow}
                >
                  <View style={[styles.resultIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                      name={type === 'player' ? 'account' : type === 'clan' ? 'account-group' : 'trophy-outline'}
                      size={20}
                      color={theme.colors.onPrimaryContainer}
                    />
                  </View>
                  <View style={styles.resultText}>
                    <Text numberOfLines={1} style={[styles.resultName, { color: theme.colors.onSurface }]}>
                      {name}
                    </Text>
                    <Text numberOfLines={1} style={[styles.resultMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {type === 'player' ? 'Player' : type === 'clan' ? 'Clan' : 'Tournament'}{tag ? ' · ' + tag : ''}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={21} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              );
            })
          )}
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
              { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              <View>
                <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>WELCOME TO</Text>
                <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]}>My Royale</Text>
              </View>
              <Pressable
                onPress={() => onNavigate?.('profile')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.profileButton,
                  {
                    backgroundColor: theme.colors.surfaceContainerHighest,
                    borderColor: theme.colors.outlineVariant,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name="account-cog-outline" size={22} color={theme.colors.onSurface} />
              </Pressable>
            </View>
            <Text style={[styles.heroSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Everything Clash Royale, in one place.
            </Text>
          </View>

          <Pressable
            onPress={() => setSearchOpen(true)}
            style={({ pressed }) => [
              styles.heroCard,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.outlineVariant,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="crown-outline" size={34} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={styles.heroText}>
              <Text style={[styles.heroCardTitle, { color: theme.colors.onPrimaryContainer }]}>
                Find your Royale
              </Text>
              <Text style={[styles.heroCardSub, { color: theme.colors.onPrimaryContainer }]}>
                Search a player, clan or tournament
              </Text>
            </View>
            <View style={[styles.heroArrow, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
              <MaterialCommunityIcons name="arrow-up-right" size={19} color={theme.colors.onSurface} />
            </View>
          </Pressable>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>QUICK ACCESS</Text>
          </View>

          <View style={styles.quickGrid}>
            {[
              { key: 'rankings', title: 'Rankings', icon: 'trophy-outline' },
              { key: 'cards', title: 'Decks', icon: 'cards-outline' },
              { key: 'rewards', title: 'Rewards', icon: 'gift-outline' },
              { key: 'search', title: 'Search', icon: 'magnify' },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => item.key === 'search' ? setSearchOpen(true) : onNavigate?.(item.key)}
                style={({ pressed }) => [
                  styles.quickItem,
                  {
                    backgroundColor: theme.colors.surfaceContainer,
                    borderColor: theme.colors.outlineVariant,
                    opacity: pressed ? 0.72 : 1,
                    transform: [{ scale: pressed ? 0.975 : 1 }],
                  },
                ]}
              >
                <View style={[styles.quickIcon, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                  <MaterialCommunityIcons name={item.icon} size={23} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>MY ROYALE</Text>
          </View>

          <View
            style={[
              styles.latestCard,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Pressable
              onPress={() => onNavigate?.('rewards')}
              style={styles.latestRow}
            >
              <View style={[styles.latestIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="gift-outline" size={20} color={theme.colors.onPrimaryContainer} />
              </View>
              <View style={styles.latestText}>
                <Text style={[styles.latestTitle, { color: theme.colors.onSurface }]}>Rewards</Text>
                <Text style={[styles.latestMeta, { color: theme.colors.onSurfaceVariant }]}>Check official rewards</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

            <Pressable
              onPress={() => onNavigate?.('cards')}
              style={styles.latestRow}
            >
              <View style={[styles.latestIcon, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <MaterialCommunityIcons name="chart-box-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.latestText}>
                <Text style={[styles.latestTitle, { color: theme.colors.onSurface }]}>Deck Analysis</Text>
                <Text style={[styles.latestMeta, { color: theme.colors.onSurfaceVariant }]}>Explore the current meta</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  homeTopBar: { position: 'absolute', left: 14, right: 14, height: 52, zIndex: 20, alignItems: 'flex-end', justifyContent: 'center' },
  searchButtonWrap: { position: 'absolute', right: 0 },
  searchButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchCapsule: { position: 'absolute', left: 0, right: 0, height: 46, borderRadius: 23, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, zIndex: 30, elevation: 4 },
  searchInput: { flex: 1, marginHorizontal: 8, paddingVertical: 0, fontSize: 13 },
  resultsPanel: { position: 'absolute', left: 14, right: 14, zIndex: 19, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 8, elevation: 8 },
  historyPanel: { position: 'absolute', left: 14, right: 14, zIndex: 19, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 8, elevation: 8 },
  historyRow: { minHeight: 54, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9 },
  historyText: { flex: 1, marginLeft: 10, marginRight: 8 },
  historyName: { fontSize: 13, fontWeight: '700' },
  historyTag: { marginTop: 2, fontSize: 10.5 },
  resultRow: { minHeight: 58, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 3 },
  resultIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, marginLeft: 10 },
  resultName: { fontSize: 13.5, fontWeight: '800' },
  resultMeta: { marginTop: 3, fontSize: 10.5 },
  noResults: { padding: 16, textAlign: 'center', fontSize: 12 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 76, paddingBottom: 104 },
  heroHeader: { marginBottom: 18 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  heroTitle: { fontSize: 31, fontWeight: '800', letterSpacing: -0.7 },
  heroSubtitle: { fontSize: 13, marginTop: 5 },
  profileButton: { width: 44, height: 44, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  heroCard: { minHeight: 142, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -55, top: -70, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroIcon: { width: 64, height: 64, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)' },
  heroText: { flex: 1, marginLeft: 14, marginRight: 8 },
  heroCardTitle: { fontSize: 18, fontWeight: '800' },
  heroCardSub: { fontSize: 11.5, marginTop: 5, opacity: 0.82 },
  heroArrow: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { marginTop: 25, marginBottom: 10, paddingHorizontal: 3 },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickItem: { width: '48.5%', minHeight: 78, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 11, marginBottom: 9, flexDirection: 'row', alignItems: 'center' },
  quickIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  quickTitle: { flex: 1, fontSize: 13, fontWeight: '700' },
  latestCard: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  latestRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 },
  latestIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  latestText: { flex: 1, marginLeft: 11 },
  latestTitle: { fontSize: 13, fontWeight: '750' },
  latestMeta: { fontSize: 10.5, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 7 },
  bottomSpace: { height: 20 },
});