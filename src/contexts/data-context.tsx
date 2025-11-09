'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import {
    useUser,
    useFirestore,
    useCollection,
    useMemoFirebase,
} from '@/firebase';
import {
    collection,
    doc,
    writeBatch,
    serverTimestamp,
    query,
    where,
    getDocs,
    CollectionReference,
} from 'firebase/firestore';
import type { 
    Product,
    Customer,
    SaleRecord,
    CartItem,
    BakeryOrder,
    Supplier,
    SupplierInvoice,
    SupplierInvoiceItem,
    Expense,
} from '@/lib/data';

import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';
import { calculateUpdatedProductsForInvoice, WithId } from '@/lib/utils';
import {
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


interface DataContextType {
    products: WithId<Product>[];
    customers: WithId<Customer>[];
    salesHistory: WithId<SaleRecord>[];
    bakeryOrders: WithId<BakeryOrder>[];
    suppliers: WithId<Supplier>[];
    supplierInvoices: WithId<SupplierInvoice>[];
    expenses: WithId<Expense>[];
    isLoading: boolean;
    addProduct: (productData: Omit<Product, 'id'>) => Promise<WithId<Product>>;
    updateProduct: (productId: string, productData: Partial<Omit<Product, 'id'>>) => Promise<void>;
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
    addSupplierInvoice: (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string }) => Promise<void>;
    makePaymentToSupplier: (supplierId: string, amount: number) => Promise<void>;
    addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: string, expenseData: Partial<Omit<Expense, 'id'>>) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;
    restoreData: (data: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const { t } = useLanguage();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const getCollectionRef = useCallback((collectionName: string) => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, collectionName) as CollectionReference;
    }, [firestore, user]);

    const productsRef = useMemoFirebase(() => getCollectionRef('products'), [getCollectionRef]);
    const customersRef = useMemoFirebase(() => getCollectionRef('customers'), [getCollectionRef]);
    const salesRef = useMemoFirebase(() => getCollectionRef('sales'), [getCollectionRef]);
    const bakeryOrdersRef = useMemoFirebase(() => getCollectionRef('bakeryOrders'), [getCollectionRef]);
    const suppliersRef = useMemoFirebase(() => getCollectionRef('suppliers'), [getCollectionRef]);
    const supplierInvoicesRef = useMemoFirebase(() => getCollectionRef('supplierInvoices'), [getCollectionRef]);
    const expensesRef = useMemoFirebase(() => getCollectionRef('expenses'), [getCollectionRef]);

    const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsRef);
    const { data: customersData, isLoading: customersLoading } = useCollection<Customer>(customersRef);
    const { data: salesHistoryData, isLoading: salesLoading } = useCollection<SaleRecord>(salesRef);
    const { data: bakeryOrdersData, isLoading: bakeryOrdersLoading } = useCollection<BakeryOrder>(bakeryOrdersRef);
    const { data: suppliersData, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersRef);
    const { data: supplierInvoicesData, isLoading: supplierInvoicesLoading } = useCollection<SupplierInvoice>(supplierInvoicesRef);
    const { data: expensesData, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);

    const products = useMemo(() => productsData || [], [productsData]);
    const customers = useMemo(() => customersData || [], [customersData]);
    const salesHistory = useMemo(() => salesHistoryData || [], [salesHistoryData]);
    const bakeryOrders = useMemo(() => bakeryOrdersData || [], [bakeryOrdersData]);
    const suppliers = useMemo(() => suppliersData || [], [suppliersData]);
    const supplierInvoices = useMemo(() => supplierInvoicesData || [], [supplierInvoicesData]);
    const expenses = useMemo(() => expensesData || [], [expensesData]);

    const isLoading = isUserLoading || productsLoading || customersLoading || salesLoading || bakeryOrdersLoading || suppliersLoading || supplierInvoicesLoading || expensesLoading;

    const addProduct = useCallback(async (productData: Omit<Product, 'id'>): Promise<WithId<Product>> => {
        const collectionRef = getCollectionRef('products');
        if (!collectionRef) throw new Error("User not authenticated.");

        const newProductData = {
            ...productData,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDocumentNonBlocking(collectionRef, newProductData);
        return { id: docRef.id, ...productData };
    }, [getCollectionRef]);

    const updateProduct = useCallback(async (productId: string, productData: Partial<Product>) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/products/${productId}`);
        updateDocumentNonBlocking(docRef, productData);
    }, [firestore, user]);

    const deleteProduct = useCallback(async (productId: string) => {
        if (!user) return;
        if (salesHistory.some(sale => sale.items.some(item => item.id === productId)) || supplierInvoices.some(invoice => invoice.items.some(item => item.productId === productId))) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.products.deleteErrorInUse });
            return;
        }
        const docRef = doc(firestore, `users/${user.uid}/products/${productId}`);
        deleteDocumentNonBlocking(docRef);
        toast({ title: t.products.productDeleted });
    }, [firestore, user, salesHistory, supplierInvoices, t.errors.title, t.products.deleteErrorInUse, t.products.productDeleted, toast]);
    
    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>): Promise<WithId<Customer>> => {
        const collectionRef = getCollectionRef('customers');
        if (!collectionRef) throw new Error("User not authenticated.");

        const newCustomerData: Omit<Customer, 'id'> = {
            ...customerData,
            spent: 0,
            balance: 0,
        };
        const docRef = await addDocumentNonBlocking(collectionRef, newCustomerData);
        return { id: docRef.id, ...newCustomerData, spent: 0, balance: 0 };
    }, [getCollectionRef]);
    
    const updateCustomer = useCallback(async (customerId: string, customerData: Partial<Customer>) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/customers/${customerId}`);
        updateDocumentNonBlocking(docRef, customerData);
    }, [firestore, user]);

    const deleteCustomer = useCallback(async (customerId: string) => {
        if (!user) return;
        if (salesHistory.some(sale => sale.customerId === customerId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.customers.deleteErrorInUse });
            return;
        }
        const docRef = doc(firestore, `users/${user.uid}/customers/${customerId}`);
        deleteDocumentNonBlocking(docRef);
        toast({ title: t.customers.customerDeleted });
    }, [firestore, user, salesHistory, t.errors.title, t.customers.deleteErrorInUse, t.customers.customerDeleted, toast]);
    
    const addSaleRecord = useCallback(async (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        if (!user) throw new Error("User not authenticated.");
        const batch = writeBatch(firestore);

        const saleRef = doc(collection(firestore, `users/${user.uid}/sales`));
        const newSale: Omit<SaleRecord, 'id'> = { 
            customerId, 
            items: cart, 
            totals, 
            date: new Date().toISOString() 
        };
        batch.set(saleRef, newSale);

        for (const item of cart) {
            const productRef = doc(firestore, `users/${user.uid}/products/${item.id}`);
            const product = products.find(p => p.id === item.id);
            if (product) {
                if (product.stock < item.quantity) {
                    throw new Error(`Not enough stock for '${product.name}'.`);
                }
                batch.update(productRef, { stock: product.stock - item.quantity });
            }
        }

        if (customerId) {
            const customerRef = doc(firestore, `users/${user.uid}/customers/${customerId}`);
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                const newSpent = customer.spent + totals.total;
                const newBalance = customer.balance + totals.balance;
                batch.update(customerRef, { spent: newSpent, balance: newBalance });
            }
        }
        
        await batch.commit();

    }, [user, firestore, products, customers]);
    
    const makePayment = useCallback(async (customerId: string, amount: number) => {
        if (!user) throw new Error("User not authenticated.");
        const batch = writeBatch(firestore);

        const paymentRef = doc(collection(firestore, `users/${user.uid}/sales`));
        const paymentRecord: Omit<SaleRecord, 'id'>= { 
            customerId, 
            items: [], 
            totals: { subtotal: 0, discount: 0, total: amount, amountPaid: amount, balance: -amount }, 
            date: new Date().toISOString() 
        };
        batch.set(paymentRef, paymentRecord);

        const customerRef = doc(firestore, `users/${user.uid}/customers/${customerId}`);
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            const newBalance = customer.balance - amount;
            batch.update(customerRef, { balance: newBalance });
        }

        await batch.commit();
    }, [user, firestore, customers]);

    const addBakeryOrder = useCallback(async (orderData: Omit<BakeryOrder, 'id'>) => {
        const collectionRef = getCollectionRef('bakeryOrders');
        if (!collectionRef) throw new Error("User not authenticated.");
        addDocumentNonBlocking(collectionRef, { ...orderData, createdAt: serverTimestamp() });
    }, [getCollectionRef]);

    const updateBakeryOrder = useCallback(async (orderId: string, orderData: Partial<BakeryOrder>) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/bakeryOrders/${orderId}`);
        updateDocumentNonBlocking(docRef, orderData);
    }, [firestore, user]);
    
    const deleteBakeryOrder = useCallback(async (orderId: string) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/bakeryOrders/${orderId}`);
        deleteDocumentNonBlocking(docRef);
    }, [firestore, user]);

    const deleteRecurringPattern = useCallback(async (orderName: string) => {
        if (!user) throw new Error("User not authenticated.");
        const q = query(collection(firestore, `users/${user.uid}/bakeryOrders`), where("name", "==", orderName), where("isRecurring", "==", true));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        toast({ title: t.bakeryOrders.patternDeleted });
    }, [user, firestore, t, toast]);

    const setAsRecurringTemplate = useCallback(async (templateId: string, isRecurring: boolean) => {
        if (!user) throw new Error("User not authenticated.");
        const docRef = doc(firestore, `users/${user.uid}/bakeryOrders/${templateId}`);
        const templateOrder = bakeryOrders.find(o => o.id === templateId);

        if (!templateOrder) return;

        const batch = writeBatch(firestore);
        batch.update(docRef, { isRecurring });

        if (isRecurring) {
            const q = query(collection(firestore, `users/${user.uid}/bakeryOrders`), where("name", "==", templateOrder.name), where("isRecurring", "==", true));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                if (doc.id !== templateId) {
                    batch.update(doc.ref, { isRecurring: false });
                }
            });
        }
        
        await batch.commit();
    }, [user, firestore, bakeryOrders]);

    const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
        const collectionRef = getCollectionRef('suppliers');
        if (!collectionRef) throw new Error("User not authenticated.");
        const newSupplierData = { ...supplierData, balance: 0 };
        addDocumentNonBlocking(collectionRef, newSupplierData);
    }, [getCollectionRef]);

    const updateSupplier = useCallback(async (supplierId: string, supplierData: Partial<Supplier>) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/suppliers/${supplierId}`);
        updateDocumentNonBlocking(docRef, supplierData);
    }, [firestore, user]);

    const deleteSupplier = useCallback(async (supplierId: string) => {
        if (!user) return;
        if (supplierInvoices.some(invoice => invoice.supplierId === supplierId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.suppliers.deleteErrorInUse });
            return;
        }
        const docRef = doc(firestore, `users/${user.uid}/suppliers/${supplierId}`);
        deleteDocumentNonBlocking(docRef);
        toast({ title: t.suppliers.supplierDeleted });
    }, [firestore, user, supplierInvoices, t, toast]);
    
    const addSupplierInvoice = useCallback(async (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string }) => {
        if (!user) throw new Error("User not authenticated.");
        const batch = writeBatch(firestore);
        
        const totalAmount = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
        const invoiceRef = doc(collection(firestore, `users/${user.uid}/supplierInvoices`));
        const newInvoice: Omit<SupplierInvoice, 'id'> = { date: new Date().toISOString(), isPayment: false, totalAmount, ...invoiceData };
        batch.set(invoiceRef, newInvoice);

        const updatedProducts = calculateUpdatedProductsForInvoice(products, invoiceData.items, invoiceData.priceUpdateStrategy as 'master' | 'average' | 'none');
        invoiceData.items.forEach(item => {
            const productRef = doc(firestore, `users/${user.uid}/products/${item.productId}`);
            const updatedProductData = updatedProducts.find(p => p.id === item.productId);
            if(updatedProductData) {
                batch.update(productRef, {
                    stock: updatedProductData.stock,
                    purchasePrice: updatedProductData.purchasePrice,
                });
            }
        });

        const supplierRef = doc(firestore, `users/${user.uid}/suppliers/${invoiceData.supplierId}`);
        const supplier = suppliers.find(s => s.id === invoiceData.supplierId);
        if (supplier) {
            const newBalance = (supplier.balance || 0) + (totalAmount - (invoiceData.amountPaid || 0));
            batch.update(supplierRef, { balance: newBalance });
        }
        
        await batch.commit();
    }, [user, firestore, products, suppliers]);
    
    const makePaymentToSupplier = useCallback(async (supplierId: string, amount: number) => {
        if (!user) throw new Error("User not authenticated.");
        const batch = writeBatch(firestore);

        const paymentRef = doc(collection(firestore, `users/${user.uid}/supplierInvoices`));
        const paymentRecord: Omit<SupplierInvoice, 'id'> = { supplierId, date: new Date().toISOString(), items: [], totalAmount: amount, isPayment: true, amountPaid: amount };
        batch.set(paymentRef, paymentRecord);
        
        const supplierRef = doc(firestore, `users/${user.uid}/suppliers/${supplierId}`);
        const supplier = suppliers.find(s => s.id === supplierId);
        if(supplier) {
            batch.update(supplierRef, { balance: supplier.balance - amount });
        }

        await batch.commit();
    }, [user, firestore, suppliers]);

    const addExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => {
        const collectionRef = getCollectionRef('expenses');
        if (!collectionRef) throw new Error("User not authenticated.");
        addDocumentNonBlocking(collectionRef, { ...expenseData, createdAt: serverTimestamp() });
    }, [getCollectionRef]);

    const updateExpense = useCallback(async (expenseId: string, expenseData: Partial<Expense>) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/expenses/${expenseId}`);
        updateDocumentNonBlocking(docRef, expenseData);
    }, [firestore, user]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        if (!user) return;
        const docRef = doc(firestore, `users/${user.uid}/expenses/${expenseId}`);
        deleteDocumentNonBlocking(docRef);
        toast({ title: t.expenses.expenseDeleted });
    }, [firestore, user, t, toast]);
    
    const restoreData = useCallback(async (data: any) => {
        if (!user) {
            throw new Error("User not authenticated.");
        }
        const batch = writeBatch(firestore);

        const collections = ['products', 'customers', 'salesHistory', 'bakeryOrders', 'suppliers', 'supplierInvoices', 'expenses'];

        for (const collectionName of collections) {
            if (data[collectionName] && Array.isArray(data[collectionName])) {
                const currentCollectionQuery = query(collection(firestore, `users/${user.uid}/${collectionName}`));
                const currentDocsSnapshot = await getDocs(currentCollectionQuery);
                currentDocsSnapshot.forEach(doc => batch.delete(doc.ref));

                for (const item of data[collectionName]) {
                    const { id, ...rest } = item;
                    const docRef = id ? doc(firestore, `users/${user.uid}/${collectionName}`, id) : doc(collection(firestore, `users/${user.uid}/${collectionName}`));
                    batch.set(docRef, rest);
                }
            }
        }

        await batch.commit();
    }, [user, firestore]);

    const value = useMemo(() => ({
        products,
        customers,
        salesHistory,
        bakeryOrders,
        suppliers,
        supplierInvoices,
        expenses,
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
        makePaymentToSupplier,
        addExpense,
        updateExpense,
        deleteExpense,
        restoreData,
    }), [
        products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices, expenses, isLoading,
        addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer,
        addSaleRecord, makePayment, addBakeryOrder, updateBakeryOrder, deleteBakeryOrder,
        deleteRecurringPattern, setAsRecurringTemplate, addSupplier, updateSupplier,
        deleteSupplier, addSupplierInvoice, makePaymentToSupplier, addExpense, updateExpense, deleteExpense,
        restoreData,
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
