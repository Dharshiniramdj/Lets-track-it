import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform
} from 'react-native';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore, MobileTransaction } from '../store/transactionStore';
import { useAuthStore } from '../store/authStore';
import { MobileDataSyncService } from '../services/dataSync.service';
import { colors, formatCurrency } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  currencySymbol?: string;
}

interface DropdownOption {
  label: string;
  value: string;
  icon?: string;
}

const CATEGORY_OPTIONS: DropdownOption[] = [
  { label: 'Groceries', value: 'GROCERY', icon: '🛒' },
  { label: 'Food & Dining', value: 'FOOD', icon: '🍔' },
  { label: 'Shopping', value: 'SHOPPING', icon: '🛍️' },
  { label: 'Travel & Commute', value: 'TRAVEL', icon: '✈️' },
  { label: 'Bills & Utilities', value: 'BILLS', icon: '💡' },
  { label: 'Entertainment', value: 'ENTERTAINMENT', icon: '🍿' },
  { label: 'Medical & Health', value: 'MEDICAL', icon: '💊' },
  { label: 'Electronics & Tech', value: 'ELECTRONICS', icon: '💻' },
  { label: 'General / Others', value: 'OTHERS', icon: '📦' }
];

const PAYMENT_MODES: DropdownOption[] = [
  { label: 'UPI (GPay / PhonePe / Paytm)', value: 'UPI', icon: '⚡' },
  { label: 'Credit Card', value: 'CARD', icon: '💳' },
  { label: 'Debit Card', value: 'CARD', icon: '💳' },
  { label: 'Net Banking', value: 'NET_BANKING', icon: '🏦' },
  { label: 'Cash in Hand', value: 'CASH', icon: '💵' }
];

const PLATFORM_OPTIONS: DropdownOption[] = [
  { label: 'Zepto Quick Commerce', value: 'Zepto', icon: '⚡' },
  { label: 'Blinkit Instant Delivery', value: 'Blinkit', icon: '🟡' },
  { label: 'Swiggy / Instamart', value: 'Swiggy', icon: '🍔' },
  { label: 'Zomato Dining & Delivery', value: 'Zomato', icon: '🍕' },
  { label: 'Amazon India', value: 'Amazon', icon: '📦' },
  { label: 'Flipkart', value: 'Flipkart', icon: '🛍️' },
  { label: 'Uber Ride', value: 'Uber', icon: '🚗' },
  { label: 'Ola Cabs', value: 'Ola', icon: '🚕' },
  { label: 'Direct Merchant / Other', value: 'Store', icon: '🏪' }
];

