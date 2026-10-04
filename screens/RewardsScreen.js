// * screens/RewardsScreen.js — official Clash Royale rewards hub
import React, { useEffect, useRef } from 'react';
import { Animated, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const REWARD_SOURCES = [
  {
    id: 'store',
    icon: 'storefront-outline',
    title: 'Supercell Store',
    subtitle: 'Check the official Clash Royale Store for current bonuses, specials and claimable offers.',
    badge: 'Official',
    url: 'https://store.supercell.com/en/clashroyale',
  },
  {
    id: 'id',
    icon: 'gift-outline',
    title: 'Supercell ID Rewards',
    subtitle: 'Official bonus rewards available through the Supercell ID Rewards program when offered.',
    badge: 'Free',
    url: 'https://support.supercell.com/supercell-store/en/articles/supercell-id-rewards.html',
  },
  {
    id: 'pass',
    icon: 'ticket-confirmation-outline',
    title: 'Free Pass Royale',
    subtitle: 'See the free side of the current Pass Royale reward track and its available rewards.',
    badge: 'Free',
    url: 'https://support.supercell.com/clash-royale/en/articles/pass-royale-11.html',
  },
  {
    id: 'news',
    icon: 'newspaper-variant-outline',
    title: 'Official Events & News',
    subtitle: 'Supercell announcements can include free event rewards, challenges and limited-time giveaways.',
    badge: 'Official',
    url: 'https://support.supercell.com/clash-royale/en/',
  },
];

async function openSource(url) {
  try {
    await Linking.openURL(url);
  } catch {
    // Ignore unsupported external-link errors.
  }
}

export default function RewardsScreen() {
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 8,
      tension: 55,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="gift-open-outline"
                size={29}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.colors.onBackground }]}>Rewards</Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Free rewards & official Supercell sources
              </Text>
            </View>
          </View>

          <Surface
            elevation={0}
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={21}
              color={theme.colors.primary}
            />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              Only official Supercell sources are shown here. Some rewards are account-specific
              or require you to sign in with Supercell ID.
            </Text>
          </Surface>

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Official reward sources
          </Text>

          {REWARD_SOURCES.map((item) => (
            <Surface
              key={item.id}
              elevation={0}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surfaceContainer,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={theme.colors.onSecondaryContainer}
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.onPrimaryContainer }]}>
                      {item.badge}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {item.subtitle}
                </Text>

                <Text
                  onPress={() => openSource(item.url)}
                  style={[styles.action, { color: theme.colors.primary }]}
                >
                  Open official source  ›
                </Text>
              </View>
            </Surface>
          ))}

          <Text style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
            Rewards can appear, expire, or vary by account. My Royale does not claim rewards
            automatically.
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 30, paddingBottom: 112 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  headerText: { flex: 1 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { marginTop: 3, fontSize: 13 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 24,
  },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12.5, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '750', marginBottom: 10 },
  card: {
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 15.5, fontWeight: '750' },
  badge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 7 },
  badgeText: { fontSize: 9.5, fontWeight: '700' },
  cardSubtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  action: { fontSize: 12.5, fontWeight: '700', marginTop: 9 },
  footer: { textAlign: 'center', fontSize: 11.5, lineHeight: 17, marginTop: 9, paddingHorizontal: 10 },
});
