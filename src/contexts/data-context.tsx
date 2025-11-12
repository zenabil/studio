

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import {
    useFirestore,
    useCollection,
    useMemoFirebase,
} from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import {
    collection,
    doc,
    writeBatch,
    serverTimestamp,
    query,
    where,
    getDocs,
    CollectionReference,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    runTransaction,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';
import { calculateUpdatedProductsForInvoice, WithId } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isBefore, startOfToday } from 'date-fns';

// Data type definitions moved here for better co-location
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  purchasePrice: number;
  stock: number;
  minStock: number;
  quantityPerBox?: number | null;
  boxPrice?: number | null;
  barcodes: string[];
  imageUrl?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  spent: number;
  balance: number;
  settlementDay?: number;
};

export interface BakeryOrder {
  id: string;
  date: string;
  name: string;
  quantity: number;
  paid: boolean;
  received: boolean;
  isRecurring: boolean;
  price?: number;
}

export interface Supplier {
  id:string;
  name: string;
  phone: string;
  productCategory: string;
  visitDays?: number[];
  balance: number;
}

export interface SupplierInvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  boxPrice?: number | null;
  quantityPerBox?: number | null;
  barcode?: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    status: 'draft' | 'sent' | 'partially_received' | 'completed' | 'cancelled';
    items: SupplierInvoiceItem[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface CartItem extends Product {
    quantity: number;
}

export type SaleRecord = {
    id: string;
    customerId: string | null;
    items: CartItem[];
    totals: {
        subtotal: number;
        discount: number;
        total: number;
        amountPaid: number;
        balance: number;
    };
    date: string;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  date: string;
  items: SupplierInvoiceItem[];
  totalAmount: number;
  amountPaid?: number;
  isPayment?: boolean;
  priceUpdateStrategy?: 'master' | 'average' | 'none';
  purchaseOrderId?: string;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string | null;
  status: 'approved' | 'pending' | 'revoked';
  isAdmin: boolean;
  createdAt: string;
  subscriptionEndsAt?: string | null;
}

export type ProductFormData = Omit<Product, 'id'>;

export type AddSupplierInvoiceData = {
  supplierId: string;
  items: SupplierInvoiceItem[];
  amountPaid?: number;
  priceUpdateStrategy: 'master' | 'average' | 'none';
  purchaseOrderId?: string;
};


interface DataContextType {
    products: WithId<Product>[];
    customers: WithId<Customer>[];
    salesHistory: WithId<SaleRecord>[];
    bakeryOrders: WithId<BakeryOrder>[];
    suppliers: WithId<Supplier>[];
    supplierInvoices: WithId<SupplierInvoice>[];
    purchaseOrders: WithId<PurchaseOrder>[];
    expenses: WithId<Expense>[];
    userProfiles: WithId<UserProfile>[];
    userProfile: UserProfile | null;
    isLoading: boolean;
    addProduct: (productData: ProductFormData) => Promise<Product>;
    updateProduct: (productId: string, productData: Partial<ProductFormData>) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => Promise<WithId<Customer>>;
    updateCustomer: (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => Promise<void>;
    makePayment: (customerId: string, amount: number) => Promise<void>;
    addBakeryOrder: (orderData: Omit<BakeryOrder, 'id'>) => Promise<void>;
    updateBakeryOrder: (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => Promise<void>;
    deleteBakeryOrder: (orderId: string) => Promise<void>;
    deleteRecurringPattern: (orderName: string) => Promise<void>;
    setAsRecurringTemplate: (templateId: string, isRecurring: boolean) => Promise<void>;
    addSupplier: (supplierData: Omit<Supplier, 'id' | 'balance'>) => Promise<void>;
    updateSupplier: (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addSupplierInvoice: (invoiceData: AddSupplierInvoiceData) => Promise<void>;
    addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
    updatePurchaseOrder: (poId: string, poData: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>) => Promise<void>;
    deletePurchaseOrder: (poId: string) => Promise<void>;
    makePaymentToSupplier: (supplierId: string, amount: number) => Promise<void>;
    addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: string, expenseData: Partial<Omit<Expense, 'id'>>) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;
    addPendingUser: (email: string, password: string, name: string) => Promise<void>;
    approveUser: (userId: string) => Promise<void>;
    revokeUser: (userId: string) => Promise<void>;
    updateUserProfile: (userId: string, profileData: Partial<UserProfile>) => Promise<void>;
    updateUserSubscription: (userId: string, subscriptionEndsAt: string | null) => Promise<void>;
    restoreData: (data: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const { t } = useLanguage();
    const { user, userProfile: authUserProfile, isUserLoading, firebaseApp } = useUser();
    const firestore = useFirestore();

    const dataUserId = user?.uid;

    const productsRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/products`) : null, [firestore, dataUserId]);
    const customersRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/customers`) : null, [firestore, dataUserId]);
    const salesRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/sales`) : null, [firestore, dataUserId]);
    const bakeryOrdersRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/bakeryOrders`) : null, [firestore, dataUserId]);
    const suppliersRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/suppliers`) : null, [firestore, dataUserId]);
    const supplierInvoicesRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/supplierInvoices`) : null, [firestore, dataUserId]);
    const purchaseOrdersRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/purchaseOrders`) : null, [firestore, dataUserId]);
    const expensesRef = useMemoFirebase(() => dataUserId ? collection(firestore, `users/${dataUserId}/expenses`) : null, [firestore, dataUserId]);
    
    const userProfilesRef = useMemoFirebase(() => {
        if (!firestore || !authUserProfile?.isAdmin) return null;
        return collection(firestore, 'userProfiles');
    }, [firestore, authUserProfile?.isAdmin]);
    
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsRef);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersRef);
    const { data: salesHistory, isLoading: salesLoading } = useCollection<SaleRecord>(salesRef);
    const { data: bakeryOrders, isLoading: bakeryOrdersLoading } = useCollection<BakeryOrder>(bakeryOrdersRef);
    const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersRef);
    const { data: supplierInvoices, isLoading: supplierInvoicesLoading } = useCollection<SupplierInvoice>(supplierInvoicesRef);
    const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = useCollection<PurchaseOrder>(purchaseOrdersRef);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);
    const { data: userProfiles, isLoading: profilesLoading } = useCollection<UserProfile>(userProfilesRef);

    const isLoading = isUserLoading || productsLoading || customersLoading || salesLoading || bakeryOrdersLoading || suppliersLoading || supplierInvoicesLoading || purchaseOrdersLoading || expensesLoading || (authUserProfile?.isAdmin && profilesLoading);
    
    const addProduct = useCallback(async (productData: ProductFormData) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/products`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");

        const newProductData = {
            ...productData,
            createdAt: serverTimestamp(),
        };
        
        const sanitizedData: any = { ...newProductData };
        Object.keys(sanitizedData).forEach(key => {
            if (sanitizedData[key] === undefined) {
                sanitizedData[key] = null;
            }
        });

        const docRef = await addDoc(collectionRef, sanitizedData)
            .catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: sanitizedData }));
                throw error;
            });
        
        return { ...sanitizedData, id: docRef.id } as WithId<Product>;
    }, [firestore, dataUserId]);

    const updateProduct = useCallback(async (productId: string, productData: Partial<ProductFormData>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/products`);
        if (!collectionRef) return;
        
        const dataToUpdate = {
            ...productData,
        };

        const sanitizedData: any = { ...dataToUpdate };
        Object.keys(sanitizedData).forEach(key => {
            if (sanitizedData[key] === undefined) {
                sanitizedData[key] = null;
            }
        });

        const docRef = doc(collectionRef, productId);
        await updateDoc(docRef, sanitizedData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: sanitizedData }));
        });
    }, [firestore, dataUserId]);

    const deleteProduct = useCallback(async (productId: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/products`);
        if (!collectionRef) return;

        const isUsedInSales = (salesHistory || []).some(sale => sale.items.some(item => item.id === productId));
        const isUsedInInvoices = (supplierInvoices || []).some(invoice => invoice.items.some(item => item.productId === productId));
        const isUsedInPOs = (purchaseOrders || []).some(po => po.items.some(item => item.productId === productId));

        if (isUsedInSales || isUsedInInvoices || isUsedInPOs) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.products.deleteErrorInUse });
            return;
        }

        const docRef = doc(collectionRef, productId);
        await deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.products.productDeleted });
    }, [firestore, dataUserId, salesHistory, supplierInvoices, purchaseOrders, t, toast]);
    
    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/customers`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");

        const newCustomerData: Omit<Customer, 'id'> = {
            ...customerData,
            spent: 0,
            balance: 0,
        };

        const docRef = await addDoc(collectionRef, newCustomerData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newCustomerData }));
            throw error;
        });

        return { ...newCustomerData, id: docRef.id };
        
    }, [firestore, dataUserId]);
    
    const updateCustomer = useCallback(async (customerId: string, customerData: Partial<Customer>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/customers`);
        if (!collectionRef) return;
        const docRef = doc(collectionRef, customerId);
        await updateDoc(docRef, customerData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: customerData }));
        });
    }, [firestore, dataUserId]);

    const deleteCustomer = useCallback(async (customerId: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/customers`);
        if (!collectionRef) return;
        
        const docRef = doc(collectionRef, customerId);
        await deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.customers.customerDeleted });
    }, [firestore, dataUserId, t, toast]);
    
    const addSaleRecord = useCallback(async (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");

        await runTransaction(firestore, async (transaction) => {
            const salesCollectionRef = collection(firestore, `users/${dataUserId}/sales`);
            const saleRef = doc(salesCollectionRef);
            const newSale: Omit<SaleRecord, 'id'> = {
                customerId,
                items: cart,
                totals,
                date: new Date().toISOString()
            };
            transaction.set(saleRef, newSale);

            for (const item of cart) {
                const productRef = doc(firestore, `users/${dataUserId}/products/${item.id}`);
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock;
                    transaction.update(productRef, { stock: currentStock - item.quantity });
                }
            }

            if (customerId) {
                const customerRef = doc(firestore, `users/${dataUserId}/customers/${customerId}`);
                const customerDoc = await transaction.get(customerRef);
                if (customerDoc.exists()) {
                    const customer = customerDoc.data();
                    const newSpent = customer.spent + totals.total;
                    const newBalance = customer.balance + totals.balance;
                    transaction.update(customerRef, { spent: newSpent, balance: newBalance });
                }
            }
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { cart, customerId, totals } }));
            throw error;
        });
    }, [firestore, dataUserId]);
    
    const makePayment = useCallback(async (customerId: string, amount: number) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        
        await runTransaction(firestore, async (transaction) => {
            const salesCollectionRef = collection(firestore, `users/${dataUserId}/sales`);
            const paymentRef = doc(salesCollectionRef);
            const paymentRecord: Omit<SaleRecord, 'id'>= { 
                customerId, 
                items: [], 
                totals: { subtotal: 0, discount: 0, total: amount, amountPaid: amount, balance: -amount }, 
                date: new Date().toISOString() 
            };
            transaction.set(paymentRef, paymentRecord);

            const customerRef = doc(firestore, `users/${dataUserId}/customers/${customerId}`);
            const customerDoc = await transaction.get(customerRef);
            if (customerDoc.exists()) {
                const newBalance = customerDoc.data().balance - amount;
                transaction.update(customerRef, { balance: newBalance });
            }
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { payment: { customerId, amount } } }));
            throw error;
        });
    }, [firestore, dataUserId]);

    const addBakeryOrder = useCallback(async (orderData: Omit<BakeryOrder, 'id'>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/bakeryOrders`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        const newOrderData = { ...orderData, createdAt: serverTimestamp() };
        await addDoc(collectionRef, newOrderData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newOrderData }));
        });
    }, [firestore, dataUserId]);

    const updateBakeryOrder = useCallback(async (orderId: string, orderData: Partial<BakeryOrder>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/bakeryOrders`);
        if (!collectionRef) return;
        const docRef = doc(collectionRef, orderId);
        await updateDoc(docRef, orderData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: orderData }));
        });
    }, [firestore, dataUserId]);
    
    const deleteBakeryOrder = useCallback(async (orderId: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/bakeryOrders`);
        if (!collectionRef) return;
        const docRef = doc(collectionRef, orderId);
        await deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
    }, [firestore, dataUserId]);

    const deleteRecurringPattern = useCallback(async (orderName: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/bakeryOrders`);
        if (!collectionRef || !firestore) throw new Error("User not authenticated or data path not available.");
        const q = query(collectionRef, where("name", "==", orderName), where("isRecurring", "==", true));
        
        try {
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(firestore);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: t.bakeryOrders.patternDeleted });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'delete', requestResourceData: { name: orderName, isRecurring: true } }));
            throw error;
        }
    }, [firestore, dataUserId, t, toast]);

    const setAsRecurringTemplate = useCallback(async (templateId: string, isRecurring: boolean) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/bakeryOrders`);
        if (!collectionRef || !firestore) throw new Error("User not authenticated or data path not available.");
        
        const templateOrder = (bakeryOrders || []).find(o => o.id === templateId);
        if (!templateOrder) return;
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const docRef = doc(collectionRef, templateId);
                transaction.update(docRef, { isRecurring });

                if (isRecurring) {
                    const q = query(collectionRef, where("name", "==", templateOrder.name), where("isRecurring", "==", true));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((doc) => {
                        if (doc.id !== templateId) {
                            transaction.update(doc.ref, { isRecurring: false });
                        }
                    });
                }
            });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: doc(collectionRef, templateId).path, operation: 'update', requestResourceData: { isRecurring } }));
            throw error;
        }
    }, [firestore, dataUserId, bakeryOrders]);

    const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/suppliers`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        const newSupplierData = { ...supplierData, balance: 0 };
        await addDoc(collectionRef, newSupplierData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newSupplierData }));
        });
    }, [firestore, dataUserId]);

    const updateSupplier = useCallback(async (supplierId: string, supplierData: Partial<Supplier>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/suppliers`);
        if (!collectionRef) return;
        const docRef = doc(collectionRef, supplierId);
        await updateDoc(docRef, supplierData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: supplierData }));
        });
    }, [firestore, dataUserId]);

    const deleteSupplier = useCallback(async (supplierId: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/suppliers`);
        if (!collectionRef) return;
        if ((supplierInvoices || []).some(invoice => invoice.supplierId === supplierId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.suppliers.deleteErrorInUse });
            return;
        }
        const docRef = doc(collectionRef, supplierId);
        await deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.suppliers.supplierDeleted });
    }, [firestore, dataUserId, supplierInvoices, t, toast]);
    
    const addSupplierInvoice = useCallback(async (invoiceData: AddSupplierInvoiceData) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        
        try {
            const batch = writeBatch(firestore);
            
            const totalAmount = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
            const invoiceCollectionRef = collection(firestore, `users/${dataUserId}/supplierInvoices`);
            const invoiceRef = doc(invoiceCollectionRef);
            
            const newInvoiceData: Omit<SupplierInvoice, 'id'> = { 
                date: new Date().toISOString(), 
                isPayment: false, 
                totalAmount, 
                ...invoiceData 
            };
    
            const sanitizedInvoice: { [key: string]: any } = {};
            for (const key in newInvoiceData) {
                if (Object.prototype.hasOwnProperty.call(newInvoiceData, key)) {
                    const value = (newInvoiceData as any)[key];
                    sanitizedInvoice[key] = value === undefined ? null : value;
                }
            }

            batch.set(invoiceRef, sanitizedInvoice);
            
            const updatedProducts = calculateUpdatedProductsForInvoice((products || []), invoiceData.items, invoiceData.priceUpdateStrategy);
            
            for (const item of invoiceData.items) {
                const productRef = doc(firestore, `users/${dataUserId}/products/${item.productId}`);
                const updatedProductData = updatedProducts.find(p => p.id === item.productId);
                if(updatedProductData) {
                    batch.update(productRef, {
                        stock: updatedProductData.stock,
                        purchasePrice: updatedProductData.purchasePrice,
                    });
                }
            }
        
            const supplierRef = doc(firestore, `users/${dataUserId}/suppliers/${invoiceData.supplierId}`);
            const supplierDoc = await getDoc(supplierRef);
            if (supplierDoc.exists()) {
                const supplier = supplierDoc.data();
                const newBalance = (supplier.balance || 0) + (totalAmount - (invoiceData.amountPaid || 0));
                batch.update(supplierRef, { balance: newBalance });
            }
        
            if (invoiceData.purchaseOrderId) {
                const poRef = doc(firestore, `users/${dataUserId}/purchaseOrders/${invoiceData.purchaseOrderId}`);
                batch.update(poRef, { status: 'completed' });
            }
        
            await batch.commit();

        } catch(error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${dataUserId}/supplierInvoices`, operation: 'write', requestResourceData: { invoice: invoiceData } }));
            throw error;
        };
    }, [firestore, dataUserId, products]);

    const addPurchaseOrder = useCallback(async (poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/purchaseOrders`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        
        const now = new Date().toISOString();
        const newPOData: Omit<PurchaseOrder, 'id'> = {
            ...poData,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };

        await addDoc(collectionRef, newPOData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newPOData }));
            throw error;
        });

    }, [firestore, dataUserId]);
    
    const updatePurchaseOrder = useCallback(async (poId: string, poData: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/purchaseOrders`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");

        const poRef = doc(collectionRef, poId);
        const dataToUpdate = {
            ...poData,
            updatedAt: new Date().toISOString(),
        };

        return updateDoc(poRef, dataToUpdate).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: poRef.path, operation: 'update', requestResourceData: dataToUpdate }));
            throw error;
        });
    }, [firestore, dataUserId]);

    const deletePurchaseOrder = useCallback(async (poId: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/purchaseOrders`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");

        const poRef = doc(collectionRef, poId);
        
        return deleteDoc(poRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: poRef.path, operation: 'delete' }));
            throw error;
        });
    }, [firestore, dataUserId]);

    const makePaymentToSupplier = useCallback(async (supplierId: string, amount: number) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        
        const batch = writeBatch(firestore);

        const invoiceCollectionRef = collection(firestore, `users/${dataUserId}/supplierInvoices`);
        const paymentRef = doc(invoiceCollectionRef);
        const paymentRecord: Omit<SupplierInvoice, 'id'> = { 
            supplierId, 
            date: new Date().toISOString(), 
            items: [], 
            totalAmount: amount, 
            isPayment: true, 
            amountPaid: amount 
        };
        batch.set(paymentRef, paymentRecord);
        
        const supplierRef = doc(firestore, `users/${dataUserId}/suppliers/${supplierId}`);
        const supplierDoc = await getDoc(supplierRef);
        if(supplierDoc.exists()) {
            const currentBalance = supplierDoc.data().balance || 0;
            batch.update(supplierRef, { balance: currentBalance - amount });
        }

        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { supplierPayment: { supplierId, amount } } }));
            throw error;
        });
    }, [firestore, dataUserId]);

    const addExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/expenses`);
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        const newExpenseData = { ...expenseData, createdAt: serverTimestamp() };
        await addDoc(collectionRef, newExpenseData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newExpenseData }));
        });
    }, [firestore, dataUserId]);

    const updateExpense = useCallback(async (expenseId: string, expenseData: Partial<Expense>) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/expenses`);
        if (!collectionRef) return;
        const docRef = doc(collectionRef, expenseId);
        await updateDoc(docRef, expenseData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: expenseData }));
        });
    }, [firestore, dataUserId]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        const collectionRef = collection(firestore, `users/${dataUserId}/expenses`);
        if (!collectionRef) return;
        const docRef = doc(collectionRef, expenseId);
        await deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.expenses.expenseDeleted });
    }, [firestore, dataUserId, t, toast]);
    
    const addPendingUser = useCallback(async (email: string, password: string, name: string) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const functions = getFunctions();
        const createPendingUser = httpsCallable(functions, 'createPendingUser');
        await createPendingUser({ email, password, name });
    }, [firestore]);


    const approveUser = useCallback(async (userId: string) => {
        const functions = getFunctions();
        const approve = httpsCallable(functions, 'approveUser');
        await approve({ userId });
    }, []);

    const revokeUser = useCallback(async (userId: string) => {
        const functions = getFunctions();
        const revoke = httpsCallable(functions, 'revokeUser');
        await revoke({ userId });
    }, []);

    const updateUserProfile = useCallback(async (userId: string, profileData: Partial<UserProfile>) => {
        const docRef = doc(firestore, 'userProfiles', userId);
        return updateDoc(docRef, profileData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: profileData }));
            throw error;
        });
    }, [firestore]);
    
    const updateUserSubscription = useCallback(async (userId: string, subscriptionEndsAt: string | null) => {
        if (!firestore) throw new Error("User not authenticated or data path not available.");
        const userProfileRef = doc(firestore, 'userProfiles', userId);
        
        await updateDoc(userProfileRef, { subscriptionEndsAt }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userProfileRef.path, operation: 'update', requestResourceData: { subscriptionEndsAt } }));
            throw error;
        });
    }, [firestore]);

    const restoreData = useCallback(async (data: any) => {
        if (!dataUserId || !firestore) {
            throw new Error("User not authenticated.");
        }
        const batch = writeBatch(firestore);

        const collections = ['products', 'customers', 'sales', 'bakeryOrders', 'suppliers', 'supplierInvoices', 'expenses', 'purchaseOrders'];

        for (const collectionName of collections) {
            if (data[collectionName] && Array.isArray(data[collectionName])) {
                const ref = collection(firestore, `users/${dataUserId}/${collectionName}`);
                const currentCollectionQuery = query(ref);
                const currentDocsSnapshot = await getDocs(currentCollectionQuery);
                currentDocsSnapshot.forEach(doc => batch.delete(doc.ref));

                for (const item of data[collectionName]) {
                    const { id, ...rest } = item;
                    const docRef = id ? doc(ref, id) : doc(ref);
                    batch.set(docRef, rest);
                }
            }
        }

        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { restoreData: true } }));
            throw error;
        });
    }, [dataUserId, firestore]);

    const contextValue: DataContextType = {
        products: products || [],
        customers: customers || [],
        salesHistory: salesHistory || [],
        bakeryOrders: bakeryOrders || [],
        suppliers: suppliers || [],
        supplierInvoices: supplierInvoices || [],
        purchaseOrders: purchaseOrders || [],
        expenses: expenses || [],
        userProfiles: userProfiles || [],
        userProfile: authUserProfile,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSaleRecord,
        makePayment,
        addBakeryOrder,
        updateBakeryOrder,
        deleteBakeryOrder,
        deleteRecurringPattern,
        setAsRecurringTemplate,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierInvoice,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        makePaymentToSupplier,
        addExpense,
        updateExpense,
        deleteExpense,
        addPendingUser,
        approveUser,
        revokeUser,
        updateUserProfile,
        updateUserSubscription,
        restoreData,
    };

    return (
      <DataContext.Provider value={contextValue}>
        {children}
      </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

    

    

