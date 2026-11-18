import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useTransactionStore } from '../store/transactionStore';
import { TransactionCard } from '../components/TransactionCard';
import { colors, formatCurrency } from '../theme/colors';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const TimelineScreen: React.FC = () => {
  const { transactions, updateDeliveryStatus } = useTransactionStore();

  const [dateObj, setDateObj] = useState(new Date());
  const currentMonthIdx = dateObj.getMonth();
  const currentYear = dateObj.getFullYear();
  const currentMonth = MONTH_NAMES[currentMonthIdx];
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const handlePrevMonth = () => {
    setDateObj(new Date(currentYear, currentMonthIdx - 1, 1));
  };

  const handleNextMonth = () => {
    setDateObj(new Date(currentYear, currentMonthIdx + 1, 1));
  };

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonthIdx, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

    const days: Array<{ dayNumber: number | null; hasExpense?: boolean; hasIncome?: boolean }> = [];

    // Empty leading padding cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTxs = transactions.filter(t => t.date === dayStr);
      const hasExpense = dayTxs.some(t => t.type === 'EXPENSE');
      const hasIncome = dayTxs.some(t => t.type === 'INCOME');
      days.push({ dayNumber: d, hasExpense, hasIncome });
    }

    return days;
  }, [currentYear, currentMonthIdx, transactions]);

  // Selected day transactions
  const selectedDayTransactions = useMemo(() => {
    const dayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return transactions.filter(t => t.date === dayStr);
  }, [currentYear, currentMonthIdx, selectedDay, transactions]);

  // Active deliveries
  const activeOrders = useMemo(() => {
    return transactions.filter(t => !!t.shoppingDetails);
  }, [transactions]);

  return (
    <View style={styles.container} testID="timeline-screen">
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Financial Timeline</Text>
          <Text style={styles.screenSubtitle}>Calendar & Delivery Schedule</Text>
        </View>
        <View style={styles.activeOrdersCountPill}>
          <Text style={styles.activeOrdersCountText}>
            📦 {activeOrders.length} Orders
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Month Header */}
          <View style={styles.monthHeaderRow}>
            <Text style={styles.monthYearTitle}>
              <Text style={styles.monthAccent}>{currentMonth}</Text> {currentYear}
            </Text>
            <View style={styles.arrowControls}>
              <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevMonth}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.arrowBtn} onPress={handleNextMonth}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <Text key={d} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, idx) => {
              if (item.dayNumber === null) {
                return <View key={idx} style={styles.emptyDayCell} />;
              }
              const isSelected = item.dayNumber === selectedDay;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                  onPress={() => item.dayNumber && setSelectedDay(item.dayNumber)}
                >
                  <Text style={[styles.dayNumText, isSelected && styles.selectedDayNumText]}>
                    {item.dayNumber}
                  </Text>
                  <View style={styles.dotRow}>
                    {item.hasIncome && <View style={[styles.dot, { backgroundColor: colors.income }]} />}
                    {item.hasExpense && <View style={[styles.dot, { backgroundColor: colors.expense }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Day Records */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>
            Entries for {currentMonth} {selectedDay}, {currentYear}
          </Text>

          {selectedDayTransactions.length > 0 ? (
            selectedDayTransactions.map(tx => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onStatusChange={updateDeliveryStatus}
              />
            ))
          ) : (
            <View style={styles.noEntriesCard}>
              <Text style={styles.noEntriesText}>No financial transactions recorded on this date.</Text>
            </View>
          )}
        </View>

        {/* Upcoming Deliveries */}
        {activeOrders.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>All Shopping & Delivery Packages</Text>
            {activeOrders.map(tx => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onStatusChange={updateDeliveryStatus}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 14,
    backgroundColor: colors.midnightSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cleanWhite,
    letterSpacing: -0.5
  },
  screenSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  activeOrdersCountPill: {
    backgroundColor: colors.cantaloupeSubtle,
    borderWidth: 1,
    borderColor: 'rgba(252, 115, 77, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  activeOrdersCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.cantaloupe
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 100
  },
  calendarCard: {
    backgroundColor: colors.midnightCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    marginBottom: 20
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  monthYearTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cleanWhite
  },
  monthAccent: {
    color: colors.electric
  },
  arrowControls: {
    flexDirection: 'row',
    gap: 8
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.midnightSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cleanWhite
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  emptyDayCell: {
    width: 38,
    height: 42,
    marginBottom: 6
  },
  dayCell: {
    width: 38,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: colors.midnightSurface,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  selectedDayCell: {
    backgroundColor: colors.electricSubtle,
    borderColor: colors.electric
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  selectedDayNumText: {
    color: colors.cleanWhite,
    fontWeight: '900'
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2
  },
  sectionWrap: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cleanWhite,
    marginBottom: 12,
    letterSpacing: -0.3
  },
  noEntriesCard: {
    backgroundColor: colors.midnightCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  noEntriesText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center'
  }
});