export const QuickAddModal: React.FC<Props> = ({
  visible,
  onClose,
  currencySymbol = '₹'
}) => {
  const { accounts, activeAccountId, setActiveAccount } = useAccountStore();
  const { addTransaction } = useTransactionStore();
  const { user } = useAuthStore();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [category, setCategory] = useState('GROCERY');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH' | 'CARD' | 'NET_BANKING'>('UPI');
  const [platform, setPlatform] = useState('Zepto');

  // Online Order Details (Shopping mode)
  const [isShoppingMode, setIsShoppingMode] = useState(true);
  const [appName, setAppName] = useState('Zepto');
  const [productName, setProductName] = useState('');
  const [forWhom, setForWhom] = useState('Self');
  const [deliveryEst, setDeliveryEst] = useState('');

  // Receipt Attachment State (Feature from Web)
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);

  // Dropdown Picker Modal State
  const [dropdownConfig, setDropdownConfig] = useState<{
    visible: boolean;
    title: string;
    options: DropdownOption[];
    onSelect: (val: string, opt: DropdownOption) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    onSelect: () => {}
  });

  const [naturalInput, setNaturalInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setAmount('');
    setPurpose('');
    setType('EXPENSE');
    setCategory('GROCERY');
    setPaymentMode('UPI');
    setPlatform('Zepto');
    setIsShoppingMode(true);
    setAppName('Zepto');
    setProductName('');
    setForWhom('Self');
    setDeliveryEst('');
    setReceiptUrl('');
    setReceiptFileName('');
    setNaturalInput('');
  };

  const openDropdown = (
    title: string,
    options: DropdownOption[],
    onSelect: (val: string, opt: DropdownOption) => void
  ) => {
    setDropdownConfig({
      visible: true,
      title,
      options,
      onSelect: (val, opt) => {
        onSelect(val, opt);
        setDropdownConfig(prev => ({ ...prev, visible: false }));
      }
    });
  };

  const handleQuickMerchant = (merchant: string, defaultCat: string) => {
    setIsShoppingMode(true);
    setAppName(merchant);
    setPlatform(merchant);
    setCategory(defaultCat);
    if (!purpose) setPurpose(`${merchant} Order`);
  };

  const handleAiParse = async () => {
    if (!naturalInput.trim()) return;
    setIsAiParsing(true);
    try {
      const text = naturalInput.trim();
      const amtMatch = text.match(/(\d+(?:\.\d+)?)/);
      if (amtMatch) {
        setAmount(amtMatch[1]);
      }
      const lower = text.toLowerCase();
      if (lower.includes('zepto')) {
        handleQuickMerchant('Zepto', 'GROCERY');
      } else if (lower.includes('blinkit')) {
        handleQuickMerchant('Blinkit', 'GROCERY');
      } else if (lower.includes('instamart') || lower.includes('swiggy')) {
        handleQuickMerchant('Swiggy', 'GROCERY');
      } else if (lower.includes('zomato')) {
        handleQuickMerchant('Zomato', 'FOOD');
      } else if (lower.includes('amazon')) {
        handleQuickMerchant('Amazon', 'SHOPPING');
      } else if (lower.includes('flipkart')) {
        handleQuickMerchant('Flipkart', 'SHOPPING');
      } else if (lower.includes('uber') || lower.includes('ola')) {
        setCategory('TRAVEL');
        setPlatform('Uber');
        setPurpose('Cab Ride');
      }

      if (!purpose && text) {
        const clean = text
          .replace(/(\d+(?:\.\d+)?)/g, '')
          .replace(/for|at|rs|\₹/gi, '')
          .trim();
        if (clean) setPurpose(clean);
      }
    } finally {
      setIsAiParsing(false);
    }
  };

      {/* Receipt Source Selector Modal */}
      <Modal visible={showReceiptOptions} transparent animationType="slide">
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownModalSheet}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Attach Receipt or Bill</Text>
              <TouchableOpacity onPress={() => setShowReceiptOptions(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.receiptSelectSubtitle}>
              Attach an invoice image, photo, or document URL:
            </Text>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>DOCUMENT / INVOICE URL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://example.com/invoice.jpg"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={(e) => {
                  if (e.nativeEvent.text.trim()) {
                    setReceiptUrl(e.nativeEvent.text.trim());
                    setReceiptFileName('Uploaded_Receipt.jpg');
                    setShowReceiptOptions(false);
                  }
                }}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 16 }]}
              onPress={() => setShowReceiptOptions(false)}
            >
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please specify a positive numerical amount.');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Required', 'Please describe the transaction or merchant.');
      return;
    }

    setIsSaving(true);
    try {
      const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isoDate = date.includes('-') && date.split('-')[0].length === 4
        ? date
        : new Date().toISOString().split('T')[0];

      const payload: MobileTransaction = {
        id: txId,
        accountId: activeAccountId || `acc-${user?.id || 'default'}`,
        amount: parsedAmount,
        type,
        mode: paymentMode,
        platform: platform.trim() || 'Store',
        purpose: purpose.trim(),
        category: category.trim().toUpperCase() || 'OTHERS',
        date: isoDate,
        receiptUrl: receiptUrl || undefined,
        receiptFileName: receiptFileName || undefined,
        shoppingDetails: isShoppingMode
          ? {
              appName: appName || platform || 'Shopping',
              productName: productName.trim() || purpose.trim(),
              status: 'ORDERED',
              orderedDate: new Date().toISOString(),
              deliveryDate: deliveryEst || undefined
            }
          : undefined,
        createdAt: Date.now()
      };

      // 1. Instant optimistic local addition (Zero lag!)
      addTransaction(payload);
      resetForm();
      onClose();

      // 2. Background sync to Supabase (Zero lag, non-blocking)
      if (user?.id) {
        MobileDataSyncService.saveTransaction(payload, user.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const currentCategoryObj = CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[0];
  const currentPaymentObj = PAYMENT_MODES.find(p => p.value === paymentMode) || PAYMENT_MODES[0];
  const currentPlatformObj = PLATFORM_OPTIONS.find(p => p.value === platform) || PLATFORM_OPTIONS[0];
  const activeAccountObj = accounts.find(a => a.id === activeAccountId) || { name: 'Personal Account', id: 'default' };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay} testID="quick-add-modal">
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Add to Ledger</Text>
              <Text style={styles.subtitle}>Direct Transaction & Receipt Storage</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="quick-add-close">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {/* Smart Fast-Fill Bar */}
            <View style={styles.aiBarContainer}>
              <TextInput
                style={styles.aiInput}
                placeholder="⚡ Quick fill: 'Blinkit 380 milk & bread'..."
                placeholderTextColor={colors.textMuted}
                value={naturalInput}
                onChangeText={setNaturalInput}
              />
              <TouchableOpacity
                style={styles.aiParseBtn}
                onPress={handleAiParse}
                disabled={isAiParsing}
              >
                {isAiParsing ? (
                  <ActivityIndicator size="small" color="#02070A" />
                ) : (
                  <Text style={styles.aiParseText}>Fill</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Merchant Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChipsScroll}>
              {[
                { name: 'Zepto', cat: 'GROCERY', icon: '⚡' },
                { name: 'Blinkit', cat: 'GROCERY', icon: '🟡' },
                { name: 'Swiggy', cat: 'FOOD', icon: '🍔' },
                { name: 'Zomato', cat: 'FOOD', icon: '🍕' },
                { name: 'Amazon', cat: 'SHOPPING', icon: '📦' },
                { name: 'Uber', cat: 'TRAVEL', icon: '🚗' }
              ].map(item => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.quickChip,
                    appName === item.name && styles.quickChipActive
                  ]}
                  onPress={() => handleQuickMerchant(item.name, item.cat)}
                >
                  <Text style={styles.quickChipIcon}>{item.icon}</Text>
                  <Text style={[styles.quickChipText, appName === item.name && styles.quickChipTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Account Selector Dropdown */}
            <Text style={styles.fieldLabel}>DESTINATION ACCOUNT</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() =>
                openDropdown(
                  'Select Account',
                  accounts.map(a => ({ label: `${a.name} (${a.type})`, value: a.id, icon: '💳' })),
                  (id) => setActiveAccount(id)
                )
              }
            >
              <View style={styles.dropdownLeft}>
                <Text style={styles.dropdownIcon}>💳</Text>
                <Text style={styles.dropdownValueText}>{activeAccountObj.name}</Text>
              </View>
              <Text style={styles.chevronIcon}>▼</Text>
            </TouchableOpacity>

            {/* Transaction Type Segment */}
            <View style={styles.typeSegmentRow}>
              {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    type === t && (t === 'INCOME' ? styles.typeBtnIncome : styles.typeBtnExpense)
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                    {t === 'EXPENSE' ? '📉 Expense' : t === 'INCOME' ? '📈 Income' : '🔄 Transfer'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <View style={styles.amountBox}>
              <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                testID="quick-add-amount"
                autoFocus={false}
              />
            </View>

            {/* Purpose / Merchant Input */}
            <Text style={styles.fieldLabel}>PURPOSE / STORE NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Zepto Groceries, Coffee, Freelance Payout"
              placeholderTextColor={colors.textMuted}
              value={purpose}
              onChangeText={setPurpose}
              testID="quick-add-purpose"
            />

            {/* Category Dropdown Menu */}
            <Text style={styles.fieldLabel}>BUDGET CATEGORY</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() =>
                openDropdown(
                  'Select Category',
                  CATEGORY_OPTIONS,
                  (val) => setCategory(val)
                )
              }
            >
              <View style={styles.dropdownLeft}>
                <Text style={styles.dropdownIcon}>{currentCategoryObj.icon}</Text>
                <Text style={styles.dropdownValueText}>{currentCategoryObj.label}</Text>
              </View>
              <Text style={styles.chevronIcon}>▼</Text>
            </TouchableOpacity>

            {/* Payment Mode Dropdown Menu */}
            <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() =>
                openDropdown(
                  'Select Payment Method',
                  PAYMENT_MODES,
                  (val) => setPaymentMode(val as any)
                )
              }
            >
              <View style={styles.dropdownLeft}>
                <Text style={styles.dropdownIcon}>{currentPaymentObj.icon}</Text>
                <Text style={styles.dropdownValueText}>{currentPaymentObj.label}</Text>
              </View>
              <Text style={styles.chevronIcon}>▼</Text>
            </TouchableOpacity>

            {/* Receipt Storage Section (Web Feature in Add Ledger) */}
            <View style={styles.receiptContainer}>
              <View style={styles.receiptHeaderRow}>
                <Text style={styles.receiptTitle}>🧾 STORE RECEIPT / BILL</Text>
                {receiptUrl ? (
                  <TouchableOpacity onPress={() => { setReceiptUrl(''); setReceiptFileName(''); }}>
                    <Text style={styles.removeReceiptText}>✕ Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {receiptUrl ? (
                <View style={styles.receiptPreviewBox}>
                  <Image source={{ uri: receiptUrl }} style={styles.receiptThumbnail} resizeMode="cover" />
                  <View style={styles.receiptMeta}>
                    <Text style={styles.receiptFileName} numberOfLines={1}>{receiptFileName || 'Receipt_Doc.jpg'}</Text>
                    <Text style={styles.receiptStatusText}>✓ Attached to Ledger Record</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.attachReceiptBtn}
                  onPress={() => setShowReceiptOptions(true)}
                  testID="attach-receipt-btn"
                >
                  <Text style={styles.attachReceiptIcon}>📎</Text>
                  <Text style={styles.attachReceiptText}>Attach Receipt Image or Invoice</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Shopping Logistics Mode Toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Track Delivery / Online Order</Text>
                <Text style={styles.toggleSub}>Log order status & delivery tracking</Text>
              </View>
              <Switch
                value={isShoppingMode}
                onValueChange={setIsShoppingMode}
                trackColor={{ false: colors.border, true: colors.cantaloupe }}
                thumbColor={colors.textPrimary}
              />
            </View>

            {/* Shopping Dropdown & Details */}
            {isShoppingMode && (
              <View style={styles.shoppingSubCard}>
                <Text style={styles.fieldLabel}>APP / PLATFORM</Text>
                <TouchableOpacity
                  style={styles.dropdownSelector}
                  onPress={() =>
                    openDropdown(
                      'Select Platform',
                      PLATFORM_OPTIONS,
                      (val) => {
                        setPlatform(val);
                        setAppName(val);
                      }
                    )
                  }
                >
                  <View style={styles.dropdownLeft}>
                    <Text style={styles.dropdownIcon}>{currentPlatformObj.icon}</Text>
                    <Text style={styles.dropdownValueText}>{currentPlatformObj.label}</Text>
                  </View>
                  <Text style={styles.chevronIcon}>▼</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>ITEM NAME (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Milk, Protein Powder, Headphones"
                  placeholderTextColor={colors.textMuted}
                  value={productName}
                  onChangeText={setProductName}
                />

                <Text style={styles.fieldLabel}>ESTIMATED DELIVERY (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 10 Mins, Tomorrow, 24 Nov"
                  placeholderTextColor={colors.textMuted}
                  value={deliveryEst}
                  onChangeText={setDeliveryEst}
                />
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isSaving}
              testID="quick-add-save"
            >
              {isSaving ? (
                <ActivityIndicator color="#02070A" />
              ) : (
                <Text style={styles.saveBtnText}>Save to Ledger</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Universal Dropdown Picker Modal */}
      <Modal visible={dropdownConfig.visible} transparent animationType="fade">
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownModalSheet}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{dropdownConfig.title}</Text>
              <TouchableOpacity onPress={() => setDropdownConfig(prev => ({ ...prev, visible: false }))}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {dropdownConfig.options.map(opt => (
                <TouchableOpacity
                  key={opt.value + opt.label}
                  style={styles.dropdownOptionRow}
                  onPress={() => dropdownConfig.onSelect(opt.value, opt)}
                >
                  {opt.icon && <Text style={styles.dropdownOptionIcon}>{opt.icon}</Text>}
                  <Text style={styles.dropdownOptionLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt Source Selector Modal */}
      <Modal visible={showReceiptOptions} transparent animationType="slide">
        <View style={styles.dropdownModalOverlay}>
          <View style={styles.dropdownModalSheet}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Attach Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceiptOptions(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.receiptSelectSubtitle}>Paste an image URL to attach a receipt or bill scan:</Text>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>OR CUSTOM IMAGE URL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://example.com/receipt.jpg"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={(e) => {
                  if (e.nativeEvent.text.trim()) {
                    setReceiptUrl(e.nativeEvent.text.trim());
                    setReceiptFileName('Web_Receipt.jpg');
                    setShowReceiptOptions(false);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 7, 10, 0.85)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '92%'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  scrollArea: {
    marginTop: 4
  },
  aiBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)',
    paddingHorizontal: 12,
    marginBottom: 12
  },
  aiInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 10
  },
  aiParseBtn: {
    backgroundColor: colors.electric,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  aiParseText: {
    color: '#02070A',
    fontWeight: '800',
    fontSize: 11
  },
  quickChipsScroll: {
    marginBottom: 14
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8
  },
  quickChipActive: {
    borderColor: colors.cantaloupe,
    backgroundColor: 'rgba(252, 115, 77, 0.15)'
  },
  quickChipIcon: {
    fontSize: 14,
    marginRight: 6
  },
  quickChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  quickChipTextActive: {
    color: colors.cantaloupe,
    fontWeight: '800'
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  dropdownIcon: {
    fontSize: 16
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  chevronIcon: {
    fontSize: 11,
    color: colors.textSecondary
  },
  typeSegmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  typeBtnExpense: {
    backgroundColor: colors.cantaloupe
  },
  typeBtnIncome: {
    backgroundColor: colors.electric
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  typeBtnTextActive: {
    color: '#02070A',
    fontWeight: '800'
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cantaloupe,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 10
  },
  currencyPrefix: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.cantaloupe,
    marginRight: 8
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6
  },
  receiptContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginVertical: 10
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  receiptTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.electric,
    letterSpacing: 0.5
  },
  removeReceiptText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger
  },
  attachReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(2, 151, 222, 0.4)',
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(2, 151, 222, 0.05)'
  },
  attachReceiptIcon: {
    fontSize: 16
  },
  attachReceiptText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.electric
  },
  receiptPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  receiptThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6
  },
  receiptMeta: {
    flex: 1
  },
  receiptFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary
  },
  receiptStatusText: {
    fontSize: 10,
    color: colors.success,
    marginTop: 2
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  shoppingSubCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10
  },
  saveBtn: {
    backgroundColor: colors.cantaloupe,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 18,
    shadowColor: colors.cantaloupe,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#02070A'
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 7, 10, 0.8)',
    justifyContent: 'center',
    padding: 24
  },
  dropdownModalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 10
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 53, 79, 0.5)',
    gap: 12
  },
  dropdownOptionIcon: {
    fontSize: 18
  },
  dropdownOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary
  },
  receiptSelectSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12
  },
  sampleReceiptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8
  },
  sampleThumb: {
    width: 40,
    height: 40,
    borderRadius: 8
  },
  sampleName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary
  },
  sampleSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  sampleSelectIcon: {
    fontSize: 16
  }
});
