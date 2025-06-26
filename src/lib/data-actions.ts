'use server';

import fs from 'fs/promises';
import path from 'path';
import {
  products as initialProducts,
  customers as initialCustomers,
  salesHistory as initialSalesHistory,
  type Product,
  type Customer,
  type SaleRecord
} from '@/lib/data';

const dataDir = path.join(process.cwd(), 'data');

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

// Generic function to read a JSON file
async function readDataFile<T>(fileName: string, initialData: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, so write initial data and return it
      await writeDataFile(fileName, initialData);
      return initialData;
    } else {
      console.error(`Error reading ${fileName}:`, error);
      throw new Error(`Could not read data from ${fileName}.`);
    }
  }
}

// Generic function to write to a JSON file
async function writeDataFile<T>(fileName: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${fileName}:`, error);
    throw new Error(`Could not write data to ${fileName}.`);
  }
}

// Public API for data operations
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