import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabaseClient';
import { storage } from '../services/storage.service';
import { colors, formatCurrency } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const EMPLOYMENT_STATUSES = [
  'Employed Full-Time',
  'Freelancer / Independent',
  'Tech / Entrepreneur',
  'Student',
  'Business Owner'
];

const FINANCIAL_GOAL_PRESETS = [
  'Emergency Cushion (6 Months)',
  'Zero Credit Debt Payoff',
  'Grow Liquid Savings',
  'Tech & Equipment Upgrades',
  'Travel & Vacation Fund',
  'Investments & Retirement'
];

export const OnboardingWizardModal: React.FC<Props> = ({
  visible,
  onClose,
  onComplete
}) => {
  const { user, updateUser, biometricsEnabled, setBiometricsEnabled } = useAuthStore();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Identity & Currency
  const [name, setName] = useState(user?.fullName || 'Cyra eilleen');
  const [currency, setCurrency] = useState(user?.currencyPreference || 'INR');
  const [employmentStatus, setEmploymentStatus] = useState('Employed Full-Time');

  // Step 2: Income Streams
  const [incomeStreams, setIncomeStreams] = useState<Array<{ name: string; amount: number; category: string }>>([
    { name: 'Primary Career / Job', amount: 75000, category: 'Salary' },
    { name: 'Freelance & Consults', amount: 20000, category: 'Freelance' }
  ]);
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamAmount, setNewStreamAmount] = useState('');

  // Step 3: Target Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    'Emergency Cushion (6 Months)',
    'Grow Liquid Savings'
  ]);

  // Step 4: Preferences & Toggles
  const [confidentialMode, setConfidentialMode] = useState(false);
  const [manualTrackingOnly, setManualTrackingOnly] = useState(true);
  const [deliveryTracker, setDeliveryTracker] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleAddStream = () => {
    const amt = parseFloat(newStreamAmount);
    if (!newStreamName.trim() || isNaN(amt) || amt <= 0) return;
    setIncomeStreams(prev => [...prev, { name: newStreamName.trim(), amount: amt, category: 'Side Stream' }]);
    setNewStreamName('');
    setNewStreamAmount('');
  };

  const handleRemoveStream = (index: number) => {
    setIncomeStreams(prev => prev.filter((_, i) => i !== index));
  };

  const totalMonthlyInflow = incomeStreams.reduce((sum, s) => sum + s.amount, 0);

  const handleFinish = async () => {
    const updated = {
      fullName: name.trim() || user?.fullName || 'User',
      currencyPreference: currency
    };

    updateUser(updated);

    // Save profile to Supabase & local storage
    if (user?.id) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          email: user.email,
          full_name: updated.fullName,
          currency_preference: updated.currencyPreference,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Profile Supabase sync error:', e);
      }
    }

    Alert.alert('Personalization Saved', 'Your 4-step financial workspace profile has been configured!');
    if (onComplete) onComplete();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{step}/{totalSteps}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>
                {step === 1 && '1. Welcome & Identity'}
                {step === 2 && '2. Income & Revenue Streams'}
                {step === 3 && '3. Target Financial Goals'}
                {step === 4 && '4. Privacy & Feature Controls'}
              </Text>
              <Text style={styles.headerSubtitle}>Personalize your Let's Track It workspace</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.contentArea}>
            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <View style={styles.stepSection}>
                <Text style={styles.infoBanner}>
                  Tailor the system to your personal workflow. Your data is encrypted and self-owned.
                </Text>

                <Text style={styles.fieldLabel}>FULL NAME / MONIKER</Text>
                <TextInput
                  style={styles.inputField}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Cyra Vance"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.fieldLabel}>CURRENCY PREFERENCE</Text>
                <View style={styles.chipRow}>
                  {['INR', 'USD', 'EUR', 'GBP'].map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, currency === c && styles.chipActive]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>
                        {c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : '£ GBP'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>EMPLOYMENT / OCCUPATION</Text>
                {EMPLOYMENT_STATUSES.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusSelectCard, employmentStatus === status && styles.statusSelectCardActive]}
                    onPress={() => setEmploymentStatus(status)}
                  >
                    <Text style={[styles.statusSelectText, employmentStatus === status && styles.statusSelectTextActive]}>
                      {status}
                    </Text>
                    {employmentStatus === status && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* STEP 2: INCOME STREAMS */}
            {step === 2 && (
              <View style={styles.stepSection}>
                <View style={styles.totalInflowBox}>
                  <Text style={styles.inflowLabel}>TOTAL ESTIMATED MONTHLY INFLOW</Text>
                  <Text style={styles.inflowAmount}>{formatCurrency(totalMonthlyInflow, currency === 'USD' ? '$' : '₹')}</Text>
                  <Text style={styles.inflowSub}>{incomeStreams.length} active income sources configured</Text>
                </View>

                <Text style={styles.fieldLabel}>CONFIGURED INCOME STREAMS</Text>
                {incomeStreams.map((s, idx) => (
                  <View key={idx} style={styles.streamRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.streamName}>{s.name}</Text>
                      <Text style={styles.streamCat}>{s.category} • Monthly Inflow</Text>
                    </View>
                    <Text style={styles.streamAmount}>{formatCurrency(s.amount, currency === 'USD' ? '$' : '₹')}</Text>
                    <TouchableOpacity onPress={() => handleRemoveStream(idx)} style={styles.deleteStreamBtn}>
                      <Text style={styles.deleteStreamText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add New Stream */}
                <Text style={styles.fieldLabel}>+ ADD ADDITIONAL SOURCE</Text>
                <View style={styles.addStreamForm}>
                  <TextInput
                    style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
                    placeholder="Source Name (e.g. Rental, Dividends)"
                    placeholderTextColor={colors.textMuted}
                    value={newStreamName}
                    onChangeText={setNewStreamName}
                  />
                  <TextInput
                    style={[styles.inputField, { width: 90, marginBottom: 0 }]}
                    placeholder="₹ Amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={newStreamAmount}
                    onChangeText={setNewStreamAmount}
                  />
                  <TouchableOpacity style={styles.addStreamBtn} onPress={handleAddStream}>
                    <Text style={styles.addStreamBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: FINANCIAL TARGETS */}
            {step === 3 && (
              <View style={styles.stepSection}>
                <Text style={styles.infoBanner}>
                  Select your primary wealth targets to tailor your monthly ledger dashboards.
                </Text>

                <Text style={styles.fieldLabel}>TARGET OBJECTIVES (MULTI-SELECT)</Text>
                {FINANCIAL_GOAL_PRESETS.map(goal => {
                  const isSelected = selectedGoals.includes(goal);
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[styles.goalPresetCard, isSelected && styles.goalPresetCardActive]}
                      onPress={() => toggleGoal(goal)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <Text style={[styles.goalPresetText, isSelected && styles.goalPresetTextActive]}>
                        {goal}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* STEP 4: PREFERENCES */}
            {step === 4 && (
              <View style={styles.stepSection}>
                <View style={styles.prefToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prefTitle}>🔒 Confidential Privacy Mode</Text>
                    <Text style={styles.prefDesc}>Hide balance amounts by default in public</Text>
                  </View>
                  <Switch
                    value={confidentialMode}
                    onValueChange={setConfidentialMode}
                    trackColor={{ false: colors.border, true: colors.cantaloupe }}
                    thumbColor={colors.textPrimary}
                  />
                </View>

                <View style={styles.prefToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prefTitle}>🛡️ Manual Tracking Only</Text>
                    <Text style={styles.prefDesc}>Zero forced bank debits, 100% self-approved</Text>
                  </View>
                  <Switch
                    value={manualTrackingOnly}
                    onValueChange={setManualTrackingOnly}
                    trackColor={{ false: colors.border, true: colors.cantaloupe }}
                    thumbColor={colors.textPrimary}
                  />
                </View>

                <View style={styles.prefToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prefTitle}>⚡ Biometric Quick Unlock</Text>
                    <Text style={styles.prefDesc}>Unlock with Fingerprint or FaceID</Text>
                  </View>
                  <Switch
                    value={biometricsEnabled}
                    onValueChange={setBiometricsEnabled}
                    trackColor={{ false: colors.border, true: colors.cantaloupe }}
                    thumbColor={colors.textPrimary}
                  />
                </View>

                <View style={styles.prefToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prefTitle}>📦 Active Orders & Deliveries</Text>
                    <Text style={styles.prefDesc}>Display Zepto, Blinkit & Amazon live shipments</Text>
                  </View>
                  <Switch
                    value={deliveryTracker}
                    onValueChange={setDeliveryTracker}
                    trackColor={{ false: colors.border, true: colors.cantaloupe }}
                    thumbColor={colors.textPrimary}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footerRow}>
            {step > 1 ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            )}

            {step < totalSteps ? (
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(step + 1)}>
                <Text style={styles.nextBtnText}>Continue →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
                <Text style={styles.finishBtnText}>Finish & Save Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 7, 10, 0.88)',
    justifyContent: 'center',
    padding: 16
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    maxHeight: '90%'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  stepBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cantaloupe,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#02070A'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontWeight: '700'
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.card,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cantaloupe
  },
  contentArea: {
    maxHeight: 400
  },
  stepSection: {
    paddingVertical: 4
  },
  infoBanner: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6
  },
  inputField: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    backgroundColor: colors.cantaloupe,
    borderColor: colors.cantaloupe
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  chipTextActive: {
    color: '#02070A',
    fontWeight: '800'
  },
  statusSelectCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6
  },
  statusSelectCardActive: {
    borderColor: colors.electric,
    backgroundColor: 'rgba(2, 151, 222, 0.12)'
  },
  statusSelectText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  statusSelectTextActive: {
    color: colors.electric,
    fontWeight: '800'
  },
  checkIcon: {
    color: colors.electric,
    fontWeight: '900'
  },
  totalInflowBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)',
    padding: 16,
    marginBottom: 14
  },
  inflowLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  inflowAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.electric,
    marginVertical: 4
  },
  inflowSub: {
    fontSize: 11,
    color: colors.textSecondary
  },
  streamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 6
  },
  streamName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  streamCat: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  streamAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cantaloupe,
    marginRight: 10
  },
  deleteStreamBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteStreamText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700'
  },
  addStreamForm: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  addStreamBtn: {
    backgroundColor: colors.cantaloupe,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  addStreamBtnText: {
    color: '#02070A',
    fontWeight: '800',
    fontSize: 12
  },
  goalPresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8
  },
  goalPresetCardActive: {
    borderColor: colors.cantaloupe,
    backgroundColor: 'rgba(252, 115, 77, 0.12)'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxActive: {
    backgroundColor: colors.cantaloupe,
    borderColor: colors.cantaloupe
  },
  checkMark: {
    color: '#02070A',
    fontSize: 12,
    fontWeight: '900'
  },
  goalPresetText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  goalPresetTextActive: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  prefToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  prefDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  skipBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600'
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  backBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  nextBtn: {
    backgroundColor: colors.cantaloupe,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#02070A'
  },
  finishBtn: {
    backgroundColor: colors.electric,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#02070A'
  }
});
