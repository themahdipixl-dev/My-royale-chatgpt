// Clan Details screen — shared Material You structure with Player Details.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchClan, fetchClanMembers } from '../api/client';
import { getClanBadgeImage } from '../utils/clanBadges';
import RetryImage from '../components/RetryImage';
import * as Clipboard from 'expo-clipboard';

const firstValue = (...values) => values.find(v => v !== undefined && v !== null && v !== '') ?? null;
const formatNumber = value => { if (value === null || value === undefined || value === '') return '—'; const n=Number(value); return Number.isFinite(n) ? n.toLocaleString() : String(value); };

function StatCard({ icon, label, value, theme, accent = false }) {
  return <View style={[styles.statCard, { backgroundColor: accent ? theme.colors.primaryContainer : theme.colors.surfaceContainerHighest, borderColor: theme.colors.outlineVariant }]}>
    <View style={[styles.statIcon, { backgroundColor: accent ? theme.colors.primary : theme.colors.primaryContainer }]}>
      <MaterialCommunityIcons name={icon} size={19} color={accent ? theme.colors.onPrimary : theme.colors.onPrimaryContainer} />
    </View>
    <Text numberOfLines={1} style={[styles.statLabel, { color: accent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.statValue, { color: accent ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}>{value}</Text>
  </View>;
}

function SectionTitle({ icon, title, right, theme }) {
  return <View style={styles.sectionTitleRow}>
    <View style={styles.sectionTitleLeft}>
      <View style={[styles.sectionIcon, { backgroundColor: theme.colors.primaryContainer }]}><MaterialCommunityIcons name={icon} size={17} color={theme.colors.onPrimaryContainer} /></View>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
    </View>
    {right ? <Text style={[styles.sectionRight, { color: theme.colors.onSurfaceVariant }]}>{right}</Text> : null}
  </View>;
}

function MemberRow({ member, index, theme }) {
  const badge = getClanBadgeImage(member?.badgeId);
  const role = member?.role ? String(member.role).replace(/^./, c => c.toUpperCase()) : 'Member';
  return <Animated.View style={[styles.memberRow, { backgroundColor: theme.colors.surfaceContainerHighest, borderColor: theme.colors.outlineVariant, opacity: 1 }]}>
    <View style={[styles.memberRank, { backgroundColor: index < 3 ? theme.colors.primaryContainer : theme.colors.surfaceContainer }]}>
      <Text style={[styles.memberRankText, { color: theme.colors.onSurface }]}>{index + 1}</Text>
    </View>
    <View style={[styles.memberBadge, { backgroundColor: theme.colors.primaryContainer }]}>
      {badge ? <RetryImage uri={badge} style={styles.memberBadgeImage} resizeMode="contain" /> : <MaterialCommunityIcons name="account-outline" size={19} color={theme.colors.onPrimaryContainer} />}
    </View>
    <View style={styles.memberMain}>
      <Text numberOfLines={1} style={[styles.memberName, { color: theme.colors.onSurface }]}>{member?.name || 'Unknown'}</Text>
      <Text numberOfLines={1} style={[styles.memberRole, { color: theme.colors.onSurfaceVariant }]}>{role}</Text>
    </View>
    <View style={styles.memberScore}>
      <MaterialCommunityIcons name="trophy-outline" size={13} color={theme.colors.primary} />
      <Text style={[styles.memberScoreText, { color: theme.colors.onSurface }]}>{formatNumber(firstValue(member?.trophies, member?.clanRank, member?.donations))}</Text>
    </View>
  </Animated.View>;
}

export default function ClanDetailsScreen({ entity, onBack }) {
  const theme = useTheme();
  const tag = firstValue(entity?.tag, entity?.clan?.tag);
  const [clan, setClan] = useState(entity || null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(tag));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (!tag) { setError('Clan tag is missing.'); setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [profile, memberList] = await Promise.all([fetchClan(tag), fetchClanMembers(tag)]);
      setClan(profile || entity || null);
      setMembers(Array.isArray(memberList) ? memberList : []);
    } catch (e) {
      if (!clan) setError(e?.message || 'Could not load clan details.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [tag, entity, clan]);

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 9, tension: 65, useNativeDriver: true }).start();
    load(false);
  }, [entrance, load]);

  const data = clan || entity || {};
  const name = firstValue(data.name, data.clan?.name, 'Clan');
  const clanTag = firstValue(data.tag, data.clan?.tag, tag);
  const badge = getClanBadgeImage(firstValue(data.badgeId, data.clan?.badgeId));
  const memberCount = firstValue(data.members, data.memberCount, members.length);
  const score = firstValue(data.clanScore, data.clanWarTrophies, data.score, data.trophies);
  const warTrophies = firstValue(data.clanWarTrophies, data.warTrophies);
  const requiredTrophies = firstValue(data.requiredTrophies, data.requiredTrophiesForJoin);
  const donations = firstValue(data.donationsPerWeek, data.donations, data.weeklyDonations);
  const location = firstValue(data.location?.name, data.location, data.country?.name, data.country);
  const description = firstValue(data.description, data.clanDescription);
  const warLeague = firstValue(data.clanWarLeague?.name, data.warLeague?.name, data.warLeague, data.clanWarLeague);

  return <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
    <View style={styles.flex}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={onBack} style={styles.back} />
        <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Clan Details</Text>
      </View>
      {loading && !clan ? <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /><Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading clan...</Text></View> : error && !clan ? <View style={styles.center}>
        <View style={[styles.errorIcon, { backgroundColor: theme.colors.errorContainer }]}><MaterialCommunityIcons name="alert-outline" size={28} color={theme.colors.onErrorContainer} /></View>
        <Text style={[styles.errorTitle, { color: theme.colors.onSurface }]}>Couldn't load clan</Text>
        <Text style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>{error}</Text>
        <Pressable onPress={() => load(false)} style={[styles.retryButton, { backgroundColor: theme.colors.primaryContainer }]}><Text style={[styles.retryText, { color: theme.colors.onPrimaryContainer }]}>Retry</Text></Pressable>
      </View> : <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} colors={[theme.colors.primary]} progressBackgroundColor={theme.colors.surfaceContainerHighest} />}
        contentContainerStyle={styles.content}
        style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange:[0,1], outputRange:[12,0] }) }] }}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroBadgeWrap, { backgroundColor: theme.colors.primaryContainer }]}>{badge ? <RetryImage uri={badge} style={styles.heroBadge} resizeMode="contain" /> : <MaterialCommunityIcons name="account-group-outline" size={38} color={theme.colors.primary} />}</View>
            <View style={styles.heroIdentity}>
              <Text numberOfLines={1} style={[styles.heroName, { color: theme.colors.onSurface }]}>{name}</Text>
              <Pressable onPress={() => clanTag && Clipboard.setStringAsync(String(clanTag))} disabled={!clanTag} style={styles.tagPressable}>
                <Text selectable numberOfLines={1} style={[styles.heroTag, { color: theme.colors.primary }]}>{clanTag || '—'}</Text><MaterialCommunityIcons name="content-copy" size={13} color={theme.colors.primary} />
              </Pressable>
              <Text numberOfLines={1} style={[styles.heroSub, { color: theme.colors.onSurfaceVariant }]}>{location || 'Global'} · {formatNumber(memberCount)} members</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <StatCard icon="trophy-outline" label="Clan score" value={formatNumber(score)} theme={theme} accent />
            <StatCard icon="account-multiple" label="Members" value={formatNumber(memberCount)} theme={theme} />
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard icon="sword-cross" label="War trophies" value={formatNumber(warTrophies)} theme={theme} />
          <StatCard icon="trophy-outline" label="Required trophies" value={formatNumber(requiredTrophies)} theme={theme} />
          <StatCard icon="shield-star-outline" label="War league" value={warLeague || '—'} theme={theme} />
          <StatCard icon="account-multiple-check" label="Donations / week" value={formatNumber(donations)} theme={theme} />
        </View>

        {(description || location) ? <View style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
          <SectionTitle icon="information-outline" title="Clan information" theme={theme} />
          {description ? <Text style={[styles.description, { color: theme.colors.onSurface }]}>{description}</Text> : null}
          <View style={styles.infoRows}>
            {location ? <View style={styles.infoRow}><MaterialCommunityIcons name="earth" size={18} color={theme.colors.primary} /><Text style={[styles.infoLabel,{color:theme.colors.onSurfaceVariant}]}>Country</Text><Text numberOfLines={1} style={[styles.infoValue,{color:theme.colors.onSurface}]}>{location}</Text></View> : null}
            <View style={styles.infoRow}><MaterialCommunityIcons name="tag-outline" size={18} color={theme.colors.primary} /><Text style={[styles.infoLabel,{color:theme.colors.onSurfaceVariant}]}>Clan tag</Text><Text selectable numberOfLines={1} style={[styles.infoValue,{color:theme.colors.onSurface}]}>{clanTag || '—'}</Text></View>
          </View>
        </View> : null}

        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
          <SectionTitle icon="account-group" title="Members" right={memberCount !== null ? String(memberCount) : undefined} theme={theme} />
          {members.length ? members.map((member,index) => <MemberRow key={member?.tag || member?.name || index} member={member} index={index} theme={theme} />) : <View style={styles.empty}><MaterialCommunityIcons name="account-group-outline" size={28} color={theme.colors.onSurfaceVariant} /><Text style={[styles.emptyText,{color:theme.colors.onSurfaceVariant}]}>Member list unavailable</Text></View>}
        </View>
        <View style={styles.bottomSpace} />
      </Animated.ScrollView>}
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
 flex:{flex:1}, header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:6},back:{margin:0},headerTitle:{fontSize:18,fontWeight:'800',marginLeft:4},content:{padding:14,paddingBottom:38,gap:10},heroCard:{borderRadius:24,borderWidth:1,padding:14},heroTop:{flexDirection:'row',alignItems:'center'},heroBadgeWrap:{width:70,height:70,borderRadius:22,alignItems:'center',justifyContent:'center'},heroBadge:{width:58,height:58},heroIdentity:{flex:1,minWidth:0,marginLeft:13},heroName:{fontSize:23,fontWeight:'900',letterSpacing:-.3},tagPressable:{flexDirection:'row',alignItems:'center',gap:5,marginTop:3,alignSelf:'flex-start'},heroTag:{fontSize:12.5,fontWeight:'800'},heroSub:{marginTop:5,fontSize:10.5,fontWeight:'600'},heroStats:{flexDirection:'row',gap:8,marginTop:12},statGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},statCard:{flex:1,minWidth:'47%',minHeight:78,borderRadius:18,borderWidth:1,padding:9},statIcon:{width:30,height:30,borderRadius:10,alignItems:'center',justifyContent:'center'},statLabel:{fontSize:8.5,fontWeight:'700',marginTop:5},statValue:{fontSize:16,fontWeight:'900',marginTop:1},sectionCard:{borderRadius:20,borderWidth:1,padding:12},sectionTitleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},sectionTitleLeft:{flexDirection:'row',alignItems:'center',minWidth:0},sectionIcon:{width:31,height:31,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:8},sectionTitle:{fontSize:14,fontWeight:'900'},sectionRight:{fontSize:10,fontWeight:'800'},description:{fontSize:11,lineHeight:17,fontWeight:'600',marginBottom:9},infoRows:{gap:7},infoRow:{minHeight:34,flexDirection:'row',alignItems:'center'},infoLabel:{fontSize:10,fontWeight:'700',marginLeft:8},infoValue:{fontSize:10.5,fontWeight:'800',marginLeft:'auto',maxWidth:'52%'},memberRow:{minHeight:58,borderRadius:16,borderWidth:1,marginBottom:7,paddingHorizontal:8,flexDirection:'row',alignItems:'center'},memberRank:{width:28,height:28,borderRadius:10,alignItems:'center',justifyContent:'center'},memberRankText:{fontSize:10,fontWeight:'900'},memberBadge:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',marginLeft:7},memberBadgeImage:{width:30,height:30},memberMain:{flex:1,minWidth:0,marginLeft:8},memberName:{fontSize:12.5,fontWeight:'800'},memberRole:{fontSize:9,marginTop:2,fontWeight:'600'},memberScore:{flexDirection:'row',alignItems:'center',marginLeft:7,gap:3},memberScoreText:{fontSize:10,fontWeight:'800'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},loadingText:{marginTop:8,fontSize:11},errorIcon:{width:52,height:52,borderRadius:17,alignItems:'center',justifyContent:'center'},errorTitle:{fontSize:17,fontWeight:'900',marginTop:10},errorText:{fontSize:11,textAlign:'center',marginTop:5},retryButton:{marginTop:12,paddingHorizontal:18,paddingVertical:9,borderRadius:18},retryText:{fontSize:11,fontWeight:'800'},empty:{alignItems:'center',paddingVertical:18},emptyText:{fontSize:10,marginTop:6},bottomSpace:{height:45}
});
