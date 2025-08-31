import React, { createContext, useContext, useState, useEffect } from 'react';
import StorageService from '../services/Storage';
import MessageQueue from '../services/MessageQueue';
import EncryptionService from '../services/Encryption';
import { useWallet } from './WalletContext';
import { deferredOperation } from '../utils/Performance';

interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

interface MessageContextType {
  messages: Message[];
  sendMessage: (recipient: string, content: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { account } = useWallet();
  const [lastLoadedTimestamp, setLastLoadedTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    if (account) {
      refreshMessages();
    }
  }, [account]);

  const refreshMessages = async () => {
    if (!account) return;
    
    try {
      const latestMessages = await StorageService.getMessages(account);
      setMessages(latestMessages);
      setLastLoadedTimestamp(Date.now());
      
      // Verzögerte Verarbeitung von nicht-kritischen Updates
      deferredOperation(() => {
        // Aktualisiere Nachrichten-Status, etc.
      });
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    }
  };

  const loadMoreMessages = async () => {
    if (!account) return;
    
    try {
      const olderMessages = await StorageService.getMessages(
        account,
        50,
        lastLoadedTimestamp
      );
      
      setMessages(prev => [...prev, ...olderMessages]);
      if (olderMessages.length > 0) {
        setLastLoadedTimestamp(olderMessages[olderMessages.length - 1].timestamp);
      }
    } catch (error) {
      console.error('Fehler beim Laden weiterer Nachrichten:', error);
    }
  };

  const sendMessage = async (recipient: string, content: string) => {
    if (!account) throw new Error('Wallet nicht verbunden');

    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: account,
      recipient,
      content: await EncryptionService.encryptMessage(content, recipient),
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      // Speichere Nachricht lokal
      await StorageService.saveMessage(message);
      setMessages(prev => [message, ...prev]);

      // Füge zur Warteschlange hinzu für Offline-Support
      await MessageQueue.addToQueue(message);
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      message.status = 'failed';
      setMessages(prev => prev.map(m => 
        m.id === message.id ? message : m
      ));
    }
  };

  return (
    <MessageContext.Provider 
      value={{ 
        messages, 
        sendMessage, 
        loadMoreMessages, 
        refreshMessages 
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};