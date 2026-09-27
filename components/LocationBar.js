// * components/LocationBar.js — fluid animated controls, popup dismissal, and aligned popup search controls and Global row layout (v60)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Keyboard, Text, useWindowDimensions, ScrollView, Easing, Pressable } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { Menu, Button, IconButton, TextInput, useTheme, Divider, Portal, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AnimatedSurface = Animated.createAnimatedComponent(Surface);
const LIMITS = [100, 250, 500];
const CONTROL_HEIGHT = 36;
const ICON_SIZE = 17;

export default function LocationBar({ countries, selected, visible, onOpen, onClose, onSelect, selectedLimit, onSelectLimit, onSearchRank, searchOpen, onSearchOpen, onSearchClose, searchQuery, onSearchQueryChange, searchBy, onSearchByChange, isMergeTab = false }) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const fixedControlWidth = 82;
  const countryWidth = Math.max(120, windowWidth - 28 - fixedControlWidth * 2 - 10);
  const searchRef = useRef(null);
  const [limitMenuVisible, setLimitMenuVisible] = useState(false);
  const [searchMenuVisible, setSearchMenuVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [rankSearch, setRankSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [countrySearchFocused, setCountrySearchFocused] = useState(false);
  const [countryMenuPosition, setCountryMenuPosition] = useState(null);
  const [rankMenuPosition, setRankMenuPosition] = useState(null);
  const countryPopupAnim = useRef(new Animated.Value(0)).current;
  const rankPopupAnim = useRef(new Animated.Value(0)).current;
  const countryAnchorRef = useRef(null);
  const rankAnchorRef = useRef(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  const closeSearch = () => { Keyboard.dismiss(); onSearchClose(); };

  useEffect(() => {
    if (!countryMenuPosition) return;
    countryPopupAnim.setValue(0);
    Animated.timing(countryPopupAnim, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [countryMenuPosition, countryPopupAnim]);

  useEffect(() => {
    if (!rankMenuPosition) return;
    rankPopupAnim.setValue(0);
    Animated.timing(rankPopupAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rankMenuPosition, rankPopupAnim]);

  const popupAnimation = (value) => ({
    opacity: value,
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  });

  const filteredCountries = countries.filter((country) => String(country.name || '').toLowerCase().includes(countrySearch.trim().toLowerCase()));
  const searchPlaceholder = searchBy === 'trophies' ? 'Search trophies' : (searchBy === 'name' ? 'Search clan name' : 'Search player name');
  const searchByIcon = searchBy === 'trophies' ? 'trophy-outline' : 'account-group-outline';

  if (searchOpen) {
    return (
      <Animated.View style={[styles.searchRow, {
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-7, 0] }) }],
      }]}>
        <View style={[styles.searchFieldWrap, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
          <MaterialCommunityIcons name="magnify" size={ICON_SIZE} color={theme.colors.onSurfaceVariant} />
          <TextInput ref={searchRef} mode="flat" value={searchQuery} onChangeText={onSearchQueryChange} placeholder={searchPlaceholder} placeholderTextColor={searchFocused ? theme.colors.outline : theme.colors.onSurfaceVariant} textColor={theme.colors.onSurface} cursorColor={theme.colors.primary} underlineColor="transparent" activeUnderlineColor="transparent" style={styles.searchInput} contentStyle={styles.searchInputContent} keyboardType={searchBy === 'trophies' ? 'numeric' : 'default'} returnKeyType="search" onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          <Menu visible={searchMenuVisible} onDismiss={() => setSearchMenuVisible(false)} anchor={
            <Button compact mode="text" icon={({ color }) => <View style={styles.searchByIconRow}><MaterialCommunityIcons name={searchByIcon} size={15} color={color} /><MaterialCommunityIcons name="chevron-down" size={15} color={color} /></View>} contentStyle={styles.searchByButtonContent} labelStyle={[styles.searchByLabel, { color: theme.colors.onSurface }]} textColor={theme.colors.onSurface} onPress={() => setSearchMenuVisible(true)}>Search By</Button>
          } contentStyle={[styles.menu, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Menu.Item title="Trophies / Cups" leadingIcon="trophy-outline" onPress={() => { onSearchByChange('trophies'); setSearchMenuVisible(false); }} />
            <Menu.Item title="Clan Name" leadingIcon="account-group-outline" onPress={() => { onSearchByChange('name'); setSearchMenuVisible(false); }} />
          </Menu>
          <IconButton icon="close" size={19} iconColor={theme.colors.onSurfaceVariant} onPress={closeSearch} style={styles.searchClose} />
        </View>
      </Animated.View>
    );
  }

  const rowAnimationStyle = {
    opacity: entrance,
    transform: [{
      translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-7, 0] }),
    }],
  };

  return (
    <Animated.View style={[styles.row, rowAnimationStyle]}>
      <AnimatedPressable ref={countryAnchorRef} disabled={isMergeTab} onPress={() => { if (isMergeTab) return; setCountrySearch(''); countryAnchorRef.current?.measureInWindow((x, y, width, height) => { setCountryMenuPosition({ x, y: y + height, width }); onOpen(); }); }} wrapperStyle={[styles.control, { width: countryWidth }]} style={[styles.control, { width: countryWidth, backgroundColor: theme.colors.surfaceContainerHighest }]} android_ripple={isMergeTab ? undefined : { color: theme.colors.onSurfaceVariant, borderless: false }}>
        <View style={styles.anchorContent}>
          {selected?.id === 'global' && <MaterialCommunityIcons name="earth" size={ICON_SIZE} color={theme.colors.onSurfaceVariant} />}
          <Text numberOfLines={1} style={[styles.anchorText, { color: theme.colors.onSurface }]}>{selected?.name || 'Select Country'}</Text>
          {!isMergeTab && <MaterialCommunityIcons name="chevron-down" size={ICON_SIZE} color={theme.colors.onSurfaceVariant} />}
        </View>
      </AnimatedPressable>

      {countryMenuPosition && (
        <Portal>
          <Pressable style={styles.backdrop} onPress={() => { setCountrySearch(''); setCountryMenuPosition(null); onClose(); }} />
          <Animated.View style={[styles.countryPopupAnimated, popupAnimation(countryPopupAnim), { left: Math.max(8, Math.min(countryMenuPosition.x + countryMenuPosition.width / 2 - 141, windowWidth - 290)), top: countryMenuPosition.y + 4, backgroundColor: theme.colors.surfaceContainer }]}>
            <Surface elevation={4} style={[styles.countryPopupSurface, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.popupHeader}>
                <View style={[styles.countrySearchWrap, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                  <TextInput mode="flat" value={countrySearch} onChangeText={setCountrySearch} placeholder="Search countries" left={<TextInput.Icon icon="magnify" />} style={styles.countrySearch} textColor={theme.colors.onSurface} placeholderTextColor={countrySearchFocused ? theme.colors.outline : theme.colors.onSurfaceVariant} cursorColor={theme.colors.primary} underlineColor="transparent" activeUnderlineColor="transparent" onFocus={() => setCountrySearchFocused(true)} onBlur={() => setCountrySearchFocused(false)} />
                </View>
                <IconButton icon="close" size={18} iconColor={theme.colors.onSurfaceVariant} onPress={() => { setCountrySearch(''); setCountryMenuPosition(null); onClose(); }} style={[styles.popupCloseCircle, { backgroundColor: theme.colors.surfaceContainerHighest }]} />
              </View>
              <Divider />
              <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled">
                <AnimatedPressable wrapperStyle={styles.countryItem} style={styles.popupPressable} onPress={() => { setCountryMenuPosition(null); onClose(); onSelect({ id: 'global', name: 'Global' }); }}>
                  <MaterialCommunityIcons name="earth" size={21} color={theme.colors.onSurfaceVariant} /><Text style={[styles.countryItemText, { color: theme.colors.onSurface }]}>Global</Text>
                </AnimatedPressable>
                {filteredCountries.map((c) => <AnimatedPressable key={c.id} wrapperStyle={styles.countryItem} style={styles.popupPressable} onPress={() => { setCountryMenuPosition(null); onClose(); onSelect({ id: c.id, name: c.name }); }}><Text style={[styles.countryItemText, { color: theme.colors.onSurface }]}>{c.name}</Text></AnimatedPressable>)}
              </ScrollView>
            </Surface>
          </Animated.View>
        </Portal>
      )}

      <AnimatedPressable ref={rankAnchorRef} onPress={() => { rankAnchorRef.current?.measureInWindow((x, y, width, height) => { setRankMenuPosition({ x, y: y + height, width }); setLimitMenuVisible(true); }); }} wrapperStyle={[styles.controlButton, { width: fixedControlWidth }]} style={[styles.controlButton, { width: fixedControlWidth, backgroundColor: theme.colors.surfaceContainerHighest }]} android_ripple={{ color: theme.colors.onSurfaceVariant, borderless: false }}>
        <View style={styles.buttonInner}><MaterialCommunityIcons name="format-list-numbered" size={ICON_SIZE} color={theme.colors.onSurface} /><Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>{selectedLimit || 'Rank'}</Text></View>
      </AnimatedPressable>

      {limitMenuVisible && rankMenuPosition && (
        <Portal>
          <Pressable style={styles.backdrop} onPress={() => { setRankSearch(''); setLimitMenuVisible(false); setRankMenuPosition(null); }} />
          <AnimatedSurface elevation={4} style={[styles.rankPopup, popupAnimation(rankPopupAnim), { left: Math.max(8, Math.min(rankMenuPosition.x + rankMenuPosition.width / 2 - 125, windowWidth - 266)), top: rankMenuPosition.y + 4, backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={styles.popupHeader}>
              <View style={[styles.rankSearchWrap, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <TextInput value={rankSearch} onChangeText={(value) => setRankSearch(value.replace(/\D/g, ''))} placeholder="Search rank" left={<TextInput.Icon icon="magnify" />} right={rankSearch ? <TextInput.Icon icon="arrow-right" onPress={() => { onSearchRank?.(rankSearch); setRankSearch(''); setLimitMenuVisible(false); setRankMenuPosition(null); }} /> : null} mode="flat" keyboardType="numeric" returnKeyType="search" onSubmitEditing={() => { if (!rankSearch) return; onSearchRank?.(rankSearch); setRankSearch(''); setLimitMenuVisible(false); setRankMenuPosition(null); }} style={styles.rankSearch} textColor={theme.colors.onSurface} placeholderTextColor={theme.colors.onSurfaceVariant} cursorColor={theme.colors.primary} underlineColor="transparent" activeUnderlineColor="transparent" />
              </View>
              <IconButton icon="close" size={18} iconColor={theme.colors.onSurfaceVariant} onPress={() => { setRankSearch(''); setLimitMenuVisible(false); setRankMenuPosition(null); }} style={[styles.popupCloseCircle, { backgroundColor: theme.colors.surfaceContainerHighest }]} />
            </View>
            <Divider />
            <View style={styles.rankPresetsRow}>
              {LIMITS.map((limit) => <AnimatedPressable key={limit} wrapperStyle={styles.rankItem} style={styles.popupPressable} onPress={() => { onSelectLimit(limit); setRankSearch(''); setLimitMenuVisible(false); setRankMenuPosition(null); }} android_ripple={{ color: theme.colors.onSurfaceVariant }}><Text style={[styles.rankItemText, { color: theme.colors.onSurface }]}>{String(limit)}</Text></AnimatedPressable>)}
            </View>
          </AnimatedSurface>
        </Portal>
      )}

      <AnimatedPressable onPress={onSearchOpen} wrapperStyle={[styles.controlButton, { width: fixedControlWidth }]} style={[styles.controlButton, { width: fixedControlWidth, backgroundColor: theme.colors.surfaceContainerHighest }]} android_ripple={{ color: theme.colors.onSurfaceVariant, borderless: false }}>
        <View style={styles.buttonInner}><MaterialCommunityIcons name="magnify" size={ICON_SIZE} color={theme.colors.onSurfaceVariant} /><Text style={[styles.controlLabel, { color: theme.colors.onSurface }]}>Find</Text></View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { zIndex: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7, gap: 5, height: 56 },
  control: { flexGrow: 0, flexShrink: 0, height: CONTROL_HEIGHT, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  anchorContent: { width: '100%', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  anchorText: { flex: 1, fontSize: 12.5, fontWeight: '600', textAlign: 'center', transform: [{ translateY: -2 }] },
  countrySearchWrap: { flex: 1, height: 40, marginLeft: 8, marginRight: 8, borderRadius: 20, overflow: 'hidden' },
  countrySearch: { width: '100%', height: 40, backgroundColor: 'transparent' },
  controlButton: { flexGrow: 0, flexShrink: 0, height: CONTROL_HEIGHT, minHeight: CONTROL_HEIGHT, borderRadius: 18, overflow: 'hidden' },
  buttonInner: { height: CONTROL_HEIGHT, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 5 },
  controlLabel: { fontSize: 12.5, fontWeight: '600', includeFontPadding: false, lineHeight: 15, transform: [{ translateY: -1 }] },
  searchRow: { zIndex: 5, elevation: 0, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7, height: 56 },
  searchFieldWrap: { height: CONTROL_HEIGHT, width: '100%', flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingLeft: 10 },
  searchInput: { flex: 1, height: CONTROL_HEIGHT, backgroundColor: 'transparent', fontSize: 13.5 },
  searchInputContent: { paddingHorizontal: 7 },
  searchByButtonContent: { flexDirection: 'row-reverse', paddingHorizontal: 2 },
  searchByIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 9 },
  searchByLabel: { fontSize: 11.5, fontWeight: '700', marginHorizontal: 0, transform: [{ translateY: -2.5 }] },
  searchClose: { margin: 0 },
  menu: { borderRadius: 16 },
  countryPopupAnimated: { width: 300, maxHeight: 520, borderRadius: 22, overflow: 'visible', position: 'absolute', zIndex: 1001 },
  countryPopupSurface: { width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden' },
  rankPopup: { width: 250, borderRadius: 22, overflow: 'hidden', position: 'absolute', paddingVertical: 4, zIndex: 1001 },
  rankSearchWrap: { flex: 1, height: 40, marginLeft: 8, marginRight: 8, borderRadius: 20, overflow: 'hidden' },
  rankSearch: { width: '100%', height: 40, backgroundColor: 'transparent' },
  rankPresetsRow: { flexDirection: 'row', width: '100%', paddingHorizontal: 4 },
  rankItem: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  rankItemText: { fontSize: 14, textAlign: 'center' },
  countryList: { maxHeight: 450 },
  countryItem: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  countryItemText: { fontSize: 14, flexShrink: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1000, backgroundColor: 'transparent' },
  popupPressable: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  popupHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  popupCloseCircle: { width: 40, height: 40, borderRadius: 20, margin: 0, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
});