// * components/BottomNav.js — fixed indicator alignment (v51)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ITEMS = [
  { key: 'rankings', label: 'Rankings', icon: 'trophy-outline' },
  { key: 'clans', label: 'Clans', icon: 'account-group-outline' },
  { key: 'home', label: 'Home', icon: 'home-variant' },
  { key: 'cards', label: 'Cards', icon: 'cards-outline' },
  { key: 'profile', label: 'Profile', icon: 'account-circle-outline' },
];

export default function BottomNav({ value, onChange }) {
  const theme = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(0, ITEMS.findIndex((item) => item.key === value));
  const previousIndex = useRef(activeIndex);
  const indicatorX = useRef(new Animated.Value(activeIndex)).current;
  const itemProgress = useRef(
    Object.fromEntries(ITEMS.map((item, index) => [item.key, new Animated.Value(index === activeIndex ? 1 : 0)]))
  ).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: activeIndex,
      friction: 8,
      tension: 72,
      useNativeDriver: true,
    }).start();

    ITEMS.forEach((item) => {
      Animated.spring(itemProgress[item.key], {
        toValue: item.key === value ? 1 : 0,
        friction: 7,
        tension: 85,
        useNativeDriver: true,
      }).start();
    });

    previousIndex.current = activeIndex;
  }, [activeIndex, indicatorX, itemProgress, value]);

  const slotWidth = barWidth > 0 ? (barWidth - 10) / ITEMS.length : 0;
  const indicatorOffset = (slotWidth - 48) / 2;
  const indicatorTranslate = indicatorX.interpolate({
    inputRange: ITEMS.map((_, index) => index),
    outputRange: ITEMS.map((_, index) => index * slotWidth + indicatorOffset),
  });

  return (
    <View pointerEvents="box-none" style={styles.outer}>
      <Surface
        elevation={5}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.surfaceContainer,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingIndicator,
              {
                backgroundColor: theme.colors.secondaryContainer,
                transform: [{ translateX: indicatorTranslate }],
              },
            ]}
          />
        )}

        {ITEMS.map((item) => {
          const selected = value === item.key;
          const progress = itemProgress[item.key];
          const isHome = item.key === 'home';

          const iconScale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.88, isHome ? 1.04 : 1.08],
          });
          const iconTranslateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, isHome ? -8 : -2],
          });
          const labelOpacity = progress;
          const labelTranslateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [4, 0],
          });
          const homeOrbScale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          });

          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => onChange(item.key)}
              style={styles.item}
              android_ripple={{ color: theme.colors.onSurfaceVariant, borderless: true }}
            >
              <Animated.View
                style={[
                  styles.itemContent,
                  isHome && styles.homeContent,
                  {
                    transform: [
                      { translateY: iconTranslateY },
                      { scale: isHome ? homeOrbScale : iconScale },
                    ],
                  },
                ]}
              >
                {isHome ? (
                  <Animated.View
                    style={[
                      styles.homeOrb,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceContainerHighest,
                        transform: [{ scale: homeOrbScale }],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={27}
                      color={selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
                    />
                  </Animated.View>
                ) : (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={23}
                    color={selected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
                  />
                )}

                {!isHome && (
                  <Animated.Text
                    numberOfLines={1}
                    style={[
                      styles.label,
                      {
                        color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant,
                        opacity: labelOpacity,
                        transform: [{ translateY: labelTranslateY }],
                      },
                    ]}
                  >
                    {item.label}
                  </Animated.Text>
                )}
              </Animated.View>
            </Pressable>
          );
        })}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    zIndex: 50,
  },
  bar: {
    height: 72,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    overflow: 'visible',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 5,
    top: 14,
    width: 48,
    height: 44,
    borderRadius: 18,
  },
  item: {
    flex: 1,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'visible',
  },
  homeContent: {
    height: 72,
    overflow: 'visible',
  },
  homeOrb: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  label: {
    position: 'absolute',
    bottom: 1,
    fontSize: 9.5,
    fontWeight: '600',
    includeFontPadding: false,
  },
});