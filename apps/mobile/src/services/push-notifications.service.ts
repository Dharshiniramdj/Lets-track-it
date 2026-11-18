export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    type?: 'DELIVERY_UPDATE' | 'BUDGET_ALERT' | 'PACING_REMINDER';
    transactionId?: string;
    goalId?: string;
  };
}

export class PushNotificationsService {
  private static listeners: Array<(payload: PushNotificationPayload) => void> = [];

  public static async requestPermission(): Promise<boolean> {
    // In React Native production, requests APNs / FCM permissions
    return true;
  }

  public static async getDeviceToken(): Promise<string> {
    return `fcm-token-${Math.random().toString(36).substring(2)}`;
  }

  public static onNotificationReceived(callback: (payload: PushNotificationPayload) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public static simulateIncomingNotification(payload: PushNotificationPayload): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}
