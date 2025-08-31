import { ethers } from 'ethers';
import { CONTRACT_ABI } from './abi';

export class MessagingContract {
  private contract: ethers.Contract;
  
  constructor(
    private contractAddress: string,
    private provider: ethers.providers.Provider,
    private signer?: ethers.Signer
  ) {
    this.contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABI,
      signer || provider
    );
  }

  async sendMessage(recipient: string, encryptedContent: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required for sending messages');
    return await this.contract.sendMessage(recipient, encryptedContent);
  }

  async getMessages(): Promise<any[]> {
    return await this.contract.getMyMessages();
  }

  async getMessagesBetween(otherAddress: string): Promise<any[]> {
    return await this.contract.getMessagesBetween(otherAddress);
  }
}