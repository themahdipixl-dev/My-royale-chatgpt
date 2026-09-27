// * components/EntityPreviewModal.js — initial player/clan preview popup infrastructure (v65)
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EntityPreviewModal({ visible, entity, type = 'player', onClose, onExpand }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  if (!entity) return null;

  const isClan = type === 'clan';
  const title = isClan ? (entity.name ?? entity.clan?.name ?? 'Clan') : (entity.name ?? 'Player');
  const subtitle = isClan ? 'Clan preview' : 'Player preview';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[
          styles.animated,
          {
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}>
          <Surface elevation={5} style={[styles.card, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons
                  name={isClan ? 'account-group' : 'account'}
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <View style={styles.titleBlock}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
              </View>
              <IconButton
                icon="arrow-expand"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onExpand}
                style={[styles.expandButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              />
            </View>

            <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
              <Text style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}>
                Details will be added here
              </Text>
            </View>
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  animated: { width: '86%', maxWidth: 390 },
  card: { borderRadius: 24, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, marginLeft: 10 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 2 },
  expandButton: { width: 40, height: 40, borderRadius: 20, margin: 0, marginLeft: 8 },
  placeholder: { height: 72, borderRadius: 18, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 12 },
});
