import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Share,
  ActivityIndicator
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import { MobileAuthService } from '../services/auth.service';
import { MobileDataSyncService } from '../services/dataSync.service';
import { OnboardingWizardModal } from '../components/OnboardingWizardModal';
import { ExportModal } from '../components/ExportModal';
import { colors } from '../theme/colors';

type SettingsTab = 'profile' | 'budgets' | 'appearance' | 'accounts' | 'sync-data';

interface StudioAvatar {
  id: string;
  name: string;
  role: string;
  emoji: string;
}

const STUDIO_AVATARS: StudioAvatar[] = [
  { id: '1', name: 'Alex Vance', role: 'Finance Manager', emoji: '👨‍💼' },
  { id: '2', name: 'Elena R.', role: 'Investment Analyst', emoji: '👩‍💼' },
  { id: '3', name: 'Kaelen', role: 'Tech Entrepreneur', emoji: '🧑‍💻' },
  { id: '4', name: 'Marcus', role: 'Managing Partner', emoji: '🧔' },
  { id: '5', name: 'Sophia', role: 'Product Strategist', emoji: '👩‍🎨' }
];

const BUDGET_CATEGORIES = [
  { key: 'FOOD', label: 'FOOD', defaultLimit: 'No Limit' },
  { key: 'GROCERY', label: 'GROCERY', defaultLimit: 'No Limit' },
  { key: 'SHOPPING', label: 'SHOPPING', defaultLimit: 'No Limit' },
  { key: 'ELECTRONICS', label: 'ELECTRONICS', defaultLimit: 'No Limit' },
  { key: 'TRAVEL', label: 'TRAVEL', defaultLimit: 'No Limit' },
  { key: 'BILLS', label: 'BILLS', defaultLimit: 'No Limit' },
  { key: 'ENTERTAINMENT', label: 'ENTERTAINMENT', defaultLimit: 'No Limit' }
];

