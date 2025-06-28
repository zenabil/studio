
'use server';

import {
    products as initialProducts,
    customers as initialCustomers,
    salesHistory as initialSalesHistory,
    bakeryOrders as initialBakeryOrders,
    suppliers as initialSuppliers,
    supplierInvoices as initialSupplierInvoices,
    licenseKeys as initialLicenseKeys,
    type Product,
    type Customer,
    type SaleRecord,
    type BakeryOrder,
    type Supplier,
    type SupplierInvoice,
    type SupplierInvoiceItem,
    type CartItem,
} from '@/lib/data';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const SALES_HISTORY_FILE = path.join(DATA_DIR, 'salesHistory.json');
const BAKERY_ORDERS_FILE = path.join(DATA_DIR, 'bakeryOrders.json');
const SUPPLIERS_FILE = path.join(DATA_DIR, 'suppliers.json');
const SUPPLIER_INVOICES_FILE = path.join(DATA_DIR, 'supplierInvoices.json');
const LICENSE_KEYS_FILE = path.join(DATA_DIR, 'licenseKeys.json');

const ALGORITHM = 'aes-256-gcm';

// Validate and load the encryption key
const ENCRYPTION_KEY_STRING = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_STRING || Buffer.from(ENCRYPTION_KEY_STRING, 'hex').length !== 32) {
    throw new Error('ENCRYPTION_KEY is not defined in your .env file or is invalid. Please provide a 32-byte key (64 hex characters).');
}
const KEY = Buffer.from(ENCRYPTION_KEY_STRING, 'hex');


// Encryption function
function encrypt(text: string): { iv: string; authTag: string; encryptedData: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

// Decryption function
function decrypt(data: { iv: string; authTag: string; encryptedData: string }): string {
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    const encrypted = Buffer.from(data.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

// Helper to read, decrypt and parse data, or seed if not present
async function readData<T>(filePath: string, initialData: T[]): Promise<T[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const decrypted = decrypt(JSON.parse(fileContent));
    return JSON.parse(decrypted);
  } catch (error) {
    console.warn(`Could not read or decrypt ${filePath}. Seeding with initial data.`);
    await writeData(filePath, initialData);
    return initialData;
  }
}

// Helper to encrypt and write data
async function writeData<T>(filePath: string, data: T[]): Promise<void> {
  const encrypted = encrypt(JSON.stringify(data, null, 2));
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(encrypted, null, 2));
}

// Public API for data fetching operations
export async function getProducts(): Promise<Product[]> {
  return readData(PRODUCTS_FILE, initialProducts);
}
export async function getCustomers(): Promise<Customer[]> {
  return readData(CUSTOMERS_FILE, initialCustomers);
}
export async function getSalesHistory(): Promise<SaleRecord[]> {
  return readData(SALES_HISTORY_FILE, initialSalesHistory);
}
export async function getBakeryOrders(): Promise<BakeryOrder[]> {
    return readData(BAKERY_ORDERS_FILE, initialBakeryOrders);
}
export async function getSuppliers(): Promise<Supplier[]> {
    return readData(SUPPLIERS_FILE, initialSuppliers);
}
export async function getSupplierInvoices(): Promise<SupplierInvoice[]> {
    return readData(SUPPLIER_INVOICES_FILE, initialSupplierInvoices);
}
export async function getLicenseKeys(): Promise<string[]> {
    try {
        const fileContent = await fs.readFile(LICENSE_KEYS_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch(e) {
        return initialLicenseKeys;
    }
}

// Granular write operations
export async function addProductInDB(product: Product): Promise<void> {
    const products = await getProducts();
    products.push(product);
    await writeData(PRODUCTS_FILE, products);
}
export async function updateProductInDB(productId: string, productData: Partial<Product>): Promise<void> {
    let products = await getProducts();
    products = products.map(p => p.id === productId ? { ...p, ...productData } : p);
    await writeData(PRODUCTS_FILE, products);
}
export async function deleteProductInDB(productId: string): Promise<void> {
    let products = await getProducts();
    products = products.filter(p => p.id !== productId);
    await writeData(PRODUCTS_FILE, products);
}

export async function addCustomerInDB(customer: Customer): Promise<void> {
    const customers = await getCustomers();
    customers.push(customer);
    await writeData(CUSTOMERS_FILE, customers);
}
export async function updateCustomerInDB(customerId: string, customerData: Partial<Customer>): Promise<void> {
    let customers = await getCustomers();
    customers = customers.map(c => c.id === customerId ? { ...c, ...customerData } : c);
    await writeData(CUSTOMERS_FILE, customers);
}
export async function deleteCustomerInDB(customerId: string): Promise<void> {
    let customers = await getCustomers();
    customers = customers.filter(c => c.id !== customerId);
    await writeData(CUSTOMERS_FILE, customers);
}

export async function addBakeryOrderInDB(order: BakeryOrder): Promise<void> {
    const orders = await getBakeryOrders();
    orders.push(order);
    await writeData(BAKERY_ORDERS_FILE, orders);
}
export async function updateBakeryOrderInDB(orderId: string, orderData: Partial<BakeryOrder>): Promise<void> {
    let orders = await getBakeryOrders();
    orders = orders.map(o => o.id === orderId ? { ...o, ...orderData } : o);
    await writeData(BAKERY_ORDERS_FILE, orders);
}
export async function deleteBakeryOrderInDB(orderId: string): Promise<void> {
    let orders = await getBakeryOrders();
    orders = orders.filter(o => o.id !== orderId);
    await writeData(BAKERY_ORDERS_FILE, orders);
}

export async function setRecurringStatusForOrderNameInDB(orderName: string, isRecurring: boolean): Promise<void> {
    let orders = await getBakeryOrders();
    orders = orders.map(o => o.name === orderName ? { ...o, isRecurring } : o);
    await writeData(BAKERY_ORDERS_FILE, orders);
}

export async function addSupplierInDB(supplier: Supplier): Promise<void> {
    const suppliers = await getSuppliers();
    suppliers.push(supplier);
    await writeData(SUPPLIERS_FILE, suppliers);
}
export async function updateSupplierInDB(supplierId: string, supplierData: Partial<Supplier>): Promise<void> {
    let suppliers = await getSuppliers();
    suppliers = suppliers.map(s => s.id === supplierId ? { ...s, ...supplierData } : s);
    await writeData(SUPPLIERS_FILE, suppliers);
}
export async function deleteSupplierInDB(supplierId: string): Promise<void> {
    let suppliers = await getSuppliers();
    suppliers = suppliers.filter(s => s.id !== supplierId);
    await writeData(SUPPLIERS_FILE, suppliers);
}

// "Transactional" operations
export async function processSale(data: { saleRecord: SaleRecord; cart: CartItem[] }): Promise<void> {
    const [products, customers, sales] = await Promise.all([
        getProducts(),
        getCustomers(),
        getSalesHistory()
    ]);

    // Final stock validation before processing
    for (const item of data.cart) {
        const product = products.find(p => p.id === item.id);
        if (!product || product.stock < item.quantity) {
            // This message will be displayed in a toast to the user.
            const errorMsg = `Not enough stock for '${product?.name || item.name}'. Available: ${product?.stock || 0}, Requested: ${item.quantity}.`;
            throw new Error(errorMsg);
        }
    }

    // 1. Update product stock
    data.cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            product.stock -= item.quantity;
        }
    });

    // 2. Update customer balance
    if (data.saleRecord.customerId) {
        const customer = customers.find(c => c.id === data.saleRecord.customerId);
        if (customer) {
            customer.spent += data.saleRecord.totals.total;
            customer.balance += data.saleRecord.totals.balance;
        }
    }
    
    // 3. Add sale record
    sales.push(data.saleRecord);

    // 4. Write all changes
    await Promise.all([
        writeData(PRODUCTS_FILE, products),
        writeData(CUSTOMERS_FILE, customers),
        writeData(SALES_HISTORY_FILE, sales)
    ]);
}

