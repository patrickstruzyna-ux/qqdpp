import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text
} from 'react-native';
import { useMessages } from '../contexts/MessageContext';
import { useWallet } from '../contexts/WalletContext';

const ChatDetailScreen = ({ route }) => {
  const { recipient } = route.params;
  const [newMessage, setNewMessage] = useState('');
  const { messages, sendMessage, loadMoreMessages } = useMessages();
  const { account } = useWallet();

  const filteredMessages = messages.filter(
    msg => 
      (msg.sender === account && msg.recipient === recipient) ||
      (msg.sender === recipient && msg.recipient === account)
  );

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await sendMessage(recipient, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      // Hier könnte eine Fehlermeldung angezeigt werden
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === account ? styles.sentMessage : styles.receivedMessage
    ]}>
      <Text style={styles.messageText}>{item.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Nachricht eingeben..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSend}
        >
          <Text style={styles.sendButtonText}>Senden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  messageContainer: {
    margin: 8,
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%'
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF'
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA'
  },
  messageText: {
    fontSize: 16
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF'
  },
  input: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    padding: 10,
    marginRight: 8
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16
  }
});

export default ChatDetailScreen;