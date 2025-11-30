import { Entry, AppSettings } from '../types';

const DB_NAME = 'OfflineDiaryDB';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_SETTINGS = 'settings';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const entryStore = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
        entryStore.createIndex('date', 'date', { unique: false });
        entryStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const diaryService = {
  async getAllEntries(): Promise<Entry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENTRIES, 'readonly');
      const store = transaction.objectStore(STORE_ENTRIES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.sort((a: Entry, b: Entry) => b.date - a.date));
      request.onerror = () => reject(request.error);
    });
  },

  async saveEntry(entry: Entry): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENTRIES, 'readwrite');
      const store = transaction.objectStore(STORE_ENTRIES);
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteEntry(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENTRIES, 'readwrite');
      const store = transaction.objectStore(STORE_ENTRIES);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getSettings(): Promise<AppSettings> {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_SETTINGS, 'readonly');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.get('appSettings');
      request.onsuccess = () => {
        resolve(request.result?.value || {
          theme: 'light',
          securityEnabled: false,
          pin: null,
          biometricsEnabled: false,
          dailyReminder: false,
          reminderTime: '20:00',
          viewMode: 'list'
        });
      };
      request.onerror = () => resolve({} as AppSettings);
    });
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.put({ key: 'appSettings', value: settings });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async exportData(): Promise<string> {
    const entries = await this.getAllEntries();
    return JSON.stringify(entries);
  },

  async importData(jsonString: string): Promise<void> {
    try {
      const entries = JSON.parse(jsonString) as Entry[];
      const db = await openDB();
      const transaction = db.transaction(STORE_ENTRIES, 'readwrite');
      const store = transaction.objectStore(STORE_ENTRIES);
      
      for (const entry of entries) {
        store.put(entry);
      }
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      throw new Error('Formato de arquivo inválido');
    }
  }
};
