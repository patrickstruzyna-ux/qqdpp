import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('');

  // Verbindung mit MetaMask
  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Fehler beim Verbinden mit MetaMask:", error);
      }
    }
  }

  // Nachricht verschlüsseln und senden
  async function sendMessage() {
    if (!recipient || !newMessage) return;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      // Nachricht verschlüsseln
      const encryptedMessage = CryptoJS.AES.encrypt(
        newMessage,
        'your-encryption-key'
      ).toString();
      
      // Nachricht an Smart Contract senden
      const tx = await contract.sendMessage(recipient, encryptedMessage);
      await tx.wait();
      
      setNewMessage('');
    } catch (error) {
      console.error("Fehler beim Senden der Nachricht:", error);
    }
  }

  return (
    <div className="App">
      <header>
        <h1>Dezentraler Messenger</h1>
        {!account ? (
          <button onClick={connectWallet}>Mit Wallet verbinden</button>
        ) : (
          <p>Verbunden mit: {account}</p>
        )}
      </header>
      
      <main>
        <div className="message-input">
          <input
            type="text"
            placeholder="Empfänger-Adresse"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nachricht"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button onClick={sendMessage}>Senden</button>
        </div>
        
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className="message">
              <p>{msg.content}</p>
              <small>{new Date(msg.timestamp * 1000).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;