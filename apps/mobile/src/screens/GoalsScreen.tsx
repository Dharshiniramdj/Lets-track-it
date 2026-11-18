import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { GoalProgressCard } from '../components/GoalProgressCard';
import { useGoalStore, MobileGoal } from '../store/goalStore';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import { useAuthStore } from '../store/authStore';
import { MobileDataSyncService } from '../services/dataSync.service';
import { colors, formatCurrency } from '../theme/colors';

const CATEGORY_PRESETS = [
  'Groceries',
  'Dining',
  'Shopping',
  'Travel',
  'Utilities',
  'Entertainment',
  'Electronics',
  'Health'
];

export const GoalsScreen: React.FC = () => {
  const { goals, setGoals, upsertGoal } = useGoalStore();
  const { activeAccountId } = useAccountStore();
  const { transactions } = useTransactionStore();
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('Groceries');
  const [targetAmount, setTargetAmount] = useState('10000');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Calculate live dynamic metrics for each goal against current month transactions
  const currentMonth = new Date().toISOString().slice(0, 7);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());

  const enrichedGoals: MobileGoal[] = useMemo(() => {
    // If no goals defined yet, provide some realistic sensible defaults so the user has visual feedback
    const baseGoals = goals.length > 0 ? goals : [
      {
        id: 'default-1',
        accountId: activeAccountId || 'acc-1',
        category: 'Groceries',
        targetAmount: 15000,
        actualSpent: 0,
        remainingBuffer: 15000,
        percentageConsumed: 0,
        dailyRecommendedPace: 500,
        status: 'SAFE' as const,
        colorCode: 'GREEN' as const,
        month: currentMonth
      },
      {
        id: 'default-2',
        accountId: activeAccountId || 'acc-1',
        category: 'Dining',
        targetAmount: 8000,
        actualSpent: 0,
        remainingBuffer: 8000,
        percentageConsumed: 0,
        dailyRecommendedPace: 260,
        status: 'SAFE' as const,
        colorCode: 'GREEN' as const,
        month: currentMonth
      },
      {
        id: 'default-3',
        accountId: activeAccountId || 'acc-1',
        category: 'Shopping',
        targetAmount: 12000,
        actualSpent: 0,
        remainingBuffer: 12000,
        percentageConsumed: 0,
        dailyRecommendedPace: 400,
        status: 'SAFE' as const,
        colorCode: 'GREEN' as const,
        month: currentMonth
      }
    ];

    return baseGoals.map(g => {
      // Sum expenses matching this category
      const spent = transactions
        .filter(t => t.type === 'EXPENSE' && t.category.toLowerCase() === g.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = g.targetAmount - spent;
      const pct = g.targetAmount > 0 ? Math.round((spent / g.targetAmount) * 100) : 0;
      const status: 'SAFE' | 'WARNING' | 'EXCEEDED' =
        pct > 100 ? 'EXCEEDED' : pct >= 80 ? 'WARNING' : 'SAFE';
      const pace = remaining > 0 ? Math.round(remaining / daysRemaining) : 0;

      return {
        ...g,
        actualSpent: spent,
        remainingBuffer: remaining,
        percentageConsumed: pct,
        dailyRecommendedPace: pace,
        status
      };
    });
  }, [goals, transactions, activeAccountId, currentMonth, daysRemaining]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const data = await MobileDataSyncService.fetchUserData(user.id);
      if (data.goals.length > 0) {
        setGoals(data.goals);
      }
    } catch (e) {
      console.warn('Goals fetch error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveGoal = async () => {
    const numTarget = parseFloat(targetAmount);
    if (!numTarget || numTarget <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid target budget amount');
      return;
    }

    setIsSaving(true);
    try {
      const newGoal: MobileGoal = {
        id: `goal-${Date.now()}`,
        accountId: activeAccountId || (user?.id ? `acc-${user.id}` : 'acc-1'),
        category,
        targetAmount: numTarget,
        actualSpent: 0,
        remainingBuffer: numTarget,
        percentageConsumed: 0,
        dailyRecommendedPace: Math.round(numTarget / daysRemaining),
        status: 'SAFE',
        colorCode: 'GREEN',
        month: currentMonth,
        notes: notes.trim() || undefined
      };

      // Optimistic instant update in Zustand store
      upsertGoal(newGoal);

      // Non-blocking background sync to Supabase
      if (user?.id) {
        MobileDataSyncService.saveGoal(newGoal, user.id);
      }

      setShowModal(false);
      setNotes('');
      Alert.alert('Goal Created', `Monthly budget of ${formatCurrency(numTarget)} set for ${category}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create goal');
    } finally {
      setIsSaving(false);
    }
  };

  // Live Aggregations
  const totalBudgeted = enrichedGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSpent = enrichedGoals.reduce((s, g) => s + g.actualSpent, 0);
  const totalBuffer = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  return (
    <View style={styles.container} testID="goals-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cantaloupe}
            colors={[colors.cantaloupe, colors.electric]}
          />
        }
      >
        {/* Top Header Summary Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={styles.headerTitle}>Monthly Category Goals</Text>
              <Text style={styles.headerSubtitle}>
                Enforce spending discipline across key categories
              </Text>
            </View>
            <View style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>{currentMonth}</Text>
            </View>
          </View>

          {/* Overall Progress Bar */}
          <View style={styles.overallTrack}>
            <View
              style={[
                styles.overallFill,
                {
                  width: `${Math.min(overallPct, 100)}%`,
                  backgroundColor: overallPct > 100 ? colors.danger : overallPct >= 80 ? colors.warning : colors.cantaloupe
                }
              ]}
            />
          </View>
          <View style={styles.overallMetaRow}>
            <Text style={styles.overallMetaText}>
              Overall Budget Consumption: <Text style={{ color: colors.cantaloupe, fontWeight: '700' }}>{overallPct}%</Text>
            </Text>
            <Text style={styles.overallMetaText}>
              {daysRemaining} days left
            </Text>
          </View>

          {/* Summary Grid */}
          <View style={styles.summaryGrid}>
            <View style={styles.gridBox}>
              <Text style={styles.boxLabel}>Total Budgeted</Text>
              <Text style={styles.boxVal}>{formatCurrency(totalBudgeted)}</Text>
            </View>
            <View style={styles.gridBox}>
              <Text style={styles.boxLabel}>Actual Spent</Text>
              <Text style={[styles.boxVal, { color: colors.cantaloupe }]}>{formatCurrency(totalSpent)}</Text>
            </View>
            <View style={styles.gridBox}>
              <Text style={styles.boxLabel}>Remaining Buffer</Text>
              <Text style={[styles.boxVal, { color: totalBuffer < 0 ? colors.danger : colors.success }]}>
                {totalBuffer < 0 ? '-' : ''}{formatCurrency(Math.abs(totalBuffer))}
              </Text>
            </View>
            <View style={styles.gridBox}>
              <Text style={styles.boxLabel}>Daily Rec. Pace</Text>
              <Text style={[styles.boxVal, { color: colors.electric }]}>
                {formatCurrency(totalBuffer > 0 ? Math.round(totalBuffer / daysRemaining) : 0)}/d
              </Text>
            </View>
          </View>
        </View>

        {/* Category Goals List */}
        <View style={styles.listSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowModal(true)}
              testID="add-goal-btn"
            >
              <Text style={styles.addBtnText}>+ New Goal</Text>
            </TouchableOpacity>
          </View>

          {enrichedGoals.map(goal => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
            />
          ))}
        </View>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Set Category Monthly Goal</Text>
            <Text style={styles.modalSubtitle}>
              Define an upper spending limit for the month
            </Text>

            {/* Category Presets */}
            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.categoryPresets}>
              {CATEGORY_PRESETS.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.presetChip,
                    category === cat && styles.activePreset
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      category === cat && styles.activePresetText
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target Budget Input */}
            <Text style={styles.inputLabel}>MONTHLY BUDGET LIMIT (₹)</Text>
            <TextInput
              style={styles.input}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              placeholder="e.g. 15000"
              placeholderTextColor={colors.textMuted}
            />

            {/* Notes / Reason */}
            <Text style={styles.inputLabel}>NOTES / REMINDER (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Keep under 10k for dining out"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveGoal}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#02070A" />
                ) : (
                  <Text style={styles.confirmText}>Save Goal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight
  },
  headerCard: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  monthBadge: {
    backgroundColor: 'rgba(2, 151, 222, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)'
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.electric
  },
  overallTrack: {
    height: 8,
    backgroundColor: colors.card,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border
  },
  overallFill: {
    height: '100%',
    borderRadius: 4
  },
  overallMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 16
  },
  overallMetaText: {
    fontSize: 11,
    color: colors.textMuted
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  gridBox: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  boxLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4
  },
  boxVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  addBtn: {
    backgroundColor: colors.cantaloupe,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10
  },
  addBtnText: {
    color: '#02070A',
    fontSize: 12,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 18
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  categoryPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  activePreset: {
    backgroundColor: 'rgba(252, 115, 77, 0.2)',
    borderColor: colors.cantaloupe
  },
  presetText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600'
  },
  activePresetText: {
    color: colors.cantaloupe,
    fontWeight: '800'
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13
  },
  confirmBtn: {
    backgroundColor: colors.cantaloupe,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center'
  },
  confirmText: {
    color: '#02070A',
    fontWeight: '800',
    fontSize: 13
  }
});
