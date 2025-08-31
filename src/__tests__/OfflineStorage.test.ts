import { OfflineStorage } from '../services/OfflineStorage';
import { NetworkService } from '../services/NetworkService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../services/NetworkService');

describe('OfflineStorage', () => {
  let storage: OfflineStorage;

  beforeEach(() => {
    storage = new OfflineStorage();
    AsyncStorage.clear();
  });

  it('should store pending messages', async () => {
    const message = {
      id: '1',
      content: 'Test message',
      timestamp: Date.now()
    };

    await storage.storeMessage(message);
    const pendingMessages = await storage.getPendingMessages();
    
    expect(pendingMessages).toHaveLength(1);
    expect(pendingMessages[0]).toEqual(message);
  });

  it('should sync messages when online', async () => {
    NetworkService.isOnline = jest.fn().mockReturnValue(true);
    
    const message = {
      id: '1',
      content: 'Test message',
      timestamp: Date.now()
    };

    await storage.storeMessage(message);
    await storage.syncMessages();

    const pendingMessages = await storage.getPendingMessages();
    expect(pendingMessages).toHaveLength(0);
  });
});