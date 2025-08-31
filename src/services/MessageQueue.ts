import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedMessage {
  id: string;
  recipient: string;
  content: string;
  timestamp: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing: boolean = false;

  async addToQueue(message: QueuedMessage) {
    this.queue.push(message);
    await this.saveQueue();
    this.processQueue();
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem('messageQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const message = this.queue[0];
      try {
        await this.sendMessage(message);
        this.queue.shift();
        await this.saveQueue();
      } catch (error) {
        console.error('Error sending message:', error);
        break;
      }
    }

    this.isProcessing = false;
  }

  private async sendMessage(message: QueuedMessage) {
    // Implementiere hier die tatsächliche Nachrichtenversendung
  }
}

export default new MessageQueue();