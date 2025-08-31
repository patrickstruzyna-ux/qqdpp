import { EncryptionService } from '../EncryptionService';
import { WalletService } from '../WalletService';
import { MessagingContract } from '../../contracts/MessagingContract';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  
  beforeEach(() => {
    encryptionService = new EncryptionService('test-key');
  });

  it('should encrypt and decrypt messages correctly', async () => {
    const message = 'Test message';
    const recipientKey = 'public-key';
    
    const encrypted = await encryptionService.encryptMessage(message, recipientKey);
    const decrypted = await encryptionService.decryptMessage(encrypted, 'private-key');
    
    expect(decrypted).toBe(message);
  });
});

describe('WalletService', () => {
  let walletService: WalletService;
  
  beforeEach(() => {
    walletService = new WalletService();
  });

  it('should connect to wallet', async () => {
    const address = await walletService.connect();
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

describe('MessagingContract', () => {
  let contract: MessagingContract;
  
  beforeEach(() => {
    // Mock provider and signer
    const provider = jest.fn();
    const signer = jest.fn();
    contract = new MessagingContract('contract-address', provider, signer);
  });

  it('should send messages', async () => {
    const result = await contract.sendMessage('recipient', 'encrypted-content');
    expect(result).toBeDefined();
  });
});