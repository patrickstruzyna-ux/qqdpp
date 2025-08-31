import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';

class StorageService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize() {
    this.db = await SQLite.openDatabase({
      name: 'messageDB',
      location: 'default'
    });

    await this.createTables();
  }

  private async createTables() {
    await this.db?.executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender TEXT,
        recipient TEXT,
        content TEXT,
        timestamp INTEGER,
        status TEXT,
        type TEXT
      )
    `);
  }

  async saveMessage(message: any) {
    const { id, sender, recipient, content, timestamp, status, type } = message;
    await this.db?.executeSql(
      `INSERT INTO messages (id, sender, recipient, content, timestamp, status, type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sender, recipient, content, timestamp, status, type]
    );
  }

  async getMessages(address: string, limit: number = 50): Promise<any[]> {
    const [results] = await this.db?.executeSql(
      `SELECT * FROM messages 
       WHERE sender = ? OR recipient = ?
       ORDER BY timestamp DESC LIMIT ?`,
      [address, address, limit]
    ) || [{ rows: { raw: () => [] } }];
    
    return results.rows.raw();
  }
}

export default new StorageService();