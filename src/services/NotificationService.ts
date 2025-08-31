import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { MessagingContract } from '../contracts/MessagingContract';
import { configManager } from '../config/ConfigManager';

class NotificationService {
  private subscription: PushSubscription | null = null;
  private messagingContract: MessagingContract;

  constructor() {
    this.configure();
    this.messagingContract = new MessagingContract(
      configManager.getConfig().contracts.messaging
    );
  }

  configure = () => {
    PushNotification.configure({
      onRegister: (token) => {
        console.log("TOKEN:", token);
        this.registerDeviceToken(token);
      },

      onNotification: (notification) => {
        console.log("NOTIFICATION:", notification);
        this.handleNotification(notification);
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

    // Setup Web Push für Browser-Umgebung
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.initializeWebPush();
    }
  }

  private async initializeWebPush() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: configManager.getConfig().push.publicKey
      });

      this.setupMessageListener();
    } catch (error) {
      console.error('Failed to initialize web push:', error);
    }
  }

  private async registerDeviceToken(token: { os: string; token: string }) {
    try {
      await fetch(configManager.getConfig().push.registerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  private setupMessageListener() {
    this.messagingContract.contract.on('MessageReceived', async (from, to, id) => {
      if (to.toLowerCase() === window.ethereum.selectedAddress.toLowerCase()) {
        this.showNotification('New Message', `New message from ${from}`);
      }
    });
  }

  localNotification = (title: string, message: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Browser Notification
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
    } else {
      // React Native Notification
      PushNotification.localNotification({
        title: title,
        message: message,
        playSound: true,
        soundName: "default",
      });
    }
  }

  private handleNotification(notification: any) {
    // Handle different notification types
    if (notification.foreground) {
      // App is in foreground
      this.localNotification(
        notification.title || 'New Message',
        notification.message || notification.data.message
      );
    }

    // Handle notification click
    if (notification.userInteraction) {
      // Navigate to appropriate screen based on notification type
      // Implementation depends on your navigation setup
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return true; // React Native permissions handled in configure()
  }

  // Cleanup method
  cleanup() {
    if (typeof window !== 'undefined' && this.subscription) {
      // Cleanup web push subscription if needed
    }
    // Cleanup any other resources
  }
}

export default new NotificationService();

