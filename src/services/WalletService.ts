import WalletConnect from '@walletconnect/client';
import { ethers } from 'ethers';
import { configManager } from '../config/ConfigManager';

export class WalletService {
  private connector: WalletConnect | null = null;
  private provider: ethers.providers.Provider | null = null;

  async initialize(): Promise<void> {
    this.connector = new WalletConnect({
      bridge: configManager.getConfig().network.endpoints.websocket,
      qrcodeModal: true
    });

    if (this.connector.connected) {
      this.provider = new ethers.providers.Web3Provider(this.connector as any);
    }

    this.setupEventListeners();
  }

  async connect(): Promise<string> {
    if (!this.connector) throw new Error('WalletConnect not initialized');
    
    if (!this.connector.connected) {
      await this.connector.createSession();
    }
    
    return this.connector.accounts[0];
  }

  async disconnect(): Promise<void> {
    if (this.connector?.connected) {
      await this.connector.killSession();
    }
  }

  private setupEventListeners(): void {
    if (!this.connector) return;

    this.connector.on('connect', (error, payload) => {
      if (error) throw error;
      this.provider = new ethers.providers.Web3Provider(this.connector as any);
    });

    this.connector.on('disconnect', (error, payload) => {
      if (error) throw error;
      this.provider = null;
    });
  }

  getSigner(): ethers.Signer | null {
    return this.provider ? (this.provider as ethers.providers.Web3Provider).getSigner() : null;
  }
}