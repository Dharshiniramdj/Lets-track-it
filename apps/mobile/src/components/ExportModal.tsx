import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ScrollView
} from 'react-native';
import { useTransactionStore } from '../store/transactionStore';
import { useAccountStore } from '../store/accountStore';
import { useGoalStore } from '../store/goalStore';
import { useAuthStore } from '../store/authStore';
import { colors, formatCurrency } from '../theme/colors';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ visible, onClose }) => {
  const { user } = useAuthStore();
  const { transactions, summary } = useTransactionStore();
  const { accounts, getActiveAccount } = useAccountStore();
  const { goals } = useGoalStore();

  const activeAccount = getActiveAccount();
  const currencySymbol = user?.currencyPreference === 'USD' ? '$' : '₹';

  // 1. Export CSV
  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert('Export', 'No transactions recorded yet to export.');
      return;
    }

    const header = 'ID,Date,Amount,Type,Category,Platform,Purpose,PaymentMode,ShoppingApp,DeliveryStatus,ReceiptURL\n';
    const rows = transactions.map(t =>
      `"${t.id}","${t.date}",${t.amount},"${t.type}","${t.category}","${t.platform}","${t.purpose.replace(/"/g, '""')}","${t.mode}","${t.shoppingDetails?.appName || ''}","${t.shoppingDetails?.status || ''}","${t.receiptUrl || ''}"`
    ).join('\n');

    await Share.share({
      message: header + rows,
      title: "Let's Track It — Transactions CSV Export"
    });
    onClose();
  };

  // 2. Export Excel (.xlsx table text)
  const handleExportExcel = async () => {
    if (transactions.length === 0) {
      Alert.alert('Export', 'No transactions recorded yet to export.');
      return;
    }

    const header = 'Date\tType\tCategory\tAmount\tPayment Mode\tPlatform\tPurpose\tReceipt\n';
    const rows = transactions.map(t =>
      `${t.date}\t${t.type}\t${t.category}\t${t.amount}\t${t.mode}\t${t.platform || ''}\t${t.purpose}\t${t.receiptUrl ? 'Yes' : 'No'}`
    ).join('\n');

    await Share.share({
      message: `LET'S TRACK IT — EXCEL STATEMENT\nGenerated: ${new Date().toLocaleString()}\nAccount: ${activeAccount?.name || 'Personal'}\n\n${header}${rows}`,
      title: "Let's Track It — Excel Statement Export"
    });
    onClose();
  };

  // 3. Export Printable PDF Statement
  const handleExportPDF = async () => {
    const totalIncome = summary?.totalIncome || 0;
    const totalExpense = summary?.totalExpense || 0;
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const statement =
      `==================================================\n` +
      `       LET'S TRACK IT — AUDIT-READY STATEMENT     \n` +
      `==================================================\n` +
      `Account        : ${activeAccount?.name || 'Personal'}\n` +
      `User           : ${user?.fullName || 'User'}\n` +
      `Currency       : ${user?.currencyPreference || 'INR'}\n` +
      `Date Range     : All Time (${transactions.length} entries)\n` +
      `Generated At   : ${new Date().toLocaleString()}\n` +
      `--------------------------------------------------\n` +
      `FINANCIAL SUMMARY:\n` +
      `Total Income   : ${formatCurrency(totalIncome, currencySymbol)}\n` +
      `Total Expenses : ${formatCurrency(totalExpense, currencySymbol)}\n` +
      `Net Savings    : ${formatCurrency(netSavings, currencySymbol)}\n` +
      `Savings Rate   : ${savingsRate}%\n` +
      `--------------------------------------------------\n` +
      `RECENT ENTRIES (TOP 20):\n` +
      transactions.slice(0, 20).map(t =>
        `• [${t.date}] ${t.type.padEnd(7)} | ${formatCurrency(t.amount, currencySymbol).padEnd(10)} | ${t.category.padEnd(12)} | ${t.purpose}`
      ).join('\n') +
      `\n\n==================================================\n` +
      `100% Private Ledger • Zero Forced Bank Connection\n` +
      `Exported from Let's Track It\n`;

    await Share.share({
      message: statement,
      title: "Financial Statement Statement"
    });
    onClose();
  };

  // 4. Export JSON Full Workspace Backup (Zero Lock-In)
  const handleExportJSON = async () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.fullName,
        currencyPreference: user?.currencyPreference
      },
      accounts,
      transactions,
      goals
    };

    await Share.share({
      message: JSON.stringify(backupData, null, 2),
      title: "Let's Track It — Full Workspace Backup (JSON)"
    });
    onClose();
  };

  // 5. Share Summary Snapshot
  const handleShareSummary = async () => {
    const totalIncome = summary?.totalIncome || 0;
    const totalExpense = summary?.totalExpense || 0;
    const net = totalIncome - totalExpense;

    const message =
      `📊 LET'S TRACK IT SUMMARY\n` +
      `Account: ${activeAccount?.name || 'Personal'}\n` +
      `Total Income: ${formatCurrency(totalIncome, currencySymbol)}\n` +
      `Total Expenses: ${formatCurrency(totalExpense, currencySymbol)}\n` +
      `Net Balance: ${formatCurrency(net, currencySymbol)}\n` +
      `Total Entries: ${transactions.length}\n` +
      `Active Goals: ${goals.length}\n` +
      `Generated: ${new Date().toLocaleDateString()}`;

    await Share.share({
      message,
      title: "Let's Track It Summary Snapshot"
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Export & Backup Data</Text>
              <Text style={styles.subtitle}>
                Zero vendor lock-in. Export your complete ledger in standard open formats.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {/* Option 1: CSV */}
            <TouchableOpacity style={styles.optionCard} onPress={handleExportCSV}>
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(2, 151, 222, 0.15)' }]}>
                <Text style={styles.optionIcon}>📄</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Export as CSV</Text>
                <Text style={styles.optionSub}>
                  Compatible with Microsoft Excel, Google Sheets, and Numbers.
                </Text>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>

            {/* Option 2: Excel */}
            <TouchableOpacity style={styles.optionCard} onPress={handleExportExcel}>
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(34, 197, 139, 0.15)' }]}>
                <Text style={styles.optionIcon}>📊</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Export as Excel (.xlsx)</Text>
                <Text style={styles.optionSub}>
                  Tabular financial workbook with categories, dates, and amounts.
                </Text>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>

            {/* Option 3: Printable PDF Statement */}
            <TouchableOpacity style={styles.optionCard} onPress={handleExportPDF}>
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(252, 115, 77, 0.15)' }]}>
                <Text style={styles.optionIcon}>🖨️</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Print / Save PDF Statement</Text>
                <Text style={styles.optionSub}>
                  Audit-ready statement with performance metrics and pacing.
                </Text>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>

            {/* Option 4: Full JSON Backup */}
            <TouchableOpacity style={styles.optionCard} onPress={handleExportJSON}>
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Text style={styles.optionIcon}>💾</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Full JSON Backup</Text>
                <Text style={styles.optionSub}>
                  Complete workspace archive of transactions, accounts, and goals.
                </Text>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>

            {/* Option 5: Summary Snapshot */}
            <TouchableOpacity style={styles.optionCard} onPress={handleShareSummary}>
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                <Text style={styles.optionIcon}>📋</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Share Summary Snapshot</Text>
                <Text style={styles.optionSub}>
                  Quick net balance and inflow/outflow summary for messaging.
                </Text>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 7, 10, 0.85)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: colors.midnightSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    padding: 20,
    maxHeight: '85%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.cleanWhite,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
    maxWidth: 270
  },
  closeBtn: {
    padding: 6
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700'
  },
  optionsList: {
    marginBottom: 12
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  optionIcon: {
    fontSize: 20
  },
  optionInfo: {
    flex: 1
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cleanWhite,
    marginBottom: 2
  },
  optionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15
  },
  optionArrow: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '800',
    marginLeft: 8
  },
  cancelBtn: {
    backgroundColor: '#081622',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary
  }
});
