import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { MobileTransaction } from '../store/transactionStore';
import { colors, formatCurrency } from '../theme/colors';

interface Props {
  transaction: MobileTransaction;
  currencySymbol?: string;
  onPress?: (tx: MobileTransaction) => void;
  onUpdateDeliveryStatus?: (txId: string, status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED', deliveryDate?: string) => void;
  onStatusChange?: (txId: string, status: 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED', deliveryDate?: string) => void;
}

export const TransactionCard: React.FC<Props> = ({
  transaction,
  currencySymbol = '₹',
  onPress,
  onUpdateDeliveryStatus,
  onStatusChange
}) => {
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const handleUpdateStatus = onStatusChange || onUpdateDeliveryStatus;
  const isIncome = transaction.type === 'INCOME';
  const hasShopping = !!transaction.shoppingDetails;
  const shopping = transaction.shoppingDetails;
  const hasReceipt = !!transaction.receiptUrl;

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'DELIVERED': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'SHIPPED': return { bg: 'rgba(2, 151, 222, 0.15)', text: '#0297DE', border: 'rgba(2, 151, 222, 0.3)' };
      case 'RETURNED': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'ORDERED':
      default: return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  const badgeStyle = getStatusBadgeColor(shopping?.status);

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress && onPress(transaction)}
        activeOpacity={0.7}
        testID={`transaction-card-${transaction.id}`}
        accessibilityLabel={`Transaction for ${transaction.purpose}`}
      >
        <View style={styles.topRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.purposeText} numberOfLines={1}>
              {transaction.purpose}
            </Text>
            <View style={styles.tagRow}>
              <Text style={styles.platformBadge}>{transaction.platform || 'UPI'}</Text>
              <Text style={styles.categoryBadge}>{transaction.category || 'GENERAL'}</Text>
              <Text style={styles.modeBadge}>{transaction.mode || 'ONLINE'}</Text>
              {hasReceipt && (
                <TouchableOpacity
                  style={styles.receiptBadge}
                  onPress={() => setShowReceiptPreview(true)}
                >
                  <Text style={styles.receiptBadgeText}>🧾 Receipt</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.rightAmount}>
            <Text
              style={[
                styles.amountText,
                { color: isIncome ? colors.income : colors.expense }
              ]}
            >
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, currencySymbol)}
            </Text>
            <Text style={styles.dateText}>
              {transaction.date}
            </Text>
          </View>
        </View>

        {/* Shopping Logistics Mode Section */}
        {hasShopping && shopping && (
          <View style={styles.shoppingSection} testID="shopping-details-view">
            <View style={styles.shoppingHeader}>
              <Text style={styles.shoppingProduct} numberOfLines={1}>
                📦 {shopping.productName || transaction.purpose} ({shopping.appName || 'Delivery'})
              </Text>
              <View
                style={[
                  styles.deliveryBadge,
                  { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }
                ]}
              >
                <Text style={[styles.deliveryStatusText, { color: badgeStyle.text }]}>
                  {shopping.status}
                </Text>
              </View>
            </View>

            {/* Status Progression Buttons */}
            {handleUpdateStatus && shopping.status !== 'DELIVERED' && (
              <View style={styles.statusButtonsRow}>
                {shopping.status === 'ORDERED' && (
                  <TouchableOpacity
                    style={styles.statusActionBtn}
                    onPress={() => handleUpdateStatus(transaction.id, 'SHIPPED')}
                    testID={`mark-shipped-${transaction.id}`}
                  >
                    <Text style={styles.statusActionBtnText}>Mark Shipped</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.statusActionBtn, styles.statusDeliveredBtn]}
                  onPress={() => handleUpdateStatus(transaction.id, 'DELIVERED')}
                  testID={`mark-delivered-${transaction.id}`}
                >
                  <Text style={styles.statusDeliveredBtnText}>✓ Mark Delivered</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Full-Screen Receipt Preview Modal */}
      {hasReceipt && (
        <Modal visible={showReceiptPreview} transparent animationType="fade">
          <View style={styles.receiptModalOverlay}>
            <View style={styles.receiptModalContent}>
              <View style={styles.receiptModalHeader}>
                <View>
                  <Text style={styles.receiptModalTitle}>Stored Receipt / Invoice</Text>
                  <Text style={styles.receiptModalSubtitle}>{transaction.purpose} • {transaction.date}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReceiptPreview(false)} style={styles.closeReceiptBtn}>
                  <Text style={styles.closeReceiptText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Image
                source={{ uri: transaction.receiptUrl }}
                style={styles.fullReceiptImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  leftInfo: {
    flex: 1,
    marginRight: 12
  },
  purposeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cleanWhite,
    marginBottom: 6
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  },
  platformBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.electric,
    backgroundColor: colors.electricSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(2, 151, 222, 0.25)'
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  receiptBadge: {
    backgroundColor: 'rgba(252, 115, 77, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(252, 115, 77, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  receiptBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.cantaloupe
  },
  rightAmount: {
    alignItems: 'flex-end'
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted
  },
  shoppingSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  shoppingProduct: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8
  },
  deliveryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5
  },
  deliveryStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  statusActionBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border
  },
  statusActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary
  },
  statusDeliveredBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusDeliveredBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981'
  },
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 7, 10, 0.92)',
    justifyContent: 'center',
    padding: 20
  },
  receiptModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '80%'
  },
  receiptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  receiptModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary
  },
  receiptModalSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  closeReceiptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeReceiptText: {
    color: colors.textSecondary,
    fontWeight: '700'
  },
  fullReceiptImage: {
    width: '100%',
    height: 380,
    borderRadius: 12
  }
});
