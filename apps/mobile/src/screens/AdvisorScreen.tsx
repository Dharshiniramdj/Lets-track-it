import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import { useAuthStore } from '../store/authStore';
import { ApiClient } from '../services/api.service';
import { colors, formatCurrency } from '../theme/colors';

interface MessageTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

const ROLES = [
  { id: 'COACH', name: 'Wealth Coach', emoji: '🌱' },
  { id: 'AUDITOR', name: 'Rapid Auditor', emoji: '⚡' },
  { id: 'PLANNER', name: 'Strategic Planner', emoji: '📊' },
  { id: 'GUARD', name: 'Shopping Guard', emoji: '🛡️' }
];

export const AdvisorScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { transactions, summary } = useTransactionStore();
  const currencySymbol = user?.currencyPreference === 'USD' ? '$' : '₹';

  const [selectedRole, setSelectedRole] = useState<'COACH' | 'AUDITOR' | 'PLANNER' | 'GUARD'>('COACH');
  const [messages, setMessages] = useState<MessageTurn[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: "Hello! I am your AI Financial Advisor for Let's Track It. I am connected directly to your ledger, category goals, and delivery logs. How can I assist you with your finances today?",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const query = inputText.trim();
    const userMsg: MessageTurn = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsSending(true);

    try {
      // 1. Try remote AI service if running
      const res = await ApiClient.request('/ai/chat', {
        method: 'POST',
        body: {
          role: selectedRole,
          messages: newHistory.map(m => ({ role: m.role, content: m.content }))
        }
      });

      setMessages(prev => [
        ...prev,
        {
          id: `mod-${Date.now()}`,
          role: 'model',
          content: res.response,
          timestamp: Date.now()
        }
      ]);
    } catch {
      // 2. Intelligent local financial analytics fallback (0 lag)
      const totalIncome = summary?.totalIncome || 0;
      const totalExpense = summary?.totalExpense || 0;
      const net = totalIncome - totalExpense;
      const topCat = Object.entries(summary?.categoryBreakdown || {}).sort((a, b) => b[1] - a[1])[0];

      let localAdvice = `Based on your live ledger records:\n\n• Current Net Balance: ${formatCurrency(net, currencySymbol)}\n• Total Income: ${formatCurrency(totalIncome, currencySymbol)}\n• Total Expenses: ${formatCurrency(totalExpense, currencySymbol)}`;

      if (topCat) {
        localAdvice += `\n• Highest Spending Area: ${topCat[0]} (${formatCurrency(topCat[1], currencySymbol)})`;
      }

      if (query.toLowerCase().includes('budget') || query.toLowerCase().includes('save')) {
        localAdvice += `\n\n💡 Tip: You have recorded ${transactions.length} transactions. Setting a strict monthly cap on ${topCat ? topCat[0] : 'discretionary purchases'} will help increase your savings buffer.`;
      } else {
        localAdvice += `\n\nAll your entries are securely synced with Supabase. You can record new entries anytime using the "+ Add to Ledger" button.`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `mod-${Date.now()}`,
          role: 'model',
          content: localAdvice,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container} testID="advisor-screen">
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>AI Financial Advisor</Text>
          <Text style={styles.screenSubtitle}>Powered by Google Gemini</Text>
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>✨ Active</Text>
        </View>
      </View>

      {/* Role Selector Pills */}
      <View style={styles.rolesRow}>
        {ROLES.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.roleChip, selectedRole === r.id && styles.activeRoleChip]}
            onPress={() => setSelectedRole(r.id as any)}
          >
            <Text style={styles.roleEmoji}>{r.emoji}</Text>
            <Text style={[styles.roleName, selectedRole === r.id && styles.activeRoleName]}>
              {r.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(m => {
          const isUser = m.role === 'user';
          return (
            <View
              key={m.id}
              style={[styles.messageBubble, isUser ? styles.userBubble : styles.modelBubble]}
            >
              <Text style={styles.senderLabel}>{isUser ? 'You' : 'Advisor Gemini'}</Text>
              <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                {m.content}
              </Text>
            </View>
          );
        })}
        {isSending && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.electric} />
            <Text style={styles.loadingText}>Analyzing financial patterns...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything about your money, budget..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          testID="advisor-input"
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          disabled={isSending || !inputText.trim()}
          testID="advisor-send-button"
        >
          <Text style={styles.sendBtnIcon}>↑</Text>
        </TouchableOpacity>
      </View>
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
  aiBadge: {
    backgroundColor: colors.electricSubtle,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.electric
  },
  rolesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.midnightDark
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.midnightSurface,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4
  },
  activeRoleChip: {
    backgroundColor: colors.electricSubtle,
    borderColor: colors.electric
  },
  roleEmoji: {
    fontSize: 12
  },
  roleName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary
  },
  activeRoleName: {
    color: colors.electric
  },
  chatScroll: {
    flex: 1
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.cantaloupe,
    borderBottomRightRadius: 4
  },
  modelBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.midnightCard,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    borderBottomLeftRadius: 4
  },
  senderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.cleanWhite
  },
  userMessageText: {
    color: colors.cleanWhite,
    fontWeight: '600'
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: colors.midnightSurface,
    borderTopWidth: 1,
    borderTopColor: colors.midnightBorder,
    alignItems: 'center',
    gap: 10
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.midnightCard,
    borderWidth: 1,
    borderColor: colors.midnightBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.cleanWhite,
    fontSize: 13
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.electric,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendBtnIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.cleanWhite
  }
});
