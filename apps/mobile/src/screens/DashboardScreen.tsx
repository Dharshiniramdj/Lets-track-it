import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { TransactionCard } from '../components/TransactionCard';
import { QuickAddModal } from '../components/QuickAddModal';
import { ExportModal } from '../components/ExportModal';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import { useGoalStore } from '../store/goalStore';
import { useAuthStore } from '../store/authStore';
import { MobileDataSyncService } from '../services/dataSync.service';
import { MobileAuthService } from '../services/auth.service';
import { colors, formatCurrency } from '../theme/colors';

type TimePeriod = '7D' | '30D' | '90D';

interface DashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ onNavigateToTab }) => {
  const { user, logout } = useAuthStore();
  const { activeAccountId, getActiveAccount } = useAccountStore();
  const { transactions, summary, setTransactions, updateDeliveryStatus } = useTransactionStore();
  const { setGoals } = useGoalStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7D');
  const [isConfidential, setIsConfidential] = useState(false);

  const activeAccount = getActiveAccount();
  const currencySymbol = user?.currencyPreference === 'USD' ? '$' : '₹';

  // Fast zero-lag data loading: load cached data instantly, then fetch fresh in background
  const loadData = async (forceRemote = false) => {
    if (!user?.id) return;
    try {
      await MobileDataSyncService.syncAll(user.id);
    } catch (e) {
      console.warn('Dashboard sync:', e);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
      const unsubscribe = MobileDataSyncService.subscribeToRealtime(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, activeAccountId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      await MobileDataSyncService.syncAll(user.id);
      Alert.alert('Synced', 'All ledger records and goals are up to date with cloud!');
    } catch {
      Alert.alert('Sync Notice', 'Updated local ledger. Cloud reconnecting...');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSwitchAccount = () => {
    Alert.alert(
      'Switch Account',
      `Currently signed in as ${user?.email || user?.fullName || 'User'}. Would you like to log out and switch to another account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch / Log Out',
          style: 'destructive',
          onPress: async () => {
            await MobileAuthService.logout();
            logout();
          }
        }
      ]
    );
  };

  // Find orders currently in transit
  const activeDeliveries = useMemo(() => {
    return transactions.filter(
      t => t.shoppingDetails && (t.shoppingDetails.status === 'ORDERED' || t.shoppingDetails.status === 'SHIPPED')
    );
  }, [transactions]);

  // Financial calculations
  const totalIncome = summary?.totalIncome || 0;
  const totalExpense = summary?.totalExpense || 0;
  const netBalance = summary?.netBalance || (totalIncome - totalExpense);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const maskValue = (valueText: string) => {
    return isConfidential ? '••••••' : valueText;
  };

  return (
    <View style={styles.container} testID="dashboard-screen">
      {/* Top Header Bar matching Web */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.brandTitleRow}>
            <Text style={styles.brandTitle}>Let's Track It</Text>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.brandSubtitle}>Financial Command Center</Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.privacyBtn}
            onPress={handleManualSync}
            disabled={isSyncing}
            accessibilityLabel="Sync data now"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.electric} />
            ) : (
              <Text style={styles.privacyIcon}>🔄</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.privacyBtn}
            onPress={() => setShowExportModal(true)}
            accessibilityLabel="Export Data"
          >
            <Text style={styles.privacyIcon}>📥</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.privacyBtn}
            onPress={() => setIsConfidential(!isConfidential)}
            accessibilityLabel="Toggle confidential balance"
          >
            <Text style={styles.privacyIcon}>{isConfidential ? '👁️‍🗨️' : '👁️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBadgeCircle}
            onPress={handleSwitchAccount}
            accessibilityLabel="Switch account or log out"
          >
            <Text style={styles.profileBadgeText}>
              {(user?.fullName || 'User').slice(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.electric}
            colors={[colors.electric, colors.cantaloupe]}
          />
        }
      >
        {/* Account Pill Selector */}
        <View style={styles.accountPillContainer}>
          <View style={styles.accountPill}>
            <View style={styles.accountInitial}>
              <Text style={styles.accountInitialChar}>
                {(activeAccount?.name || 'Personal')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountTexts}>
              <Text style={styles.accountSubText}>ACTIVE VAULT</Text>
              <Text style={styles.accountNameText}>{activeAccount?.name || 'Personal Vault'}</Text>
            </View>
            <View style={styles.activeDot} />
          </View>
        </View>

        {/* Command Center: Net Balance Card */}
        <View style={styles.balanceCard} testID="balance-card">
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>TOTAL NET BALANCE</Text>
            <View style={styles.badgeIncome}>
              <Text style={styles.badgeIncomeText}>● Live Synced</Text>
            </View>
          </View>

          <Text style={styles.balanceValue}>
            {maskValue(formatCurrency(netBalance, currencySymbol))}
          </Text>

          <View style={styles.balanceDivider} />

          {/* Monthly Inflow & Outflow Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>MONTHLY INFLOW</Text>
              <Text style={[styles.metricValue, { color: colors.income }]}>
                ↘ {maskValue(formatCurrency(totalIncome, currencySymbol))}
              </Text>
            </View>

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>MONTHLY OUTFLOW</Text>
              <Text style={[styles.metricValue, { color: colors.expense }]}>
                ↗ {maskValue(formatCurrency(totalExpense, currencySymbol))}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Add to Ledger Prominent Banner */}
        <TouchableOpacity
          style={styles.quickAddBanner}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
          testID="quick-add-button"
        >
          <View style={styles.bannerLeft}>
            <View style={styles.bannerPlusIconWrap}>
              <Text style={styles.bannerPlusIcon}>+</Text>
            </View>
            <View>
              <Text style={styles.bannerTitle}>Record New Entry</Text>
              <Text style={styles.bannerSubtitle}>Add purchase, payment or delivery to ledger</Text>
            </View>
          </View>
          <Text style={styles.bannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Active Deliveries Section */}
        {activeDeliveries.length > 0 && (
          <View style={styles.sectionWrap} testID="active-deliveries-hub">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>📦</Text>
                <Text style={styles.sectionTitle}>
                  Deliveries in Transit ({activeDeliveries.length})
                </Text>
              </View>
            </View>

            {activeDeliveries.map(t => (
              <TransactionCard
                key={t.id}
                transaction={t}
                currencySymbol={currencySymbol}
                onStatusChange={updateDeliveryStatus}
              />
            ))}
          </View>
        )}

        {/* Recent Ledger Entries */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>📑</Text>
              <Text style={styles.sectionTitle}>Recent Ledger Entries</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Text style={styles.sectionLink}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map(tx => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                currencySymbol={currencySymbol}
                onStatusChange={updateDeliveryStatus}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👛</Text>
              <Text style={styles.emptyTitle}>No Transactions Recorded</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ Add to Ledger" to record your first purchase or income.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Quick Add Modal */}
      <QuickAddModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        currencySymbol={currencySymbol}
      />

      {/* Export & Backup Modal */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.midnightSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.cleanWhite,
    letterSpacing: -0.5
  },
  brandBadge: {
    backgroundColor: colors.electricSubtle,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6
  },
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.electric
  },
  brandSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  privacyBtn: {
    padding: 6,
    backgroundColor: colors.midnightSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  privacyIcon: {
    fontSize: 16
  },
  profileBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cantaloupeSubtle,
    borderWidth: 1.5,
    borderColor: colors.cantaloupe,
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cantaloupe
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 100
  },
  accountPillContainer: {
    marginBottom: 16
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.midnightSurface,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  accountInitial: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.electricSubtle,
    borderWidth: 1,
    borderColor: colors.electric,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  accountInitialChar: {
    color: colors.electric,
    fontSize: 12,
    fontWeight: '800'
  },
  accountTexts: {
    flex: 1
  },
  accountSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  accountNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cleanWhite
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  balanceCard: {
    backgroundColor: colors.midnightCard,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    marginBottom: 16,
    shadowColor: colors.electric,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8
  },
  badgeIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  badgeIncomeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.cleanWhite,
    letterSpacing: -1,
    marginBottom: 14
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.midnightBorder,
    marginBottom: 14
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricCol: {
    flex: 1
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  quickAddBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.midnightSurface,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  bannerPlusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cantaloupe,
    justifyContent: 'center',
    alignItems: 'center'
  },
  bannerPlusIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.cleanWhite,
    lineHeight: 24
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cleanWhite
  },
  bannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary
  },
  bannerArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.electric
  },
  sectionWrap: {
    marginBottom: 22
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionEmoji: {
    fontSize: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.cleanWhite,
    letterSpacing: -0.3
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.electric
  },
  emptyCard: {
    backgroundColor: colors.midnightCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cleanWhite,
    marginBottom: 4
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center'
  }
});
