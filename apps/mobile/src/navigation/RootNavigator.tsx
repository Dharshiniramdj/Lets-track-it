import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { AuthScreen } from '../screens/AuthScreen';
import { TabNavigator } from './TabNavigator';
import { useAccountStore } from '../store/accountStore';
import { MobileAuthService } from '../services/auth.service';
import { MobileDataSyncService } from '../services/dataSync.service';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, setAuth } = useAuthStore();
  const { setAccounts } = useAccountStore();

  useEffect(() => {
    // Attempt automatic session restoration on app boot
    const restoreSession = async () => {
      try {
        const restored = await MobileAuthService.restoreSession();
        if (restored) {
          setAuth(restored.user, restored.tokens.accessToken, restored.tokens.refreshToken);
          const accounts = await MobileAuthService.loadAccounts(restored.user.id);
          setAccounts(accounts);
          // Sync all transactions & goals from Supabase
          MobileDataSyncService.syncAll(restored.user.id);
        }
      } catch (e) {
        console.warn('Session restore error:', e);
      }
    };

    restoreSession();
  }, []);

  return (
    <View style={styles.container}>
      {isAuthenticated ? <TabNavigator /> : <AuthScreen />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