export async function processPayment(data: { customerId: string; amount: number }): Promise<void> {
    const [customers, sales] = await Promise.all([
        getCustomers(),
        getSalesHistory()
    ]);
    
    const paymentRecord: SaleRecord = {
        id: `PAY-${new Date().getTime()}`,
        customerId: data.customerId,
        items: [],
        totals: {
            subtotal: 0,
            discount: 0,
            total: data.amount,
            amountPaid: data.amount,
            balance: -data.amount,
        },
        date: new Date().toISOString(),
    };
    
    // 1. Add payment record
    sales.push(paymentRecord);
    
    // 2. Update customer balance
    const customer = customers.find(c => c.id === data.customerId);
    if(customer) {
        customer.balance -= data.amount;
    }
    
    // 3. Write all changes
    await Promise.all([
        writeData(CUSTOMERS_FILE, customers),
        writeData(SALES_HISTORY_FILE, sales)
    ]);
}

export async function processSupplierInvoice(data: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; updateMasterPrices: boolean }): Promise<void> {
    const { updateMasterPrices, ...invoiceData } = data;
    
    const [products, invoices, suppliers] = await Promise.all([
        getProducts(),
        getSupplierInvoices(),
        getSuppliers()
    ]);

    let totalAmount = 0;
    
    // Update product stock and prices
    invoiceData.items.forEach(item => {
        totalAmount += item.quantity * item.purchasePrice;
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const oldStock = product.stock;
            const newQuantity = item.quantity;
            
            // Update stock always
            product.stock += newQuantity;

            // ONLY update master prices if requested
            if (updateMasterPrices) {
                if (item.boxPrice !== undefined) product.boxPrice = item.boxPrice;
                if (item.quantityPerBox !== undefined) product.quantityPerBox = item.quantityPerBox;

                // Calculate and update weighted average purchase price
                const oldPurchasePrice = product.purchasePrice || 0;
                const newPurchasePrice = item.purchasePrice;
                
                // Robust weighted average calculation
                const oldPositiveStock = Math.max(0, oldStock);
                const totalPositiveStockAfterInvoice = oldPositiveStock + newQuantity;

                if (totalPositiveStockAfterInvoice > 0) {
                    const totalOldValue = oldPositiveStock * oldPurchasePrice;
                    const totalNewValue = newQuantity * newPurchasePrice;
                    const newWeightedAveragePrice = (totalOldValue + totalNewValue) / totalPositiveStockAfterInvoice;
                    product.purchasePrice = parseFloat(newWeightedAveragePrice.toFixed(2));
                } else {
                    // Fallback: This case is unlikely if newQuantity > 0, but safe to have.
                    // If stock was negative and the new quantity doesn't make it positive,
                    // the new purchase price is the most relevant.
                    product.purchasePrice = newPurchasePrice;
                }
            }
        }
    });

    const amountPaid = invoiceData.amountPaid || 0;

    const newInvoice: SupplierInvoice = {
        id: `SINV-${new Date().getTime()}`,
        date: new Date().toISOString(),
        totalAmount,
        ...invoiceData,
        amountPaid: amountPaid,
        isPayment: false,
    };
    invoices.push(newInvoice);

    // Update supplier balance
    const supplier = suppliers.find(s => s.id === invoiceData.supplierId);
    if (supplier) {
        supplier.balance = (supplier.balance || 0) + (totalAmount - amountPaid);
    }
    
    await Promise.all([
        writeData(PRODUCTS_FILE, products),
        writeData(SUPPLIER_INVOICES_FILE, invoices),
        writeData(SUPPLIERS_FILE, suppliers)
    ]);
}

