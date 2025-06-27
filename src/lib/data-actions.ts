'use server';

import {
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    runTransaction,
    query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  products as initialProducts,
  customers as initialCustomers,
  salesHistory as initialSalesHistory,
  bakeryOrders as initialBakeryOrders,
  suppliers as initialSuppliers,
  supplierInvoices as initialSupplierInvoices,
  type Product,
  type Customer,
  type SaleRecord,
  type BakeryOrder,
  type Supplier,
  type SupplierInvoice,
  type CartItem,
} from '@/lib/data';

// Helper function to seed a collection if it's empty
async function seedCollection<T extends {id: string}>(collectionName: string, initialData: T[]) {
    const batch = writeBatch(db);
    initialData.forEach((item) => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
    });
    await batch.commit();
    console.log(`Collection '${collectionName}' seeded with ${initialData.length} documents.`);
}

// Generic function to read a collection, and seed it if it's empty
async function getCollection<T>(collectionName: string, initialData: T[]): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty && initialData.length > 0) {
        await seedCollection(collectionName, initialData as any[]);
        return initialData;
    }
    
    return snapshot.docs.map(doc => doc.data() as T);
  } catch (error: any) {
    if(error.code === 'permission-denied' || error.code === 'unauthenticated'){
      console.warn(`[Firestore] Permission denied for ${collectionName}. This is expected if Firestore is not configured. Returning initial data.`);
      return initialData;
    }
    console.error(`[Firestore] Error reading collection ${collectionName}:`, error);
    throw error;
  }
}

// Public API for data fetching operations
export async function getProducts(): Promise<Product[]> {
  return getCollection('products', initialProducts);
}
export async function getCustomers(): Promise<Customer[]> {
  return getCollection('customers', initialCustomers);
}
export async function getSalesHistory(): Promise<SaleRecord[]> {
  return getCollection('salesHistory', initialSalesHistory);
}
export async function getBakeryOrders(): Promise<BakeryOrder[]> {
    return getCollection('bakeryOrders', initialBakeryOrders);
}
export async function getSuppliers(): Promise<Supplier[]> {
    return getCollection('suppliers', initialSuppliers);
}
export async function getSupplierInvoices(): Promise<SupplierInvoice[]> {
    return getCollection('supplierInvoices', initialSupplierInvoices);
}

// Granular write operations
export async function addProductInDB(product: Product): Promise<void> {
    await setDoc(doc(db, 'products', product.id), product);
}
export async function updateProductInDB(productId: string, productData: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, 'products', productId), productData);
}
export async function deleteProductInDB(productId: string): Promise<void> {
    await deleteDoc(doc(db, 'products', productId));
}

export async function addCustomerInDB(customer: Customer): Promise<void> {
    await setDoc(doc(db, 'customers', customer.id), customer);
}
export async function updateCustomerInDB(customerId: string, customerData: Partial<Customer>): Promise<void> {
    await updateDoc(doc(db, 'customers', customerId), customerData);
}
export async function deleteCustomerInDB(customerId: string): Promise<void> {
    await deleteDoc(doc(db, 'customers', customerId));
}

export async function addBakeryOrderInDB(order: BakeryOrder): Promise<void> {
    await setDoc(doc(db, 'bakeryOrders', order.id), order);
}
export async function updateBakeryOrderInDB(orderId: string, orderData: Partial<BakeryOrder>): Promise<void> {
    await updateDoc(doc(db, 'bakeryOrders', orderId), orderData);
}
export async function deleteBakeryOrderInDB(orderId: string): Promise<void> {
    await deleteDoc(doc(db, 'bakeryOrders', orderId));
}

export async function addSupplierInDB(supplier: Supplier): Promise<void> {
    await setDoc(doc(db, 'suppliers', supplier.id), supplier);
}
export async function updateSupplierInDB(supplierId: string, supplierData: Partial<Supplier>): Promise<void> {
    await updateDoc(doc(db, 'suppliers', supplierId), supplierData);
}
export async function deleteSupplierInDB(supplierId: string): Promise<void> {
    await deleteDoc(doc(db, 'suppliers', supplierId));
}

// Transactional operations
export async function processSale(data: { saleRecord: SaleRecord; cart: CartItem[] }): Promise<void> {
    await runTransaction(db, async (transaction) => {
        // 1. Add sale record
        const saleRef = doc(db, 'salesHistory', data.saleRecord.id);
        transaction.set(saleRef, data.saleRecord);

        // 2. Update product stock
        for (const item of data.cart) {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error(`Product with ID ${item.id} does not exist!`);
            }
            const newStock = productDoc.data().stock - item.quantity;
            transaction.update(productRef, { stock: newStock });
        }

        // 3. Update customer balance
        if (data.saleRecord.customerId) {
            const customerRef = doc(db, 'customers', data.saleRecord.customerId);
            const customerDoc = await transaction.get(customerRef);
             if (!customerDoc.exists()) {
                throw new Error(`Customer with ID ${data.saleRecord.customerId} does not exist!`);
            }
            const newSpent = customerDoc.data().spent + data.saleRecord.totals.total;
            const newBalance = customerDoc.data().balance + data.saleRecord.totals.balance;
            transaction.update(customerRef, { spent: newSpent, balance: newBalance });
        }
    });
}

