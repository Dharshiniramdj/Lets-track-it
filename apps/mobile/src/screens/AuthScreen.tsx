import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useAccountStore } from '../store/accountStore';
import { BiometricsService } from '../services/biometrics.service';
import { MobileAuthService } from '../services/auth.service';
import { MobileDataSyncService } from '../services/dataSync.service';
import { OnboardingWizardModal } from '../components/OnboardingWizardModal';
import { colors } from '../theme/colors';

type AuthTab = 'ABOUT' | 'LOGIN' | 'SIGNUP';

export const AuthScreen: React.FC = () => {
  const { setAuth, biometricsEnabled } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AuthTab>('ABOUT');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('INR');

  const [loading, setLoading] = useState(false);
  const [showPersonalizationWizard, setShowPersonalizationWizard] = useState(false);

  // Password validation heuristics for UI
  const hasMinLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email/username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await MobileAuthService.login(email, password);
      setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      const accounts = await MobileAuthService.loadAccounts(res.user.id);
      useAccountStore.getState().setAccounts(accounts);
      // Immediately sync all transactions & goals from Supabase
      await MobileDataSyncService.syncAll(res.user.id);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !email || !isPasswordValid) return;
    setLoading(true);
    try {
      const res = await MobileAuthService.signup({
        fullName,
        email,
        password,
        currencyPreference: currency
      });

      setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      const accounts = await MobileAuthService.loadAccounts(res.user.id);
      useAccountStore.getState().setAccounts(accounts);
      await MobileDataSyncService.syncAll(res.user.id);

      setShowPersonalizationWizard(true);
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Could not register');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    const { success } = await BiometricsService.promptBiometrics('Unlock Let\'s Track It');
    if (success) {
      const restored = await MobileAuthService.restoreSession();
      if (restored) {
        setAuth(restored.user, restored.tokens.accessToken, restored.tokens.refreshToken);
        const accounts = await MobileAuthService.loadAccounts(restored.user.id);
        useAccountStore.getState().setAccounts(accounts);
        await MobileDataSyncService.syncAll(restored.user.id);
      } else {
        Alert.alert('Notice', 'Please log in with password first to enable biometric quick-unlock.');
      }
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'usr-demo',
      email: 'alex@letstrackit.app',
      fullName: 'Alex Vance',
      currencyPreference: 'INR',
      hasBiometrics: false
    };
    const demoAccounts = [
      {
        id: 'acc-1',
        name: 'Personal Vault',
        type: 'PERSONAL' as const,
        color: '#FC734D',
        avatarSeed: 'Alex',
        ownerId: 'usr-demo',
        members: [{ userId: 'usr-demo', role: 'OWNER' as const }]
      }
    ];
    setAuth(demoUser, 'demo-token', 'demo-refresh');
    useAccountStore.getState().setAccounts(demoAccounts);
    useAccountStore.getState().setActiveAccount('acc-1');
  };

  return (
    <View style={styles.container} testID="auth-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeIcon}>💳</Text>
        </View>
        <Text style={styles.logoTitle}>Let's Track It</Text>
        <Text style={styles.logoSubtitle}>The Unified Purchases, Payments & Deliveries Hub</Text>
      </View>

      {/* 3-Tab Pill Switcher (About / Sign In / Create Account) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ABOUT' && styles.activeTab]}
          onPress={() => setActiveTab('ABOUT')}
          testID="tab-about"
        >
          <Text style={[styles.tabText, activeTab === 'ABOUT' && styles.activeTabText]}>
            📖 About
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'LOGIN' && styles.activeTab]}
          onPress={() => setActiveTab('LOGIN')}
          testID="tab-login"
        >
          <Text style={[styles.tabText, activeTab === 'LOGIN' && styles.activeTabText]}>
            🔐 Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'SIGNUP' && styles.activeTab]}
          onPress={() => setActiveTab('SIGNUP')}
          testID="tab-signup"
        >
          <Text style={[styles.tabText, activeTab === 'SIGNUP' && styles.activeTabText]}>
            ✨ Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* TAB 1: ABOUT PAGE (Feature from Web WelcomeLanding) */}
        {activeTab === 'ABOUT' && (
          <View style={styles.aboutContainer}>
            <View style={styles.heroBox}>
              <View style={styles.proTag}>
                <Text style={styles.proTagText}>CONFIDENTIAL & PRO</Text>
              </View>
              <Text style={styles.heroHeadline}>
                Master Your Money. <Text style={{ color: colors.cantaloupe }}>Own Every Cent.</Text>
              </Text>
              <Text style={styles.heroSubtext}>
                The privacy-focused, zero-forced-bank-debits operating system. Log spending, store receipts, track Swiggy & Zepto deliveries, and enforce budget discipline with complete data sovereignty.
              </Text>
            </View>

            {/* Feature Highlights Grid */}
            <View style={styles.featureGrid}>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🛡️</Text>
                <Text style={styles.featureTitle}>100% Data Sovereignty</Text>
                <Text style={styles.featureDesc}>Zero forced bank linking. All records are privately encrypted.</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🧾</Text>
                <Text style={styles.featureTitle}>Store Invoices & Bills</Text>
                <Text style={styles.featureDesc}>Attach photos or digital receipts directly to your ledger records.</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📦</Text>
                <Text style={styles.featureTitle}>Delivery Tracking</Text>
                <Text style={styles.featureDesc}>Track Zepto, Blinkit & Amazon orders from placement to doorstep.</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>⚡</Text>
                <Text style={styles.featureTitle}>Zero-Lag Offline First</Text>
                <Text style={styles.featureDesc}>Instant UI responses. Background cloud sync when connected.</Text>
              </View>
            </View>

            {/* Mock Confidential Preview */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTag}>CONFIDENTIAL LEDGER PREVIEW</Text>
                <Text style={styles.previewStatus}>● Live</Text>
              </View>
              <Text style={styles.previewBalanceLabel}>NET LIQUID BALANCE</Text>
              <Text style={styles.previewBalanceVal}>₹1,84,350</Text>
              <Text style={styles.previewSurplusText}>↑ +18.4% monthly surplus • 3 Inflow Streams</Text>
            </View>

            {/* Call to Action Buttons */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => setActiveTab('SIGNUP')}
            >
              <Text style={styles.submitBtnText}>Get Started Free →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setActiveTab('LOGIN')}
            >
              <Text style={styles.secondaryBtnText}>Sign In to Existing Vault</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemoLogin}
              testID="demo-login-button"
            >
              <Text style={styles.demoBtnText}>⚡ Explore Workspace (Offline Demo)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 2: SIGN IN */}
        {activeTab === 'LOGIN' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email or Username</Text>
              <TextInput
                style={styles.input}
                placeholder="you@domain.com or dharshini269"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="default"
                value={email}
                onChangeText={setEmail}
                testID="email-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                testID="password-input"
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLogin}
              disabled={loading}
              testID="login-submit-button"
            >
              {loading ? (
                <ActivityIndicator color="#02070A" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In Securely</Text>
              )}
            </TouchableOpacity>

            {biometricsEnabled && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={handleBiometricUnlock}
                testID="biometric-unlock-button"
              >
                <Text style={styles.biometricBtnText}>🔐 Unlock with FaceID / Biometrics</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemoLogin}
              testID="demo-login-button"
            >
              <Text style={styles.demoBtnText}>⚡ Explore Workspace (Offline Demo)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: CREATE ACCOUNT */}
        {activeTab === 'SIGNUP' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cyra Vance"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                testID="fullname-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@domain.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                testID="email-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min 10 chars, uppercase, symbol..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                testID="password-input"
              />
            </View>

            {/* Password Strength Checklist */}
            <View style={styles.checklist}>
              <Text style={[styles.checkItem, hasMinLength && styles.checkPass]}>
                • 10+ characters
              </Text>
              <Text style={[styles.checkItem, hasUpper && hasLower && styles.checkPass]}>
                • Upper & lowercase letters
              </Text>
              <Text style={[styles.checkItem, hasNumber && styles.checkPass]}>
                • Numbers included
              </Text>
              <Text style={[styles.checkItem, hasSymbol && styles.checkPass]}>
                • Special character symbol
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSignUp}
              disabled={loading}
              testID="signup-submit-button"
            >
              {loading ? (
                <ActivityIndicator color="#02070A" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account (No OTP)</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemoLogin}
              testID="demo-login-button"
            >
              <Text style={styles.demoBtnText}>⚡ Explore Workspace (Offline Demo)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 4-Step Personalization Wizard Modal */}
      <OnboardingWizardModal
        visible={showPersonalizationWizard}
        onClose={() => setShowPersonalizationWizard(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight,
    paddingTop: 48
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 16
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cantaloupe,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.cantaloupe,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8
  },
  logoBadgeIcon: {
    fontSize: 24
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  logoSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  activeTab: {
    backgroundColor: colors.cantaloupe
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  activeTabText: {
    color: '#02070A',
    fontWeight: '800'
  },
  aboutContainer: {
    gap: 12
  },
  heroBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  proTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 151, 222, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(2, 151, 222, 0.3)',
    marginBottom: 10
  },
  proTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.electric,
    letterSpacing: 0.5
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: 8
  },
  heroSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  featureCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  featureIcon: {
    fontSize: 20,
    marginBottom: 6
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4
  },
  featureDesc: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)'
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.electric
  },
  previewStatus: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700'
  },
  previewBalanceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700'
  },
  previewBalanceVal: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    marginVertical: 4
  },
  previewSurplusText: {
    fontSize: 11,
    color: colors.electric,
    fontWeight: '600'
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  inputGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary
  },
  checklist: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 4
  },
  checkItem: {
    fontSize: 11,
    color: colors.textMuted
  },
  checkPass: {
    color: colors.success,
    fontWeight: '700'
  },
  submitBtn: {
    backgroundColor: colors.cantaloupe,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: colors.cantaloupe,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnText: {
    color: '#02070A',
    fontSize: 14,
    fontWeight: '800'
  },
  biometricBtn: {
    marginTop: 12,
    paddingVertical: 13,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  biometricBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  demoBtn: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(2, 151, 222, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(2, 151, 222, 0.3)',
    alignItems: 'center'
  },
  demoBtnText: {
    color: colors.electric,
    fontSize: 12,
    fontWeight: '700'
  }
});
