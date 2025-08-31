import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/Message';
import { NetworkService } from './NetworkService';

export class OfflineStorage {
  private static PENDING_MESSAGES_KEY = 'pendingMessages';
  private static LAST_SYNC_KEY = 'lastSync';

  async storeMessage(message: Message): Promise<void> {
    try {
      const pendingMessages = await this.getPendingMessages();
      pendingMessages.push(message);
      await AsyncStorage.setItem(
        OfflineStorage.PENDING_MESSAGES_KEY,
        JSON.stringify(pendingMessages)
      );
    } catch (error) {
      console.error('Error storing offline message:', error);
      throw error;
    }
  }

  async syncMessages(): Promise<void> {
    if (!NetworkService.isOnline()) return;

    const pendingMessages = await this.getPendingMessages();
    for (const message of pendingMessages) {
      try {
        await this.sendMessageToContract(message);
        await this.removePendingMessage(message.id);
      } catch (error) {
        console.error('Error syncing message:', error);
      }
    }
    
    await AsyncStorage.setItem(
      OfflineStorage.LAST_SYNC_KEY,
      Date.now().toString()
    );
  }

  async getPendingMessages(): Promise<Message[]> {
    try {
      const messages = await AsyncStorage.getItem(OfflineStorage.PENDING_MESSAGES_KEY);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  private async removePendingMessage(messageId: string): Promise<void> {
    const messages = await this.getPendingMessages();
    const filtered = messages.filter(m => m.id !== messageId);
    await AsyncStorage.setItem(
      OfflineStorage.PENDING_MESSAGES_KEY,
      JSON.stringify(filtered)
    );
  }

  private async sendMessageToContract(message: Message): Promise<void> {
    // Implementierung der Contract-Interaktion
  }
}
