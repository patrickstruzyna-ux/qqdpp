import { makeAutoObservable } from 'mobx';
import { Message } from '../types/Message';
import { MessagingContract } from '../contracts/MessagingContract';
import { EncryptionService } from '../services/EncryptionService';

export class MessageStore {
  messages: Message[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private messagingContract: MessagingContract,
    private encryptionService: EncryptionService
  ) {
    makeAutoObservable(this);
  }

  async loadMessages(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      const rawMessages = await this.messagingContract.getMessages();
      this.messages = await Promise.all(
        rawMessages.map(async msg => ({
          id: msg.id,
          sender: msg.sender,
          recipient: msg.recipient,
          content: await this.encryptionService.decryptMessage(
            msg.encryptedContent,
            msg.recipientKey
          ),
          timestamp: new Date(msg.timestamp * 1000)
        }))
      );
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      const encryptedContent = await this.encryptionService.encryptMessage(
        content,
        recipient
      );
      await this.messagingContract.sendMessage(recipient, encryptedContent);
      await this.loadMessages(); // Refresh messages after sending
    } catch (error) {
      this.error = error.message;
      throw error;
    }
  }
}