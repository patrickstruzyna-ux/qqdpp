import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import WalletConnect from '@walletconnect/client';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

const App = () => {
  const [connector, setConnector] = useState<WalletConnect | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('');

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
  };

  const connectWallet = async () => {
    if (connector) {
      await connector.createSession();
    }
  };

  const sendMessage = async () => {
    if (!recipient || !newMessage || !connector) return;

    try {
      const provider = new ethers.providers.JsonRpcProvider('YOUR_INFURA_OR_NODE_URL');
      const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const encryptedMessage = CryptoJS.AES.encrypt(
        newMessage,
        'your-encryption-key'
      ).toString();

      const tx = await contract.sendMessage(recipient, encryptedMessage);
      await tx.wait();

      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.messageText}>{item.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp * 1000).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Dezentraler Messenger</Text>
        {!account ? (
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={connectWallet}
          >
            <Text style={styles.buttonText}>Wallet verbinden</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.accountText}>
            {`Verbunden: ${account.substring(0, 6)}...${account.substring(38)}`}
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Empfänger-Adresse"
          value={recipient}
          onChangeText={setRecipient}
        />
        <TextInput
          style={styles.input}
          placeholder="Nachricht"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
        >
          <Text style={styles.buttonText}>Senden</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        style={styles.messagesList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  accountText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default App;
