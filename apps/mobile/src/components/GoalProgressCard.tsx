import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MobileGoal } from '../store/goalStore';
import { colors, formatCurrency } from '../theme/colors';

interface Props {
  goal: MobileGoal;
  currencySymbol?: string;
  onPress?: (goal: MobileGoal) => void;
}

export const GoalProgressCard: React.FC<Props> = ({
  goal,
  currencySymbol = '₹',
  onPress
}) => {
  const isExceeded = goal.status === 'EXCEEDED' || goal.percentageConsumed > 100;
  const isWarning = goal.status === 'WARNING' || (goal.percentageConsumed >= 80 && goal.percentageConsumed <= 100);

  const barColor = isExceeded ? colors.danger : isWarning ? colors.warning : colors.electric;
  const badgeBg = isExceeded ? 'rgba(248, 81, 73, 0.15)' : isWarning ? 'rgba(210, 153, 34, 0.15)' : 'rgba(2, 151, 222, 0.15)';
  const badgeTextColor = isExceeded ? colors.danger : isWarning ? colors.warning : colors.electric;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(goal)}
      activeOpacity={0.7}
      testID={`goal-card-${goal.id}`}
      accessibilityLabel={`Goal for ${goal.category}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.categoryTitle}>{goal.category}</Text>
          <Text style={styles.monthSubtitle}>{goal.month || 'Current Month'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.statusText, { color: badgeTextColor }]}>
            {isExceeded ? 'EXCEEDED' : isWarning ? 'WARNING' : 'ON TRACK'} ({goal.percentageConsumed}%)
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack} testID="goal-progress-bar">
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(goal.percentageConsumed, 100)}%`,
              backgroundColor: barColor
            }
          ]}
        />
      </View>

      {/* Live Financial Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Spent</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(goal.actualSpent)}
          </Text>
        </View>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Budget</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(goal.targetAmount)}
          </Text>
        </View>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Buffer</Text>
          <Text style={[styles.metricValue, { color: goal.remainingBuffer < 0 ? colors.danger : colors.success }]}>
            {goal.remainingBuffer < 0 ? '-' : ''}{formatCurrency(Math.abs(goal.remainingBuffer))}
          </Text>
        </View>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Daily Pace</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(goal.dailyRecommendedPace)}/d
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  titleGroup: {
    flex: 1
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  monthSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  metricColumn: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  }
});
