import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

interface Contact {
  address: string;
  name: string;
  lastSeen?: number;
  publicKey?: string;
}

class ContactManager {
  private contacts: Map<string, Contact> = new Map();

  async initializeContacts() {
    try {
      const storedContacts = await AsyncStorage.getItem('contacts');
      if (storedContacts) {
        this.contacts = new Map(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }

  async addContact(contact: Contact) {
    this.contacts.set(contact.address.toLowerCase(), contact);
    await this.saveContacts();
  }

  async removeContact(address: string) {
    this.contacts.delete(address.toLowerCase());
    await this.saveContacts();
  }

  private async saveContacts() {
    try {
      await AsyncStorage.setItem(
        'contacts',
        JSON.stringify(Array.from(this.contacts.entries()))
      );
    } catch (error) {
      console.error('Error saving contacts:', error);
    }
  }

  async syncWithContract(contractAddress: string, provider: ethers.providers.Provider) {
    // Implementiere Blockchain-Synchronisation
  }
}

export default new ContactManager();