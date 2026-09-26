// * App.js — changed in this revision (v49)
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppThemeProvider } from './theme/theme';
import RankingsScreen from './screens/RankingsScreen';
import HomeScreen from './screens/HomeScreen';
import ComingSoonScreen from './screens/ComingSoonScreen';
import BottomNav from './components/BottomNav';

export default function App() {
  const [activeTab, setActiveTab] = useState('rankings');

  const renderScreen = () => {
    if (activeTab === 'home') return <HomeScreen />;
    if (activeTab === 'rankings') return <RankingsScreen />;
    return <ComingSoonScreen type={activeTab} />;
  };

  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        {renderScreen()}
        <BottomNav value={activeTab} onChange={setActiveTab} />
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
