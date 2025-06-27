'use server';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  products as initialProducts,
  customers as initialCustomers,
  salesHistory as initialSalesHistory,
  type Product,
  type Customer,
  type SaleRecord
} from '@/lib/data';

const dataDir = path.join(process.cwd(), 'data');

// --- Encryption Setup ---
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_ENV = process.env.ENCRYPTION_KEY;

// Ensure the encryption key is present and valid, otherwise throw an error to prevent insecure operation.
if (!ENCRYPTION_KEY_ENV || ENCRYPTION_KEY_ENV.length !== 64) {
  console.error('FATAL: ENCRYPTION_KEY is not defined or invalid in .env file. It must be a 64-character hex string.');
  throw new Error('Encryption key is missing or invalid. Application cannot start securely.');
}

const encryptionKey = Buffer.from(ENCRYPTION_KEY_ENV, 'hex');

/**
 * Encrypts a string using AES-256-GCM.
 * @param text The plaintext string to encrypt.
 * @returns An object containing the iv, authTag, and the encrypted data, all as hex strings.
 */
function encrypt(text: string) {
  const iv = crypto.randomBytes(12); // 96-bit IV is recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encryptedData: encrypted.toString('hex'),
  };
}

/**
 * Decrypts data that was encrypted with the `encrypt` function.
 * @param data An object containing the iv, authTag, and encryptedData.
 * @returns The original plaintext string.
 */
function decrypt(data: { iv: string; authTag: string; encryptedData: string }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data.encryptedData, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
// --- End Encryption Setup ---


// Helper function to ensure the data directory exists
const ensureDataDir = async () => {
  try {
    await fs.stat(dataDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dataDir);
    } else {
      throw error;
    }
  }
};

// Generic function to read a JSON file, with decryption and migration logic
async function readDataFile<T>(fileName: string, initialData: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsedContent = JSON.parse(fileContent);

    // Check if the content is in our encrypted format
    if (parsedContent.iv && parsedContent.authTag && parsedContent.encryptedData) {
      try {
        const decryptedString = decrypt(parsedContent);
        return JSON.parse(decryptedString);
      } catch (decryptionError) {
        // This block catches errors during decryption, which likely means the key changed
        // or the data is corrupt. We will re-initialize the file with default data.
        console.error(`Decryption failed for ${fileName}. This might be due to an old encryption key or corrupted data. Re-initializing file.`, decryptionError);
        await writeDataFile(fileName, initialData);
        return initialData;
      }
    } else {
      // This is plaintext data from a previous version.
      // We'll perform a one-time migration to the encrypted format.
      console.warn(`[MIGRATION] Plaintext data found in ${fileName}. Migrating to encrypted format.`);
      await writeDataFile(fileName, parsedContent);
      return parsedContent;
    }
  } catch (error: any) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
       // If file doesn't exist or is not valid JSON (corrupt/empty), re-initialize.
       if (error instanceof SyntaxError) {
         console.error(`Corrupted data file ${fileName}. Re-initializing with default data.`, error);
       }
       await writeDataFile(fileName, initialData);
       return initialData;
    } else {
      console.error(`Error reading ${fileName}:`, error);
      throw new Error(`Could not read data from ${fileName}.`);
    }
  }
}

// Generic function to write to a JSON file, with encryption
async function writeDataFile<T>(fileName: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const encryptedData = encrypt(jsonString);
    await fs.writeFile(filePath, JSON.stringify(encryptedData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${fileName}:`, error);
    throw new Error(`Could not write data to ${fileName}.`);
  }
}

// Public API for data operations (no changes needed here)
export async function getProducts(): Promise<Product[]> {
  return readDataFile('products.json', initialProducts);
}

export async function saveProducts(products: Product[]): Promise<void> {
  return writeDataFile('products.json', products);
}

export async function getCustomers(): Promise<Customer[]> {
  return readDataFile('customers.json', initialCustomers);
}

export async function saveCustomers(customers: Customer[]): Promise<void> {
  return writeDataFile('customers.json', customers);
}

export async function getSalesHistory(): Promise<SaleRecord[]> {
  return readDataFile('salesHistory.json', initialSalesHistory);
}

export async function saveSalesHistory(salesHistory: SaleRecord[]): Promise<void> {
  return writeDataFile('salesHistory.json', salesHistory);
}

export async function getBackupData() {
    const products = await getProducts();
    const customers = await getCustomers();
    const salesHistory = await getSalesHistory();
    return { products, customers, salesHistory };
}

export async function restoreBackupData(data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[] }) {
    if (data.products) await saveProducts(data.products);
    if (data.customers) await saveCustomers(data.customers);
    if (data.salesHistory) await saveSalesHistory(data.salesHistory);
}


// New function to process a sale transaction in one go
export async function processSale(data: {
  salesHistory: SaleRecord[];
  products: Product[];
  customers: Customer[];
}): Promise<void> {
  try {
    await Promise.all([
      writeDataFile('salesHistory.json', data.salesHistory),
      writeDataFile('products.json', data.products),
      writeDataFile('customers.json', data.customers)
    ]);
  } catch (error) {
    console.error(`Error processing sale:`, error);
    throw new Error(`Could not process the sale transaction.`);
  }
}
