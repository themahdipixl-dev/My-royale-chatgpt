// * screens/EntityDetailsScreen.js — initial player/clan details page infrastructure (v65)
import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EntityDetailsScreen({ entity, type = 'player', onBack }) {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  const isClan = type === 'clan';
  const title = isClan ? (entity?.name ?? entity?.clan?.name ?? 'Clan') : (entity?.name ?? 'Player');

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  }, [entrance]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Animated.View style={[styles.flex, {
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={24} onPress={onBack} style={styles.back} />
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        </View>

        <View style={styles.content}>
          <Surface elevation={0} style={[styles.placeholderCard, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={isClan ? 'account-group' : 'account'}
                size={26}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
            <Text style={[styles.placeholderTitle, { color: theme.colors.onSurface }]}>
              {isClan ? 'Clan details' : 'Player details'}
            </Text>
            <Text style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}>
              Detailed information will be added here.
            </Text>
          </Surface>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  back: { margin: 0 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  content: { flex: 1, padding: 14 },
  placeholderCard: { borderRadius: 22, minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 20 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { marginTop: 12, fontSize: 16, fontWeight: '700' },
  placeholderText: { marginTop: 5, fontSize: 12, textAlign: 'center' },
});
