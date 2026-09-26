import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';

export default function PlayerRow({ item, index }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Card style={styles.card} mode="contained">
        <Card.Content style={styles.row}>
          <Text variant="titleMedium" style={styles.rank}>#{item.rank ?? index + 1}</Text>
          <Avatar.Text size={40} label={(item.name || '?').slice(0, 2).toUpperCase()} style={styles.avatar} />
          <View style={styles.info}>
            <Text variant="bodyLarge" numberOfLines={1}>{item.name}</Text>
            <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>{item.clan?.name || 'بدون کلن'}</Text>
          </View>
          <Text variant="titleMedium">🏆 {item.trophies}</Text>
        </Card.Content>
      </Card>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  card: { marginVertical: 6, borderRadius: 16, marginHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rank: { width: 40, textAlign: 'center' },
  avatar: { marginHorizontal: 10 },
  info: { flex: 1 },
  subtitle: { opacity: 0.6 },
});