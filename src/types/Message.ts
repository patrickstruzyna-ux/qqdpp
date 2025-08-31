export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export interface EncryptedMessage {
  id: string;
  sender: string;
  recipient: string;
  encryptedContent: string;
  timestamp: number;
  recipientKey: string;
}