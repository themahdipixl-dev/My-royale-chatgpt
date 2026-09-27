// * components/EntityPreviewModal.js — square player/clan preview popup with open/close animation (v69)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Image } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const leagueIcon = require('../assets/league-icon.png');
const pointIcon = require('../assets/Point-icon.png');

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

function InfoTile({ icon, image, label, value, theme }) {
  return (
    <View style={[styles.infoTile, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      <View style={[styles.tileIcon, { backgroundColor: theme.colors.primaryContainer }]}>
        {image ? (
          <Image source={image} style={styles.tileImage} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name={icon} size={17} color={theme.colors.onPrimaryContainer} />
        )}
      </View>
      <View style={styles.tileText}>
        <Text style={[styles.tileLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.tileValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function DetailLine({ icon, image, label, value, theme }) {
  return (
    <View style={[styles.detailLine, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
      {image ? (
        <Image source={image} style={styles.detailImage} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
      )}
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.colors.onSurface }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export default function EntityPreviewModal({ visible, entity, type = 'player', countryName, onClose, onExpand }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible && entity) {
      closing.current = false;
      setModalVisible(true);
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }).start();
      return;
    }

    if (!visible && modalVisible && !closing.current) {
      closing.current = true;
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setModalVisible(false);
          closing.current = false;
        }
      });
    }
  }, [visible, entity, modalVisible, progress]);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        closing.current = false;
        onClose?.();
      }
    });
  };

  if (!entity) return null;

  const isClan = type === 'clan';

  const title = isClan
    ? firstValue(entity.name, entity.clan?.name, 'Unknown clan')
    : firstValue(entity.name, 'Unknown player');

  const tag = firstValue(entity.tag, entity.playerTag, entity.clan?.tag);
  const rank = firstValue(entity.rank);
  const country = firstValue(
    typeof entity.country === 'string' ? entity.country : entity.country?.name,
    entity.countryName,
    typeof entity.location === 'string' ? entity.location : entity.location?.name,
    entity.locationName,
    entity.countryCode,
    countryName,
  );

  const score = isClan
    ? firstValue(entity.clanScore, entity.clanWarTrophies, entity.score, entity.trophies, entity.rating, entity.points)
    : firstValue(entity.trophies, entity.score, entity.rating, entity.eloRating, entity.points);

  const members = firstValue(entity.members, entity.memberCount, entity.membersCount);
  const league = firstValue(
    typeof entity.league === 'string' ? entity.league : entity.league?.name,
    entity.leagueName,
    typeof entity.arena === 'string' ? entity.arena : entity.arena?.name,
  );
  const clanName = firstValue(entity.clan?.name);
  const clanTag = firstValue(entity.clan?.tag);
  const rankLabel = rank !== null ? `#${formatNumber(rank)}` : '—';

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={requestClose} />
        <Animated.View
          style={[
            styles.animated,
            {
              opacity: progress,
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          <Surface elevation={5} style={[styles.card, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={styles.header}>
              <View style={[styles.entityIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                {isClan ? (
                  <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.onPrimaryContainer} />
                ) : (
                  <Image source={leagueIcon} style={styles.playerIcon} resizeMode="contain" />
                )}
              </View>

              <View style={styles.titleBlock}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
                <Text numberOfLines={1} style={[styles.tag, { color: theme.colors.primary }]}>
                  {tag || (isClan ? 'Clan' : 'Player')}
                </Text>
              </View>

              <IconButton
                icon="arrow-expand"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onExpand}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
              <IconButton
                icon="close"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={requestClose}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
            </View>

            <View style={styles.grid}>
              <InfoTile image={pointIcon} label={isClan ? 'Clan score' : 'Trophies'} value={formatNumber(score)} theme={theme} />
              <InfoTile icon="podium" label="Rank" value={rankLabel} theme={theme} />
              <InfoTile image={leagueIcon} label={isClan ? 'War league' : 'League'} value={league || '—'} theme={theme} />
              <InfoTile icon="earth" label="Country" value={country || '—'} theme={theme} />
            </View>

            {isClan ? (
              <DetailLine icon="account-multiple" label="Members" value={members !== null ? formatNumber(members) : '—'} theme={theme} />
            ) : (
              <DetailLine
                icon="account-group"
                label="Clan"
                value={clanName ? `${clanName}${clanTag ? `  ${clanTag}` : ''}` : 'No clan'}
                theme={theme}
              />
            )}

            <Text style={[styles.expandHint, { color: theme.colors.onSurfaceVariant }]}>
              Expand for full profile
            </Text>
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)' },
  animated: { width: '88%', maxWidth: 390, aspectRatio: 1 },
  card: { flex: 1, borderRadius: 26, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center' },
  entityIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerIcon: { width: 32, height: 32 },
  titleBlock: { flex: 1, marginLeft: 10, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700' },
  tag: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  actionButton: { width: 38, height: 38, borderRadius: 19, margin: 0, marginLeft: 6 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  infoTile: { width: '48%', flex: 1, minHeight: 62, maxHeight: 72, borderRadius: 17, padding: 9, flexDirection: 'row', alignItems: 'center' },
  tileIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  tileImage: { width: 22, height: 22 },
  tileText: { flex: 1, minWidth: 0 },
  tileLabel: { fontSize: 9.5, fontWeight: '600' },
  tileValue: { fontSize: 13, fontWeight: '800', marginTop: 3 },
  detailLine: { minHeight: 48, borderRadius: 16, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center' },
  detailImage: { width: 23, height: 23 },
  detailText: { flex: 1, marginLeft: 9, minWidth: 0 },
  detailLabel: { fontSize: 9.5, fontWeight: '600' },
  detailValue: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  expandHint: { fontSize: 9.5, textAlign: 'center', marginTop: 8 },
});
