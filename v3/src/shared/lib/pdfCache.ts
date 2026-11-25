import { APP_MODE } from '@/shared/api/config'
import { pdfStorageKey } from '@/shared/api/mode'

const DB_NAME = pdfStorageKey(APP_MODE)
const STORE_NAME = 'pdfs'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase | null> | null = null

export function buildPdfCacheKey(formId: string, versionId: string) {
  return `pdf:${formId}:${versionId}`
}

export async function setCachedPdf(key: string, blob: Blob) {
  try {
    const db = await getDb()
    if (!db) return false
    await runStore(db, 'readwrite', (store) => store.put(blob, key))
    return true
  } catch {
    return false
  }
}

export async function getCachedPdf(key: string) {
  try {
    const db = await getDb()
    if (!db) return null
    const result = await runStore<Blob | undefined>(db, 'readonly', (store) => store.get(key))
    return result ?? null
  } catch {
    return null
  }
}

export async function deleteCachedPdf(key: string) {
  try {
    const db = await getDb()
    if (!db) return
    await runStore(db, 'readwrite', (store) => store.delete(key))
  } catch {
    // ignore cache failures
  }
}

function getDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbPromise) dbPromise = openDb()
  return dbPromise
}

function openDb() {
  return new Promise<IDBDatabase | null>((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

function runStore<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const req = action(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    tx.onerror = () => reject(tx.error)
  })
}
