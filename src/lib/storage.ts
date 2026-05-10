import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'baznas_storage';
const STORE_NAME = 'surveys';

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function setItem(key: string, value: any) {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, value, key);
  } catch (error) {
    console.error('IndexedDB Error:', error);
    // Fallback to localStorage if small enough, but usually IndexedDB is much larger
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage also failed:', e);
      throw e;
    }
  }
}

export async function getItem(key: string) {
  try {
    const db = await getDB();
    const value = await db.get(STORE_NAME, key);
    if (value !== undefined) return value;
  } catch (error) {
    console.error('IndexedDB Error:', error);
  }
  
  // Fallback to localStorage
  const localValue = localStorage.getItem(key);
  if (localValue) {
    try {
      return JSON.parse(localValue);
    } catch {
      return localValue;
    }
  }
  return null;
}

export async function removeItem(key: string) {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
  } catch (error) {
    console.error('IndexedDB Error:', error);
  }
  localStorage.removeItem(key);
}
