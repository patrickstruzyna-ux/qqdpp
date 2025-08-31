import React, { createContext, useContext, useState, useEffect } from 'react';
import { WalletConnect } from '@walletconnect/client';
import { ethers } from 'ethers';

interface WalletContextType {
  connector: WalletConnect | null;
  account: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connector, setConnector] = useState<WalletConnect | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    initializeWalletConnect();
  }, []);

  const initializeWalletConnect = async () => {
    const connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: true
    });

    setConnector(connector);

    if (connector.connected) {
      setAccount(connector.accounts[0]);
    }

    connector.on("connect", (error, payload) => {
      if (error) {
        console.error(error);
        return;
      }
      const { accounts } = payload.params[0];
      setAccount(accounts[0]);
    });

    connector.on("disconnect", () => {
      setAccount(null);
    });
  };

  const connectWallet = async () => {
    if (!connector) return;
    setIsConnecting(true);
    try {
      await connector.createSession();
    } catch (error) {
      console.error("Fehler beim Wallet-Connect:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (!connector) return;
    try {
      await connector.killSession();
      setAccount(null);
    } catch (error) {
      console.error("Fehler beim Disconnect:", error);
    }
  };

  return (
    <WalletContext.Provider 
      value={{ 
        connector, 
        account, 
        connectWallet, 
        disconnectWallet, 
        isConnecting 
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};