interface SettingsScreenProps {
  onNavigateToTab?: (tab: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigateToTab }) => {
  const { user, biometricsEnabled, setBiometricsEnabled, logout, updateUser } = useAuthStore();
  const { accounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [displayName, setDisplayName] = useState(user?.fullName || 'Cyra eilleen');
  const [email, setEmail] = useState(user?.email || 'link your email');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('2');
  const [currency, setCurrency] = useState(user?.currencyPreference || 'INR');
  const [showWizard, setShowWizard] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Just now');
  const [budgetLimits, setBudgetLimits] = useState<Record<string, string>>({
    FOOD: '',
    GROCERY: '',
    SHOPPING: '',
    ELECTRONICS: '',
    TRAVEL: '',
    BILLS: '',
    ENTERTAINMENT: ''
  });

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    updateUser({ currencyPreference: newCurrency });
    Alert.alert('Currency Updated', `Display currency changed to ${newCurrency}`);
  };

  const handleSaveProfile = () => {
    updateUser({ fullName: displayName, email });
    Alert.alert('Profile Saved', 'Your changes have been saved successfully.');
  };

  const handleExportCsv = async () => {
    if (transactions.length === 0) {
      Alert.alert('Export', 'No transactions available to export.');
      return;
    }

    const header = 'ID,Date,Amount,Type,Category,Platform,Purpose,PaymentMode,ShoppingApp,DeliveryStatus\n';
    const rows = transactions.map(t =>
      `"${t.id}","${t.date}",${t.amount},"${t.type}","${t.category}","${t.platform}","${t.purpose.replace(/"/g, '""')}","${t.mode}","${t.shoppingDetails?.appName || ''}","${t.shoppingDetails?.status || ''}"`
    ).join('\n');

    await Share.share({
      message: header + rows,
      title: "Let's Track It — Transactions CSV Export"
    });
  };

  const handleSyncNow = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      await MobileDataSyncService.syncAll(user.id);
      setLastSyncText(new Date().toLocaleTimeString());
      Alert.alert('Sync Successful', 'Your transactions, goals, and accounts are in full sync with the cloud.');
    } catch (e: any) {
      Alert.alert('Sync Error', e.message || 'Could not complete cloud sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await MobileAuthService.logout();
    logout();
  };

  return (
    <View style={styles.container} testID="settings-screen">
      {/* Top Header */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Settings & Profile</Text>
      </View>

      {/* Tab Navigation Pill Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {[
          { key: 'profile', label: '👤 Profile' },
          { key: 'budgets', label: '🎯 Budgets' },
          { key: 'appearance', label: '🖥️ Appearance' },
          { key: 'accounts', label: '💳 Accounts' },
          { key: 'sync-data', label: '🔄 Sync & Data' }
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabButton, activeTab === t.key && styles.activeTabButton]}
            onPress={() => setActiveTab(t.key as SettingsTab)}
            testID={`tab-${t.key}`}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.activeTabText]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <View style={styles.panelCard}>
            {/* Active Profile Photo Box */}
            <View style={styles.activePhotoCard}>
              <View style={styles.activeAvatarWrapper}>
                <View style={styles.avatarBorderCircle}>
                  <Text style={styles.activeAvatarEmoji}>👩‍💼</Text>
                </View>
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </View>

              <View style={styles.profileActionGroup}>
                <Text style={styles.activePhotoLabel}>ACTIVE PROFILE</Text>
                <Text style={styles.activeProfileName}>{displayName}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>
                  {user?.email || 'Logged in user'}
                </Text>
                <View style={styles.photoButtonRow}>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => Alert.alert('Upload Photo', 'Select an image from camera or library')}
                  >
                    <Text style={styles.uploadBtnText}>📤 Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: 'rgba(248, 81, 73, 0.2)', borderWidth: 1, borderColor: 'rgba(248, 81, 73, 0.4)' }]}
                    onPress={handleLogout}
                  >
                    <Text style={[styles.uploadBtnText, { color: colors.danger }]}>🔄 Switch Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 4-Step Personalization Banner (Feature from Web) */}
            <TouchableOpacity
              style={styles.personalizationBanner}
              onPress={() => setShowWizard(true)}
              testID="open-personalization-wizard"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.personalizationTitle}>✨ Personalize Workspace (4-Step Setup)</Text>
                <Text style={styles.personalizationSub}>
                  Customize multiple income streams, financial targets & privacy preferences.
                </Text>
              </View>
              <Text style={styles.personalizationChevron}>→</Text>
            </TouchableOpacity>

            {/* Choose Studio Avatar */}
            <View style={styles.subHeaderRow}>
              <Text style={styles.sectionLabel}>CHOOSE STUDIO AVATAR</Text>
              <Text style={styles.subTextMuted}>5 High-Definition Styles</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarCarousel}>
              {STUDIO_AVATARS.map(avatar => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarPresetCard,
                    selectedAvatarId === avatar.id && styles.activePresetCard
                  ]}
                  onPress={() => setSelectedAvatarId(avatar.id)}
                >
                  <Text style={styles.presetEmoji}>{avatar.emoji}</Text>
                  <Text style={styles.presetName} numberOfLines={1}>{avatar.name}</Text>
                  <Text style={styles.presetRole} numberOfLines={1}>{avatar.role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Profile Inputs */}
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.inputField}
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor={colors.textMuted}
              testID="profile-display-name"
            />

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.inputField}
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={colors.textMuted}
              testID="profile-email-input"
            />

            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            <TextInput
              style={styles.inputField}
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={colors.textMuted}
              testID="profile-phone-input"
            />

            {/* Save Button */}
            <TouchableOpacity
              style={styles.cantaloupeBtn}
              onPress={handleSaveProfile}
              testID="save-profile-btn"
            >
              <Text style={styles.cantaloupeBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 2: BUDGETS */}
        {activeTab === 'budgets' && (
          <View style={styles.panelCard}>
            <View style={styles.budgetsHeader}>
              <View>
                <Text style={styles.panelTitle}>Monthly Budgets</Text>
                <Text style={styles.budgetsSubtitle}>For account: <Text style={styles.accentText}>Personal</Text></Text>
              </View>
              <View style={styles.targetIconCircle}>
                <Text style={styles.targetIconText}>🎯</Text>
              </View>
            </View>

            <Text style={styles.instructionsText}>
              Set monthly spending limits for each category.
            </Text>

            <View style={styles.budgetList}>
              {BUDGET_CATEGORIES.map(cat => (
                <View key={cat.key} style={styles.budgetRow}>
                  <Text style={styles.categoryName}>{cat.label}</Text>
                  <View style={styles.budgetInputGroup}>
                    <Text style={styles.budgetCurrencySymbol}>₹</Text>
                    <TextInput
                      style={styles.budgetInput}
                      placeholder={cat.defaultLimit}
                      placeholderTextColor={colors.textMuted}
                      value={budgetLimits[cat.key]}
                      onChangeText={val => setBudgetLimits(prev => ({ ...prev, [cat.key]: val }))}
                      keyboardType="numeric"
                      testID={`budget-input-${cat.key}`}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 3: APPEARANCE */}
        {activeTab === 'appearance' && (
          <View style={styles.panelCard}>
            <View style={styles.appearanceHeader}>
              <View style={styles.appIconBox}>
                <Text style={styles.appIconEmoji}>🖥️</Text>
              </View>
              <Text style={styles.panelTitle}>App Appearance</Text>
            </View>

            <Text style={styles.fieldLabel}>THEME PREFERENCE</Text>
            <View style={styles.themeSelectorRow}>
              {/* Dark Mode Card */}
              <TouchableOpacity
                style={[
                  styles.themeCard,
                  themeMode === 'dark' && styles.activeThemeCard
                ]}
                onPress={() => setThemeMode('dark')}
                testID="theme-dark-btn"
              >
                <Text style={styles.themeIcon}>🌙</Text>
                <Text style={[styles.themeLabel, themeMode === 'dark' && styles.activeThemeLabel]}>
                  Midnight Dark (Web)
                </Text>
              </TouchableOpacity>

              {/* Light Mode Card */}
              <TouchableOpacity
                style={[
                  styles.themeCard,
                  themeMode === 'light' && styles.activeThemeCard
                ]}
                onPress={() => setThemeMode('light')}
                testID="theme-light-btn"
              >
                <Text style={styles.themeIcon}>☀️</Text>
                <Text style={[styles.themeLabel, themeMode === 'light' && styles.activeThemeLabel]}>
                  Clean Light
                </Text>
              </TouchableOpacity>
            </View>

            {/* Currency Preference */}
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>CURRENCY PREFERENCE</Text>
            <View style={styles.currencyRow}>
              {['INR', 'USD', 'EUR', 'GBP'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyChip, currency === c && styles.activeCurrencyChip]}
                  onPress={() => handleCurrencyChange(c)}
                  testID={`currency-select-${c}`}
                >
                  <Text style={[styles.currencyText, currency === c && styles.activeCurrencyText]}>
                    {c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : '£ GBP'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* TAB 4: ACCOUNTS */}
        {activeTab === 'accounts' && (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Active Accounts & Family Hub</Text>
            <View style={styles.accountList}>
              {accounts.map(acc => (
                <View key={acc.id} style={styles.accountRow}>
                  <View style={[styles.colorIndicator, { backgroundColor: acc.color || colors.cantaloupe }]} />
                  <View style={styles.accInfo}>
                    <Text style={styles.accName}>{acc.name}</Text>
                    <Text style={styles.accRole}>
                      {acc.type} • {acc.members.length} {acc.members.length === 1 ? 'member' : 'members'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 5: SYNC & DATA */}
        {activeTab === 'sync-data' && (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Security & Privacy</Text>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Biometric Quick Unlock</Text>
                <Text style={styles.settingDesc}>Use FaceID / Fingerprint to authenticate</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ false: colors.border, true: colors.cantaloupe }}
                thumbColor={colors.textPrimary}
                testID="biometric-toggle"
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>CLOUD DATA SYNCHRONIZATION</Text>
            <View style={styles.syncStatusCard}>
              <View>
                <Text style={styles.syncStatusTitle}>Live Cloud Database</Text>
                <Text style={styles.syncStatusSub}>Supabase Realtime • Last sync: {lastSyncText}</Text>
              </View>
              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={handleSyncNow}
                disabled={isSyncing}
                testID="sync-now-button"
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#02070A" />
                ) : (
                  <Text style={styles.syncNowText}>🔄 Sync Now</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>DATA MANAGEMENT & BACKUP</Text>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: 'rgba(2, 151, 222, 0.12)', borderColor: colors.electric }]}
              onPress={() => setShowExportModal(true)}
              testID="open-export-center-btn"
            >
              <Text style={[styles.exportBtnText, { color: colors.electric }]}>
                📥 Open Export Center (CSV, Excel, PDF, JSON)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportCsv}
              testID="export-csv-btn"
            >
              <Text style={styles.exportBtnText}>📄 Quick Export to CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              testID="logout-button"
            >
              <Text style={styles.logoutBtnText}>Log Out & Switch Accounts</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Export & Backup Data Modal */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* 4-Step Personalization Profile Setup Modal */}
      <OnboardingWizardModal
        visible={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  tabBar: {
    paddingHorizontal: 16,
    maxHeight: 48,
    marginVertical: 10
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  activeTabButton: {
    backgroundColor: colors.cantaloupe,
    borderColor: colors.cantaloupe
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  activeTabText: {
    color: '#02070A',
    fontWeight: '800'
  },
  contentScroll: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  panelCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    marginBottom: 20
  },
  activePhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  activeAvatarWrapper: {
    position: 'relative'
  },
  avatarBorderCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: colors.cantaloupe,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  activeAvatarEmoji: {
    fontSize: 32
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.cantaloupe,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraIcon: {
    fontSize: 10
  },
  profileActionGroup: {
    flex: 1
  },
  activePhotoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  activeProfileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: 4
  },
  photoButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2
  },
  uploadBtn: {
    backgroundColor: colors.cantaloupe,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  uploadBtnText: {
    color: '#02070A',
    fontSize: 11,
    fontWeight: '800'
  },
  resetPresetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  resetPresetText: {
    color: colors.textSecondary,
    fontSize: 11,
    textDecorationLine: 'underline'
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5
  },
  subTextMuted: {
    fontSize: 10,
    color: colors.textMuted
  },
  avatarCarousel: {
    marginBottom: 16
  },
  avatarPresetCard: {
    width: 100,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  activePresetCard: {
    borderColor: colors.cantaloupe,
    backgroundColor: 'rgba(252, 115, 77, 0.15)'
  },
  presetEmoji: {
    fontSize: 26,
    marginBottom: 4
  },
  presetName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary
  },
  presetRole: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  inputField: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary
  },
  cantaloupeBtn: {
    backgroundColor: colors.cantaloupe,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18
  },
  cantaloupeBtnText: {
    color: '#02070A',
    fontSize: 13,
    fontWeight: '800'
  },
  budgetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  budgetsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  accentText: {
    color: colors.cantaloupe,
    fontWeight: '700'
  },
  targetIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  targetIconText: {
    fontSize: 16
  },
  instructionsText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16
  },
  budgetList: {
    gap: 8
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary
  },
  budgetInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  budgetCurrencySymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cantaloupe
  },
  budgetInput: {
    fontSize: 12,
    color: colors.textPrimary,
    minWidth: 70,
    textAlign: 'right'
  },
  appearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16
  },
  appIconBox: {
    backgroundColor: colors.cantaloupe,
    padding: 6,
    borderRadius: 8
  },
  appIconEmoji: {
    fontSize: 16
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 12
  },
  themeCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border
  },
  activeThemeCard: {
    borderColor: colors.cantaloupe,
    backgroundColor: 'rgba(252, 115, 77, 0.12)'
  },
  themeIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  activeThemeLabel: {
    color: colors.cantaloupe
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  activeCurrencyChip: {
    backgroundColor: colors.cantaloupe,
    borderColor: colors.cantaloupe
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  activeCurrencyText: {
    color: '#02070A'
  },
  accountList: {
    marginTop: 12,
    gap: 8
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  accInfo: {
    flex: 1
  },
  accName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary
  },
  accRole: {
    fontSize: 11,
    color: colors.textSecondary
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary
  },
  settingDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  exportBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cantaloupe
  },
  logoutBtn: {
    paddingVertical: 12,
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    borderRadius: 12,
    alignItems: 'center'
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700'
  },
  personalizationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252, 115, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(252, 115, 77, 0.35)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  personalizationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cantaloupe,
    marginBottom: 2
  },
  personalizationSub: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14
  },
  personalizationChevron: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cantaloupe,
    marginLeft: 8
  },
  syncStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14
  },
  syncStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  syncStatusSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  syncNowBtn: {
    backgroundColor: colors.electric,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },
  syncNowText: {
    color: '#02070A',
    fontWeight: '800',
    fontSize: 11
  }
});
