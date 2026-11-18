import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { TransactionFeedScreen } from '../screens/TransactionFeedScreen';
import { QuickAddModal } from '../components/QuickAddModal';
import { colors } from '../theme/colors';

export type TabRoute = 'Dashboard' | 'Transactions' | 'Reports' | 'Goals' | 'Settings';

export const TabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabRoute>('Dashboard');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen onNavigateToTab={(tab) => setActiveTab(tab as TabRoute)} />;
      case 'Transactions':
        return (
          <TransactionFeedScreen
            onOpenAdd={() => setShowQuickAdd(true)}
            onNavigateToAnalytics={() => setActiveTab('Reports')}
          />
        );
      case 'Reports':
        return <ReportsScreen />;
      case 'Goals':
        return <GoalsScreen />;
      case 'Settings':
        return <SettingsScreen onNavigateToTab={(tab) => setActiveTab(tab as TabRoute)} />;
      default:
        return <DashboardScreen onNavigateToTab={(tab) => setActiveTab(tab as TabRoute)} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Navigation Task Bar */}
      <View style={styles.tabBar} testID="bottom-tab-bar">
        {/* Tab 1: Home / Command Center */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Dashboard')}
          testID="tab-dashboard"
          accessibilityLabel="Navigate to Overview"
        >
          <Text style={[styles.tabIcon, activeTab === 'Dashboard' && styles.activeTabIcon]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Dashboard' && styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>

        {/* Tab 2: Transactions / Ledger */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Transactions')}
          testID="tab-reports"
          accessibilityLabel="Navigate to Ledger"
        >
          <Text style={[styles.tabIcon, activeTab === 'Transactions' && styles.activeTabIcon]}>📑</Text>
          <Text style={[styles.tabLabel, activeTab === 'Transactions' && styles.activeTabLabel]}>Ledger</Text>
        </TouchableOpacity>

        {/* Center Floating Plus: Add to Ledger */}
        <View style={styles.centerFabContainer}>
          <TouchableOpacity
            style={styles.centerFabButton}
            onPress={() => setShowQuickAdd(true)}
            testID="quick-add-button"
            accessibilityLabel="Add to Ledger"
          >
            <Text style={styles.centerFabIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Tab 3: Visuals & Analytics (Image 1) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Reports')}
          testID="tab-visuals"
          accessibilityLabel="Navigate to Visuals & Analytics"
        >
          <Text style={[styles.tabIcon, activeTab === 'Reports' && styles.activeTabIcon]}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'Reports' && styles.activeTabLabel]}>Visuals</Text>
        </TouchableOpacity>

        {/* Tab 4: Settings / Profile */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Settings')}
          testID="tab-settings"
          accessibilityLabel="Navigate to Settings"
        >
          <Text style={[styles.tabIcon, activeTab === 'Settings' && styles.activeTabIcon]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'Settings' && styles.activeTabLabel]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Add Modal */}
      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight
  },
  content: {
    flex: 1
  },
  tabBar: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 6
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 52
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
    marginBottom: 2
  },
  activeTabIcon: {
    opacity: 1
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted
  },
  activeTabLabel: {
    color: colors.electric
  },
  centerFabContainer: {
    position: 'relative',
    top: -18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerFabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.cantaloupe,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.cantaloupe,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: colors.midnight
  },
  centerFabIcon: {
    fontSize: 32,
    fontWeight: '800',
    color: '#02070A',
    lineHeight: 34
  }
});