export async function processSupplierPayment(data: { supplierId: string; amount: number }): Promise<void> {
    const [suppliers, invoices] = await Promise.all([
        getSuppliers(),
        getSupplierInvoices()
    ]);

    // 1. Update supplier balance
    const supplier = suppliers.find(s => s.id === data.supplierId);
    if (supplier) {
        supplier.balance -= data.amount;
    }

    // 2. Create payment record
    const paymentRecord: SupplierInvoice = {
        id: `SPAY-${new Date().getTime()}`,
        supplierId: data.supplierId,
        date: new Date().toISOString(),
        items: [], // An empty items array signifies a payment
        totalAmount: data.amount,
        isPayment: true,
        amountPaid: data.amount,
    };
    invoices.push(paymentRecord);

    // 3. Write all changes
    await Promise.all([
        writeData(SUPPLIERS_FILE, suppliers),
        writeData(SUPPLIER_INVOICES_FILE, invoices),
    ]);
}


// Backup and Restore
export async function getBackupData() {
    const [products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices] = await Promise.all([
        getProducts(),
        getCustomers(),
        getSalesHistory(),
        getBakeryOrders(),
        getSuppliers(),
        getSupplierInvoices(),
    ]);
    return { products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices };
}

export async function saveProducts(products: Product[]): Promise<void> {
  return writeData(PRODUCTS_FILE, products);
}
export async function saveCustomers(customers: Customer[]): Promise<void> {
  return writeData(CUSTOMERS_FILE, customers);
}
export async function saveSalesHistory(salesHistory: SaleRecord[]): Promise<void> {
  return writeData(SALES_HISTORY_FILE, salesHistory);
}
export async function saveBakeryOrders(orders: BakeryOrder[]): Promise<void> {
    return writeData(BAKERY_ORDERS_FILE, orders);
}
export async function saveSuppliers(suppliers: Supplier[]): Promise<void> {
    return writeData(SUPPLIERS_FILE, suppliers);
}
export async function saveSupplierInvoices(invoices: SupplierInvoice[]): Promise<void> {
    return writeData(SUPPLIER_INVOICES_FILE, invoices);
}
export async function saveLicenseKeys(keys: string[]): Promise<void> {
    const dataToWrite = JSON.stringify(keys, null, 2);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(LICENSE_KEYS_FILE, dataToWrite);
}

export async function restoreBackupData(data: { products?: Product[]; customers?: Customer[]; salesHistory?: SaleRecord[]; bakeryOrders?: BakeryOrder[]; suppliers?: Supplier[]; supplierInvoices?: SupplierInvoice[] }) {
    if (data.products) await saveProducts(data.products);
    if (data.customers) await saveCustomers(data.customers);
    if (data.salesHistory) await saveSalesHistory(data.salesHistory);
    if (data.bakeryOrders) await saveBakeryOrders(data.bakeryOrders);
    if (data.suppliers) await saveSuppliers(data.suppliers);
    if (data.supplierInvoices) await saveSupplierInvoices(data.supplierInvoices);
}

    
