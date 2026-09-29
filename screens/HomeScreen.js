// * screens/HomeScreen.js — fluid animated home screen (v53)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchSearch } from '../api/client';
import EntityDetailsScreen from './EntityDetailsScreen';
import TournamentDetailsScreen from './TournamentDetailsScreen';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;
  const searchProgress = useRef(new Animated.Value(0)).current;
  const resultsProgress = useRef(new Animated.Value(0)).current;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);

  useEffect(() => {
    Animated.spring(searchProgress, { toValue: searchOpen ? 1 : 0, friction: 8, tension: 75, useNativeDriver: true }).start();
    if (!searchOpen) { setQuery(''); setResults([]); Keyboard.dismiss(); }
  }, [searchOpen, searchProgress]);

  useEffect(() => {
    const value = query.trim();
    if (!value) { setResults([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      fetchSearch(value).then((items) => {
        if (cancelled) return;
        setResults(Array.isArray(items) ? items : []);
        resultsProgress.setValue(0);
        Animated.spring(resultsProgress, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }).start();
      }).catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 320);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, resultsProgress]);

  if (selectedEntity) {
    if (selectedEntity.type === 'tournament') return <TournamentDetailsScreen entity={selectedEntity.data} onBack={() => setSelectedEntity(null)} />;
    return <EntityDetailsScreen entity={selectedEntity.data} type={selectedEntity.type} onBack={() => setSelectedEntity(null)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.homeTopBar, { top: insets.top + 10 }]}>
        <Animated.View style={[styles.searchCapsule, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant, opacity: searchProgress, transform: [{ scaleX: searchProgress }] }]} pointerEvents={searchOpen ? 'auto' : 'none'}>
          <MaterialCommunityIcons name="magnify" size={21} color={theme.colors.onSurfaceVariant} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search player, clan or tournament" placeholderTextColor={theme.colors.onSurfaceVariant} style={[styles.searchInput, { color: theme.colors.onSurface }]} autoFocus={searchOpen} />
          {searching ? <MaterialCommunityIcons name="loading" size={19} color={theme.colors.primary} /> : <Pressable onPress={() => setSearchOpen(false)} hitSlop={10}><MaterialCommunityIcons name="close" size={19} color={theme.colors.onSurfaceVariant} /></Pressable>}
        </Animated.View>
        <Animated.View style={[styles.searchButtonWrap, { opacity: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }] }]} pointerEvents={searchOpen ? 'none' : 'auto'}>
          <Pressable onPress={() => setSearchOpen(true)} style={[styles.searchButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}><MaterialCommunityIcons name="magnify" size={22} color={theme.colors.onSurface} /></Pressable>
        </Animated.View>
      </View>
      {searchOpen && <Animated.View style={[styles.resultsPanel, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant, opacity: resultsProgress, transform: [{ translateY: resultsProgress.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
        {results.length === 0 && !searching ? <Text style={[styles.noResults, { color: theme.colors.onSurfaceVariant }]}>{query.trim() ? 'No results found' : 'Search by player, clan or tournament name / tag'}</Text> : results.map((result, index) => {
          const data = result.data || result;
          const type = result.type || data.type;
          const name = result.name || data.name || 'Unknown';
          const tag = result.tag || data.tag;
          return <Pressable key={String(result.id || tag || name + index)} onPress={() => { Keyboard.dismiss(); setSelectedEntity({ type, data }); }} style={styles.resultRow}>
            <View style={[styles.resultIcon, { backgroundColor: theme.colors.primaryContainer }]}><MaterialCommunityIcons name={type === 'player' ? 'account' : type === 'clan' ? 'account-group' : 'trophy-outline'} size={20} color={theme.colors.onPrimaryContainer} /></View>
            <View style={styles.resultText}><Text numberOfLines={1} style={[styles.resultName, { color: theme.colors.onSurface }]}>{name}</Text><Text numberOfLines={1} style={[styles.resultMeta, { color: theme.colors.onSurfaceVariant }]}>{type === 'player' ? 'Player' : type === 'clan' ? 'Clan' : 'Tournament'}{tag ? ' · ' + tag : ''}</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={21} color={theme.colors.onSurfaceVariant} />
          </Pressable>;
        })}
      </Animated.View>}
      <Animated.View style={[styles.content, {
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }]}>
        <Surface elevation={0} style={[styles.card, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="home-variant" size={32} color={theme.colors.onPrimaryContainer} />
          </View>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>My Royale</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Your Clash Royale hub</Text>
        </Surface>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  homeTopBar: { position: 'absolute', top: 10, left: 14, right: 14, height: 52, zIndex: 20, alignItems: 'flex-end', justifyContent: 'center' },
  searchButtonWrap: { position: 'absolute', right: 0 },
  searchButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchCapsule: { position: 'absolute', left: 0, right: 0, height: 46, borderRadius: 23, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  searchInput: { flex: 1, marginHorizontal: 8, paddingVertical: 0, fontSize: 13 },
  resultsPanel: { position: 'absolute', top: 68, left: 14, right: 14, zIndex: 19, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 8, elevation: 8 },
  resultRow: { minHeight: 58, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 3 },
  resultIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, marginLeft: 10 },
  resultName: { fontSize: 13.5, fontWeight: '800' },
  resultMeta: { marginTop: 3, fontSize: 10.5 },
  noResults: { padding: 16, textAlign: 'center', fontSize: 12 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, minHeight: 210, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 23, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13 },
});