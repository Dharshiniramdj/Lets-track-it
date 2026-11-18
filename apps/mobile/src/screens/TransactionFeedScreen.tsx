import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Modal,
  Share,
  Alert,
  ScrollView
} from 'react-native';
import { TransactionCard } from '../components/TransactionCard';
import { QuickAddModal } from '../components/QuickAddModal';
import { useTransactionStore, MobileTransaction } from '../store/transactionStore';
import { useAuthStore } from '../store/authStore';
import { MobileDataSyncService } from '../services/dataSync.service';
import { colors, formatCurrency } from '../theme/colors';

const CATEGORIES = [
  'ALL',
  'GROCERY',
  'FOOD',
  'SHOPPING',
  'ELECTRONICS',
  'TRAVEL',
  'BILLS',
  'HEALTH',
  'OTHERS'
];

type EntryType = 'ALL' | 'EXPENSE' | 'INCOME';
type SortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

interface Props {
  onOpenAdd?: () => void;
  onNavigateToAnalytics?: () => void;
}

export const TransactionFeedScreen: React.FC<Props> = ({ onOpenAdd, onNavigateToAnalytics }) => {
  const { user } = useAuthStore();
  const { transactions, setTransactions, updateDeliveryStatus } = useTransactionStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntryType>('ALL');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DATE_DESC');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Dropdown Picker Modal states
  const [activePicker, setActivePicker] = useState<'TYPE' | 'CAT' | 'SORT' | null>(null);

  const currencySymbol = user?.currencyPreference === 'USD' ? '$' : '₹';

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const data = await MobileDataSyncService.fetchUserData(user.id);
      if (data.transactions.length > 0) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.warn('Failed to refresh transactions:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered and Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = transactions.filter(tx => {
      // Type filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

      // Category filter
      if (selectedCat !== 'ALL' && tx.category !== selectedCat) return false;

      // Date range filter
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      // Search query filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPurpose = tx.purpose.toLowerCase().includes(q);
        const matchPlatform = tx.platform.toLowerCase().includes(q);
        const matchProduct = tx.shoppingDetails?.productName.toLowerCase().includes(q);
        const matchNotes = (tx.description || '').toLowerCase().includes(q);
        return matchPurpose || matchPlatform || matchProduct || matchNotes;
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'DATE_DESC') return b.date.localeCompare(a.date);
      if (sortBy === 'DATE_ASC') return a.date.localeCompare(b.date);
      if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
      if (sortBy === 'AMOUNT_ASC') return a.amount - b.amount;
      return 0;
    });

    return list;
  }, [transactions, typeFilter, selectedCat, sortBy, startDate, endDate, search]);

  const hasActiveFilters =
    typeFilter !== 'ALL' ||
    selectedCat !== 'ALL' ||
    sortBy !== 'DATE_DESC' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(search.trim());

  const clearFilters = () => {
    setTypeFilter('ALL');
    setSelectedCat('ALL');
    setSortBy('DATE_DESC');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  // Export as CSV
  const handleExportCSV = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert('Notice', 'No records to export in the current view.');
      return;
    }
    const header = 'Date,Type,Purpose,Category,Amount,Payment Mode,Platform,Notes\n';
    const rows = filteredTransactions
      .map(t =>
        `"${t.date}","${t.type}","${t.purpose.replace(/"/g, '""')}","${t.category}",${t.amount},"${t.mode}","${t.platform || ''}","${(t.description || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    await Share.share({
      title: 'Ledger Export (CSV)',
      message: `${header}${rows}`
    });
  };

  // Export as Excel Table (.xlsx text simulation)
  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert('Notice', 'No records to export in the current view.');
      return;
    }
    const header = 'Date\tType\tPurpose\tCategory\tAmount\tPayment Mode\tPlatform\n';
    const rows = filteredTransactions
      .map(t => `${t.date}\t${t.type}\t${t.purpose}\t${t.category}\t${t.amount}\t${t.mode}\t${t.platform || ''}`)
      .join('\n');

    await Share.share({
      title: 'Ledger Export (Excel)',
      message: `LET'S TRACK IT — EXCEL STATEMENT\n${header}${rows}`
    });
  };

  // Export as Quick Summary Snapshot
  const handleExportSnapshot = async () => {
    const totalSpent = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((a, b) => a + b.amount, 0);
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((a, b) => a + b.amount, 0);

    const snapshot =
      `📊 LET'S TRACK IT — LEDGER SNAPSHOT\n` +
      `User: ${user?.fullName || 'User'}\n` +
      `Entries: ${filteredTransactions.length}\n` +
      `Total Inflow: ${formatCurrency(totalIncome, currencySymbol)}\n` +
      `Total Outflow: ${formatCurrency(totalSpent, currencySymbol)}\n` +
      `Net Balance: ${formatCurrency(totalIncome - totalSpent, currencySymbol)}\n` +
      `Filtered by: Type=${typeFilter}, Cat=${selectedCat}, Sort=${sortBy}\n` +
      `Timestamp: ${new Date().toLocaleString()}`;

    await Share.share({
      title: 'Ledger Snapshot',
      message: snapshot
    });
  };

  const getTypeLabel = () => {
    if (typeFilter === 'EXPENSE') return 'Expenses Only';
    if (typeFilter === 'INCOME') return 'Income Only';
    return 'All Entries';
  };

  const getSortLabel = () => {
    if (sortBy === 'DATE_ASC') return 'Oldest First';
    if (sortBy === 'AMOUNT_DESC') return 'Highest Amount';
    if (sortBy === 'AMOUNT_ASC') return 'Lowest Amount';
    return 'Newest First';
  };

  return (
    <View style={styles.container} testID="transaction-feed-screen">
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Personal Ledger</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTransactions.length} recorded entries
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onOpenAdd ? onOpenAdd() : setShowAddModal(true)}
          testID="ledger-add-button"
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add to Ledger</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search purchases, apps, merchants, notes..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          testID="search-input"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* WEB-LIKE FILTER TASK BAR (Image 2) */}
      <View style={styles.taskBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.taskBarScroll}
        >
          {/* Dropdown 1: All Entries */}
          <TouchableOpacity
            style={[styles.taskDropdown, typeFilter !== 'ALL' && styles.activeDropdown]}
            onPress={() => setActivePicker('TYPE')}
          >
            <Text style={[styles.taskDropdownText, typeFilter !== 'ALL' && styles.activeDropdownText]}>
              {getTypeLabel()}
            </Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </TouchableOpacity>

          {/* Dropdown 2: All Categories */}
          <TouchableOpacity
            style={[styles.taskDropdown, selectedCat !== 'ALL' && styles.activeDropdown]}
            onPress={() => setActivePicker('CAT')}
          >
            <Text style={[styles.taskDropdownText, selectedCat !== 'ALL' && styles.activeDropdownText]}>
              {selectedCat === 'ALL' ? 'All Categories' : selectedCat}
            </Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </TouchableOpacity>

          {/* Dropdown 3: Sort Switcher */}
          <TouchableOpacity
            style={[styles.taskDropdown, sortBy !== 'DATE_DESC' && styles.activeDropdown]}
            onPress={() => setActivePicker('SORT')}
          >
            <Text style={[styles.taskDropdownText, sortBy !== 'DATE_DESC' && styles.activeDropdownText]}>
              {getSortLabel()}
            </Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </TouchableOpacity>

          {/* Date Range Inputs */}
          <View style={styles.dateFilterGroup}>
            <Text style={styles.datePrefix}>FROM</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={startDate}
              onChangeText={setStartDate}
            />
            <Text style={styles.dateDivider}>|</Text>
            <Text style={styles.datePrefix}>TO</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>

          {/* Export Action Icons (Matching Image 2) */}
          <View style={styles.exportIconGroup}>
            {/* Excel (.xlsx) */}
            <TouchableOpacity
              style={styles.exportIconBtn}
              onPress={handleExportExcel}
              accessibilityLabel="Export Excel"
            >
              <Text style={styles.exportIconText}>📊</Text>
            </TouchableOpacity>

            {/* CSV */}
            <TouchableOpacity
              style={styles.exportIconBtn}
              onPress={handleExportCSV}
              accessibilityLabel="Export CSV"
            >
              <Text style={styles.exportIconText}>📄</Text>
            </TouchableOpacity>

            {/* Snapshot */}
            <TouchableOpacity
              style={styles.exportIconBtn}
              onPress={handleExportSnapshot}
              accessibilityLabel="Snapshot"
            >
              <Text style={styles.exportIconText}>📸</Text>
            </TouchableOpacity>
          </View>

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <TouchableOpacity style={styles.resetPill} onPress={clearFilters}>
              <Text style={styles.resetPillText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* High-Performance Smooth FlatList */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.electric}
          />
        }
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onStatusChange={updateDeliveryStatus}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No matching ledger records found</Text>
            {hasActiveFilters ? (
              <TouchableOpacity style={styles.emptyAddBtn} onPress={clearFilters}>
                <Text style={styles.emptyAddBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => onOpenAdd ? onOpenAdd() : setShowAddModal(true)}
              >
                <Text style={styles.emptyAddBtnText}>+ Add to Ledger</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Dropdown Selection Modal */}
      <Modal
        visible={activePicker !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActivePicker(null)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeaderTitle}>
              {activePicker === 'TYPE' && 'Filter by Entry Type'}
              {activePicker === 'CAT' && 'Filter by Category'}
              {activePicker === 'SORT' && 'Sort Transactions'}
            </Text>

            {/* TYPE OPTIONS */}
            {activePicker === 'TYPE' && (
              <View style={styles.pickerOptionsList}>
                {[
                  { id: 'ALL', label: 'All Entries' },
                  { id: 'EXPENSE', label: 'Expenses Only (Debits)' },
                  { id: 'INCOME', label: 'Income Only (Credits)' }
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.pickerOptionRow,
                      typeFilter === opt.id && styles.activePickerOptionRow
                    ]}
                    onPress={() => {
                      setTypeFilter(opt.id as EntryType);
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionLabel,
                        typeFilter === opt.id && styles.activePickerOptionLabel
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {typeFilter === opt.id && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* CATEGORY OPTIONS */}
            {activePicker === 'CAT' && (
              <ScrollView style={{ maxHeight: 320 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOptionRow,
                      selectedCat === cat && styles.activePickerOptionRow
                    ]}
                    onPress={() => {
                      setSelectedCat(cat);
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionLabel,
                        selectedCat === cat && styles.activePickerOptionLabel
                      ]}
                    >
                      {cat === 'ALL' ? 'All Categories' : cat}
                    </Text>
                    {selectedCat === cat && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* SORT OPTIONS */}
            {activePicker === 'SORT' && (
              <View style={styles.pickerOptionsList}>
                {[
                  { id: 'DATE_DESC', label: 'Newest First' },
                  { id: 'DATE_ASC', label: 'Oldest First' },
                  { id: 'AMOUNT_DESC', label: 'Highest Amount' },
                  { id: 'AMOUNT_ASC', label: 'Lowest Amount' }
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.pickerOptionRow,
                      sortBy === opt.id && styles.activePickerOptionRow
                    ]}
                    onPress={() => {
                      setSortBy(opt.id as SortOption);
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionLabel,
                        sortBy === opt.id && styles.activePickerOptionLabel
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {sortBy === opt.id && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.pickerCloseBtn}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add to Ledger Modal */}
      <QuickAddModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: colors.midnightSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.cleanWhite,
    letterSpacing: -0.5
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  addBtn: {
    backgroundColor: colors.cantaloupe,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: colors.cantaloupe,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  addBtnText: {
    color: '#02070A',
    fontWeight: '900',
    fontSize: 12
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.cleanWhite,
    fontSize: 12
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 28,
    padding: 6
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  taskBarContainer: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder,
    backgroundColor: colors.midnightCard
  },
  taskBarScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8
  },
  taskDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  activeDropdown: {
    borderColor: colors.cantaloupe,
    backgroundColor: 'rgba(252, 115, 77, 0.1)'
  },
  taskDropdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cleanWhite
  },
  activeDropdownText: {
    color: colors.cantaloupe
  },
  dropdownChevron: {
    fontSize: 10,
    color: colors.textMuted
  },
  dateFilterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  datePrefix: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted
  },
  dateInput: {
    width: 80,
    fontSize: 10,
    color: colors.cleanWhite,
    padding: 0,
    margin: 0
  },
  dateDivider: {
    color: colors.midnightBorder
  },
  exportIconGroup: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  exportIconBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#050E17',
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exportIconText: {
    fontSize: 14
  },
  resetPill: {
    backgroundColor: 'rgba(252, 115, 77, 0.15)',
    borderWidth: 1,
    borderColor: colors.cantaloupe,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  resetPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.cantaloupe
  },
  listContent: {
    padding: 16,
    paddingBottom: 100
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 8
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16
  },
  emptyAddBtn: {
    backgroundColor: colors.cantaloupe,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12
  },
  emptyAddBtnText: {
    color: '#02070A',
    fontWeight: '800',
    fontSize: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 7, 10, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  pickerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.midnightSurface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.midnightBorder
  },
  pickerHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cleanWhite,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.midnightBorder
  },
  pickerOptionsList: {
    gap: 6
  },
  pickerOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#050E17',
    marginBottom: 4
  },
  activePickerOptionRow: {
    backgroundColor: 'rgba(252, 115, 77, 0.15)',
    borderWidth: 1,
    borderColor: colors.cantaloupe
  },
  pickerOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cleanWhite
  },
  activePickerOptionLabel: {
    color: colors.cantaloupe
  },
  pickerCheck: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.cantaloupe
  },
  pickerCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#081622'
  },
  pickerCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  }
});
