import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Alert
} from 'react-native';
import { useTransactionStore } from '../store/transactionStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { useGoalStore } from '../store/goalStore';
import { colors, formatCurrency } from '../theme/colors';

type ReportTab = 'SUMMARY' | 'CATEGORY' | 'BILLS' | 'CASHFLOW';

const FINTECH_PALETTE = [
  '#74FFED', // Aqua Jade
  '#22C58B', // Green
  '#FC734D', // Coral Orange
  '#38BDF8', // Sky Blue
  '#818CF8', // Indigo
  '#C084FC', // Purple
  '#FBBF24', // Amber
  '#F472B6', // Pink
  '#94A3B8'  // Slate
];

export const ReportsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { transactions, summary } = useTransactionStore();
  const { getActiveAccount } = useAccountStore();
  const { goals } = useGoalStore();

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('SUMMARY');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const activeAccount = getActiveAccount();
  const currencySymbol = user?.currencyPreference === 'USD' ? '$' : '₹';

  // Filter transactions for selected month or all
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      return t.date.startsWith(selectedMonth);
    });
  }, [transactions, selectedMonth]);

  // If no transactions in selected month, fall back to all transactions for rich visual analytics
  const activeTxList = monthTransactions.length > 0 ? monthTransactions : transactions;

  // Analytics computation
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of activeTxList) {
      if (t.type === 'INCOME') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    }
    const net = income - expense;
    const rate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;
    return { income, expense, net, rate };
  }, [activeTxList]);

  // Category Breakdown with Palette Colors
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of activeTxList) {
      if (t.type === 'EXPENSE') {
        const cat = t.category || 'OTHERS';
        map[cat] = (map[cat] || 0) + t.amount;
      }
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .map(([name, amt], idx) => ({
        name,
        amount: amt,
        percent: Math.round((amt / total) * 100),
        color: FINTECH_PALETTE[idx % FINTECH_PALETTE.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeTxList]);

  // Bills extracted from transactions tagged as BILLS or utilities
  const billsTransactions = useMemo(() => {
    return activeTxList.filter(t =>
      t.category === 'BILLS' ||
      t.purpose.toLowerCase().includes('bill') ||
      t.purpose.toLowerCase().includes('recharge') ||
      t.purpose.toLowerCase().includes('rent') ||
      t.purpose.toLowerCase().includes('electricity') ||
      t.purpose.toLowerCase().includes('wifi') ||
      t.purpose.toLowerCase().includes('broadband')
    );
  }, [activeTxList]);

  // Monthly Cash Flow Trend (Last 6 Months)
  const cashFlowTrend = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      if (!t.date) continue;
      const m = t.date.substring(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      if (t.type === 'INCOME') map[m].income += t.amount;
      else map[m].expense += t.amount;
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);
  }, [transactions]);

  // Export as formatted CSV
  const handleExportCSV = async () => {
    if (activeTxList.length === 0) {
      Alert.alert('Notice', 'No transactions found to export.');
      return;
    }
    const header = 'Date,Type,Purpose,Category,Amount,Payment Mode,Platform,Notes\n';
    const rows = activeTxList
      .map(t =>
        `"${t.date}","${t.type}","${t.purpose.replace(/"/g, '""')}","${t.category}",${t.amount},"${t.mode}","${t.platform || ''}","${(t.description || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    await Share.share({
      title: `Let's Track It Statement - ${selectedMonth}`,
      message: `${header}${rows}`
    });
  };

  // Export as Printable PDF / Summary Statement
  const handlePrintPDF = async () => {
    const categoryLines = categoryStats
      .map(c => `  • ${c.name.padEnd(16)}: ${currencySymbol}${c.amount.toLocaleString()} (${c.percent}%)`)
      .join('\n');

    const statement =
      `==================================================\n` +
      `       LET'S TRACK IT — AUDIT-READY STATEMENT     \n` +
      `==================================================\n` +
      `Period         : ${selectedMonth}\n` +
      `Account        : ${activeAccount?.name || 'Personal'}\n` +
      `Holder         : ${user?.fullName || 'User'}\n` +
      `Currency       : ${user?.currencyPreference || 'INR'}\n` +
      `Generated At   : ${new Date().toLocaleString()}\n` +
      `--------------------------------------------------\n` +
      `FINANCIAL PERFORMANCE & PACING:\n` +
      `Total Income   : ${formatCurrency(stats.income, currencySymbol)}\n` +
      `Total Expenses : ${formatCurrency(stats.expense, currencySymbol)}\n` +
      `Net Savings    : ${formatCurrency(stats.net, currencySymbol)}\n` +
      `Savings Rate   : ${stats.rate}% (${stats.rate >= 20 ? 'Optimal' : 'Needs Review'})\n` +
      `Total Entries  : ${activeTxList.length} transactions\n` +
      `--------------------------------------------------\n` +
      `CATEGORY BREAKDOWN:\n` +
      `${categoryLines || '  No expense category data.'}\n` +
      `==================================================\n` +
      `100% Private Ledger • Zero Forced Bank Connection\n` +
      `Exported from Let's Track It\n`;

    await Share.share({
      title: `Financial Statement - ${selectedMonth}`,
      message: statement
    });
  };

  // Export as Excel Table (.xlsx format simulation)
  const handleExportExcel = async () => {
    const header = 'Period\tType\tCategory\tAmount\tDescription\n';
    const rows = activeTxList
      .map(t => `${t.date}\t${t.type}\t${t.category}\t${t.amount}\t${t.purpose}`)
      .join('\n');

    await Share.share({
      title: `Excel Statement ${selectedMonth}`,
      message: `LET'S TRACK IT EXCEL EXPORT\n${header}${rows}`
    });
  };

  return (
    <View style={styles.container} testID="reports-screen">
      {/* Top Header Card (Matching Image 1) */}
      <View style={styles.headerCard}>
        <Text style={styles.eyebrowText}>AUDIT-READY STATEMENTS & ANALYTICS</Text>
        <Text style={styles.headerTitle}>Financial Reporting & Printable Statements</Text>
        <Text style={styles.headerSubtitle}>
          Export ink-friendly A4 PDF statements, CSV ledgers, or Excel spreadsheets with zero vendor lock-in.
        </Text>

        {/* Date Selector & Action Buttons Bar (Matching Image 1) */}
        <View style={styles.actionToolbar}>
          <View style={styles.monthPill}>
            <Text style={styles.monthPillText}>📅 {selectedMonth}</Text>
          </View>

          <View style={styles.btnRow}>
            {/* Print / Save PDF Button */}
            <TouchableOpacity
              style={styles.printBtn}
              onPress={handlePrintPDF}
              activeOpacity={0.8}
            >
              <Text style={styles.printBtnText}>🖨️ Print / Save PDF</Text>
            </TouchableOpacity>

            {/* Excel Button */}
            <TouchableOpacity
              style={styles.excelBtn}
              onPress={handleExportExcel}
              activeOpacity={0.8}
            >
              <Text style={styles.excelBtnText}>📊 Excel</Text>
            </TouchableOpacity>

            {/* CSV Button */}
            <TouchableOpacity
              style={styles.csvBtn}
              onPress={handleExportCSV}
              activeOpacity={0.8}
            >
              <Text style={styles.csvBtnText}>⬇️ CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Navigation Sub-Tabs (Matching Image 1) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabsContainer}
        >
          <TouchableOpacity
            style={[
              styles.subTabPill,
              activeReportTab === 'SUMMARY' && styles.activeSubTabPill
            ]}
            onPress={() => setActiveReportTab('SUMMARY')}
          >
            <Text
              style={[
                styles.subTabPillText,
                activeReportTab === 'SUMMARY' && styles.activeSubTabPillText
              ]}
            >
              Monthly Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabPill,
              activeReportTab === 'CATEGORY' && styles.activeSubTabPill
            ]}
            onPress={() => setActiveReportTab('CATEGORY')}
          >
            <Text
              style={[
                styles.subTabPillText,
                activeReportTab === 'CATEGORY' && styles.activeSubTabPillText
              ]}
            >
              Category Spending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabPill,
              activeReportTab === 'BILLS' && styles.activeSubTabPill
            ]}
            onPress={() => setActiveReportTab('BILLS')}
          >
            <Text
              style={[
                styles.subTabPillText,
                activeReportTab === 'BILLS' && styles.activeSubTabPillText
              ]}
            >
              Bills Payment History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabPill,
              activeReportTab === 'CASHFLOW' && styles.activeSubTabPill
            ]}
            onPress={() => setActiveReportTab('CASHFLOW')}
          >
            <Text
              style={[
                styles.subTabPillText,
                activeReportTab === 'CASHFLOW' && styles.activeSubTabPillText
              ]}
            >
              Annual Cash Flow
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TAB 1: Monthly Summary */}
        {activeReportTab === 'SUMMARY' && (
          <View style={styles.tabContentWrapper}>
            {/* Performance Overview Card */}
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>MONTHLY CASHFLOW & SAVINGS RATE</Text>
              <View style={styles.rateRow}>
                <Text style={styles.rateBig}>{stats.rate}%</Text>
                <View
                  style={[
                    styles.pacingBadge,
                    {
                      backgroundColor: stats.rate >= 20 ? 'rgba(34, 197, 139, 0.15)' : 'rgba(252, 115, 77, 0.15)',
                      borderColor: stats.rate >= 20 ? colors.income : colors.expense
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.pacingBadgeText,
                      { color: stats.rate >= 20 ? colors.income : colors.expense }
                    ]}
                  >
                    {stats.rate >= 20 ? '✓ Optimal Pacing' : '⚠ Attention Needed'}
                  </Text>
                </View>
              </View>

              {/* Income vs Expense Grid */}
              <View style={styles.grid2}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>TOTAL INCOME</Text>
                  <Text style={[styles.gridValue, { color: colors.income }]}>
                    {formatCurrency(stats.income, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>TOTAL EXPENSES</Text>
                  <Text style={[styles.gridValue, { color: colors.expense }]}>
                    {formatCurrency(stats.expense, currencySymbol)}
                  </Text>
                </View>
              </View>

              <View style={[styles.grid2, { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.midnightBorder, paddingTop: 12 }]}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>NET SAVINGS</Text>
                  <Text style={[styles.gridValue, { color: stats.net >= 0 ? colors.success : colors.expense }]}>
                    {formatCurrency(stats.net, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>TRANSACTIONS</Text>
                  <Text style={[styles.gridValue, { color: colors.cleanWhite }]}>
                    {activeTxList.length} entries
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Category Preview */}
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>TOP EXPENSE CATEGORIES</Text>
              {categoryStats.slice(0, 4).map(cat => (
                <View key={cat.name} style={styles.catPreviewRow}>
                  <View style={styles.catInfoRow}>
                    <View style={styles.catNameWithDot}>
                      <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.catName}>{cat.name}</Text>
                    </View>
                    <Text style={styles.catAmt}>
                      {formatCurrency(cat.amount, currencySymbol)} ({cat.percent}%)
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.max(5, cat.percent))}%`,
                          backgroundColor: cat.color
                        }
                      ]}
                    />
                  </View>
                </View>
              ))}
              {categoryStats.length === 0 && (
                <Text style={styles.emptyNote}>No expenses recorded for this month.</Text>
              )}
            </View>
          </View>
        )}

        {/* TAB 2: Category Spending Breakdown */}
        {activeReportTab === 'CATEGORY' && (
          <View style={styles.tabContentWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>DETAILED CATEGORY DISTRIBUTION</Text>
              <Text style={styles.cardHint}>
                Visual breakdown of where your funds flowed this period.
              </Text>

              {categoryStats.map(cat => (
                <View key={cat.name} style={styles.catDetailedRow}>
                  <View style={styles.catInfoRow}>
                    <View style={styles.catNameWithDot}>
                      <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.catName}>{cat.name}</Text>
                    </View>
                    <Text style={styles.catAmt}>
                      {formatCurrency(cat.amount, currencySymbol)} ({cat.percent}%)
                    </Text>
                  </View>
                  <View style={styles.progressTrackLarge}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.max(4, cat.percent))}%`,
                          backgroundColor: cat.color
                        }
                      ]}
                    />
                  </View>
                </View>
              ))}

              {categoryStats.length === 0 && (
                <Text style={styles.emptyNote}>
                  No category expenses recorded yet. Use + Add to Ledger to record entries.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* TAB 3: Bills Payment History */}
        {activeReportTab === 'BILLS' && (
          <View style={styles.tabContentWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>BILLS & OBLIGATIONS HISTORY</Text>
              <Text style={styles.cardHint}>
                Review manual bill settlements and recurring payments recorded in your ledger.
              </Text>

              {billsTransactions.length > 0 ? (
                billsTransactions.map(b => (
                  <View key={b.id} style={styles.billItemRow}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billIcon}>⚡</Text>
                      <View>
                        <Text style={styles.billTitle}>{b.purpose}</Text>
                        <Text style={styles.billDate}>{b.date} • {b.mode}</Text>
                      </View>
                    </View>
                    <View style={styles.billRight}>
                      <Text style={styles.billAmount}>
                        {formatCurrency(b.amount, currencySymbol)}
                      </Text>
                      <Text style={styles.billStatusBadge}>Settled</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBillsBox}>
                  <Text style={styles.emptyBillsIcon}>📋</Text>
                  <Text style={styles.emptyBillsTitle}>No Bills Recorded</Text>
                  <Text style={styles.emptyNote}>
                    Zero forced bank debits. Use "+ Add to Ledger" to manually record recurring bills and obligations.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB 4: Annual Cash Flow Trend */}
        {activeReportTab === 'CASHFLOW' && (
          <View style={styles.tabContentWrapper}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>CASH FLOW PACING & TRENDS</Text>
              <Text style={styles.cardHint}>
                Monthly income vs. expense comparison across your personal ledger.
              </Text>

              {cashFlowTrend.length > 0 ? (
                cashFlowTrend.map(([month, data]) => {
                  const net = data.income - data.expense;
                  const maxAmt = Math.max(data.income, data.expense, 1);
                  return (
                    <View key={month} style={styles.cashFlowMonthBlock}>
                      <View style={styles.cashFlowHeaderRow}>
                        <Text style={styles.cashFlowMonthName}>{month}</Text>
                        <Text
                          style={[
                            styles.cashFlowNetBadge,
                            { color: net >= 0 ? colors.income : colors.expense }
                          ]}
                        >
                          Net: {net >= 0 ? '+' : ''}{formatCurrency(net, currencySymbol)}
                        </Text>
                      </View>

                      {/* Income Bar */}
                      <View style={styles.flowBarRow}>
                        <Text style={styles.flowBarLabel}>Income</Text>
                        <View style={styles.flowBarTrack}>
                          <View
                            style={[
                              styles.flowBarFill,
                              {
                                width: `${Math.min(100, Math.max(5, (data.income / maxAmt) * 100))}%`,
                                backgroundColor: colors.income
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.flowBarVal}>{formatCurrency(data.income, currencySymbol)}</Text>
                      </View>

                      {/* Expense Bar */}
                      <View style={styles.flowBarRow}>
                        <Text style={styles.flowBarLabel}>Expense</Text>
                        <View style={styles.flowBarTrack}>
                          <View
                            style={[
                              styles.flowBarFill,
                              {
                                width: `${Math.min(100, Math.max(5, (data.expense / maxAmt) * 100))}%`,
                                backgroundColor: colors.expense
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.flowBarVal}>{formatCurrency(data.expense, currencySymbol)}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyNote}>
                  Record transactions to unlock multi-month cash flow trends.
                </Text>
              )}
            </View>
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
  headerCard: {
    backgroundColor: colors.midnightSurface,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0297DE',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.cleanWhite,
    letterSpacing: -0.3,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  monthPill: {
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  monthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cleanWhite
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  printBtn: {
    backgroundColor: '#FC734D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#FC734D',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4
  },
  printBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#02070A'
  },
  excelBtn: {
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: '#22C58B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10
  },
  excelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C58B'
  },
  csvBtn: {
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: '#0297DE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10
  },
  csvBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0297DE'
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6
  },
  subTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#081622',
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  activeSubTabPill: {
    backgroundColor: '#0297DE',
    borderColor: '#0297DE'
  },
  subTabPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  activeSubTabPillText: {
    color: '#02070A',
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110
  },
  tabContentWrapper: {
    gap: 14
  },
  card: {
    backgroundColor: colors.midnightCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8
  },
  cardHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 16
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 16
  },
  rateBig: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.cleanWhite,
    letterSpacing: -1
  },
  pacingBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  pacingBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  grid2: {
    flexDirection: 'row',
    gap: 12
  },
  gridItem: {
    flex: 1
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4
  },
  gridValue: {
    fontSize: 16,
    fontWeight: '800'
  },
  catPreviewRow: {
    marginBottom: 12
  },
  catDetailedRow: {
    marginBottom: 16
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  catNameWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  catName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cleanWhite
  },
  catAmt: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.midnightSurface,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressTrackLarge: {
    height: 8,
    backgroundColor: colors.midnightSurface,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  billIcon: {
    fontSize: 18
  },
  billTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cleanWhite
  },
  billDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  billRight: {
    alignItems: 'flex-end'
  },
  billAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.expense
  },
  billStatusBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.income,
    marginTop: 2
  },
  emptyBillsBox: {
    alignItems: 'center',
    paddingVertical: 20
  },
  emptyBillsIcon: {
    fontSize: 30,
    marginBottom: 8
  },
  emptyBillsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cleanWhite,
    marginBottom: 4
  },
  emptyNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12
  },
  cashFlowMonthBlock: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  cashFlowHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cashFlowMonthName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cleanWhite
  },
  cashFlowNetBadge: {
    fontSize: 12,
    fontWeight: '800'
  },
  flowBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  flowBarLabel: {
    width: 50,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted
  },
  flowBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.midnightSurface,
    borderRadius: 4,
    overflow: 'hidden'
  },
  flowBarFill: {
    height: '100%',
    borderRadius: 4
  },
  flowBarVal: {
    width: 65,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'right'
  }
});
