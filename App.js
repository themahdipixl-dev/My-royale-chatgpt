// * App.js — home as default tab and swipe navigation handoff (v78)
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Animated, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from './theme/theme';
import RankingsScreen from './screens/RankingsScreen';
import HomeScreen from './screens/HomeScreen';
import ComingSoonScreen from './screens/ComingSoonScreen';
import BottomNav from './components/BottomNav';

export default function App() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [exitHintVisible, setExitHintVisible] = useState(false);
  const exitHintProgress = useRef(new Animated.Value(0)).current;
  const exitPending = useRef(false);
  const exitTimer = useRef(null);
  const hintTimer = useRef(null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // RankingsScreen owns its overlays and list navigation.
      if (activeTab === 'rankings') {
        return false;
      }

      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      if (exitPending.current) {
        if (exitTimer.current) clearTimeout(exitTimer.current);
        BackHandler.exitApp();
        return true;
      }

      exitPending.current = true;
      setExitHintVisible(true);
      Animated.spring(exitHintProgress, {
        toValue: 1,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }).start();

      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => {
        Animated.timing(exitHintProgress, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setExitHintVisible(false);
        });
        exitPending.current = false;
      }, 2000);

      exitTimer.current = hintTimer.current;
      return true;
    });

    return () => {
      subscription.remove();
      if (exitTimer.current) clearTimeout(exitTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [activeTab, exitHintProgress]);

  const renderScreen = () => {
    if (activeTab === 'home') return <HomeScreen />;
    if (activeTab === 'rankings') return <RankingsScreen onRequestHome={() => setActiveTab('home')} onRequestBottomNext={() => setActiveTab((current) => {
      const order = ['rankings', 'clans', 'home', 'cards', 'profile'];
      const index = order.indexOf(current);
      return order[Math.min(order.length - 1, index + 1)];
    })} />;
    return <ComingSoonScreen type={activeTab} />;
  };

  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        {renderScreen()}
        <BottomNav value={activeTab} onChange={setActiveTab} />
        {exitHintVisible && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.exitHint,
              {
                backgroundColor: theme.colors.inverseSurface,
                opacity: exitHintProgress,
                transform: [
                  { translateY: exitHintProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                  { scale: exitHintProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <Text style={[styles.exitHintText, { color: theme.colors.inverseOnSurface }]}>
              Press back twice to exit
            </Text>
          </Animated.View>
        )}
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  exitHint: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 88,
    maxWidth: '88%',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    zIndex: 200,
  },
  exitHintText: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
});