export async function processPayment(data: { customerId: string; amount: number }): Promise<void> {
    const paymentRecord: SaleRecord = {
        id: `PAY-${new Date().getTime()}`,
        customerId: data.customerId,
        items: [],
        totals: {
            subtotal: 0,
            discount: 0,
            total: data.amount, // Record the payment amount as the total
            amountPaid: data.amount,
            balance: -data.amount,
        },
        date: new Date().toISOString(),
    };

    await runTransaction(db, async (transaction) => {
        // 1. Add payment record to sales history
        const saleRef = doc(db, 'salesHistory', paymentRecord.id);
        transaction.set(saleRef, paymentRecord);
        
        // 2. Update customer balance
        const customerRef = doc(db, 'customers', data.customerId);
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
            throw new Error(`Customer with ID ${data.customerId} does not exist!`);
        }
        const newBalance = customerDoc.data().balance - data.amount;
        transaction.update(customerRef, { balance: newBalance });
    });
}

export async function processSupplierInvoice(invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>, products: Product[]): Promise<void> {
    let totalAmount = 0;
    
    const newInvoice: SupplierInvoice = {
        id: `SINV-${new Date().getTime()}`,
        date: new Date().toISOString(),
        totalAmount: 0, // Will be calculated below
        ...invoiceData,
    };

    await runTransaction(db, async (transaction) => {
        // Update product stock and prices
        for (const item of invoiceData.items) {
            totalAmount += item.quantity * item.purchasePrice;
            const productRef = doc(db, 'products', item.productId);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error(`Product with ID ${item.productId} does not exist!`);
            }
            
            const product = productDoc.data() as Product;
            const oldStock = product.stock;
            const oldPurchasePrice = product.purchasePrice || 0;
            const newQuantity = item.quantity;
            const newPurchasePrice = item.purchasePrice;
            const totalNewStock = oldStock + newQuantity;

            let newWeightedAveragePrice = newPurchasePrice;
            if (oldStock > 0 && totalNewStock > 0) {
                const totalOldValue = oldStock * oldPurchasePrice;
                const totalNewValue = newQuantity * newPurchasePrice;
                newWeightedAveragePrice = (totalOldValue + totalNewValue) / totalNewStock;
            }
            
            const productUpdateData: Partial<Product> = {
                stock: totalNewStock,
                purchasePrice: parseFloat(newWeightedAveragePrice.toFixed(2)),
            };

            if (item.boxPrice !== undefined) productUpdateData.boxPrice = item.boxPrice;
            if (item.quantityPerBox !== undefined) productUpdateData.quantityPerBox = item.quantityPerBox;
            if (item.barcode !== undefined) productUpdateData.barcode = item.barcode;
            
            transaction.update(productRef, productUpdateData);
        }

        // Add the supplier invoice with the calculated total
        newInvoice.totalAmount = totalAmount;
        const invoiceRef = doc(db, 'supplierInvoices', newInvoice.id);
        transaction.set(invoiceRef, newInvoice);
    });
}


// Backup and Restore (using batched writes for efficiency)
export async function getBackupData() {
    const [products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices] = await Promise.all([
        getProducts(),
        getCustomers(),
        getSalesHistory(),
        getBakeryOrders(),
        getSuppliers(),
        getSupplierInvoices()
    ]);
    return { products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices };
}

async function saveCollection<T extends {id: string}>(collectionName: string, data: T[]) {
    const batch = writeBatch(db);
    data.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
    });
    await batch.commit();
}

export async function saveProducts(products: Product[]): Promise<void> {
  return saveCollection('products', products);
}
export async function saveCustomers(customers: Customer[]): Promise<void> {
  return saveCollection('customers', customers);
}
export async function saveSalesHistory(salesHistory: SaleRecord[]): Promise<void> {
  return saveCollection('salesHistory', salesHistory);
}
export async function saveBakeryOrders(orders: BakeryOrder[]): Promise<void> {
    return saveCollection('bakeryOrders', orders);
}
export async function saveSuppliers(suppliers: Supplier[]): Promise<void> {
    return saveCollection('suppliers', suppliers);
}
export async function saveSupplierInvoices(invoices: SupplierInvoice[]): Promise<void> {
    return saveCollection('supplierInvoices', invoices);
}

export async function restoreBackupData(data: { products?: Product[]; customers?: Customer[]; salesHistory?: SaleRecord[]; bakeryOrders?: BakeryOrder[]; suppliers?: Supplier[]; supplierInvoices?: SupplierInvoice[] }) {
    if (data.products) await saveProducts(data.products);
    if (data.customers) await saveCustomers(data.customers);
    if (data.salesHistory) await saveSalesHistory(data.salesHistory);
    if (data.bakeryOrders) await saveBakeryOrders(data.bakeryOrders);
    if (data.suppliers) await saveSuppliers(data.suppliers);
    if (data.supplierInvoices) await saveSupplierInvoices(data.supplierInvoices);
}
