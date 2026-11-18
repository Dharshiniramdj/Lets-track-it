import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAccountStore, MobileAccount } from '../store/accountStore';

export const AccountSelector: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccount } = useAccountStore();

  if (accounts.length === 0) return null;

  return (
    <View style={styles.container} testID="account-selector">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {accounts.map((acc) => {
          const isActive = acc.id === activeAccountId;
          return (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.accountChip,
                isActive && styles.activeChip,
                { borderColor: acc.color || '#6366f1' }
              ]}
              onPress={() => setActiveAccount(acc.id)}
              testID={`account-tab-${acc.type}`}
              accessibilityLabel={`Switch to ${acc.name}`}
            >
              <View style={[styles.dot, { backgroundColor: acc.color || '#6366f1' }]} />
              <Text style={[styles.accountName, isActive && styles.activeText]}>
                {acc.name}
              </Text>
              <Text style={styles.accountType}>
                {acc.type === 'FAMILY' ? '👥' : acc.type === 'BUSINESS' ? '💼' : '👤'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6
  },
  activeChip: {
    backgroundColor: '#eef2ff'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  accountName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  activeText: {
    color: '#4f46e5',
    fontWeight: '700'
  },
  accountType: {
    fontSize: 12
  }
});
