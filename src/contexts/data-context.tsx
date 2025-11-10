

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import type { Product, Customer, CartItem, SaleRecord, BakeryOrder, Supplier, SupplierInvoiceItem, PurchaseOrder, Expense, UserProfile, ProductFormData } from '@/lib/data';
import {
    useUser,
    useFirestore,
    useCollection,
    useMemoFirebase,
    useDoc,
    getSdks,
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
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';
import { calculateUpdatedProductsForInvoice, WithId } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getFunctions, httpsCallable } from 'firebase/functions';


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
    addProduct: (productData: ProductFormData) => Promise<WithId<Product>>;
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
    addSupplierInvoice: (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string; purchaseOrderId?: string; }) => Promise<void>;
    addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<WithId<PurchaseOrder>>;
    updatePurchaseOrder: (poId: string, poData: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>) => Promise<void>;
    deletePurchaseOrder: (poId: string) => Promise<void>;
    makePaymentToSupplier: (supplierId: string, amount: number) => Promise<void>;
    addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: string, expenseData: Partial<Omit<Expense, 'id'>>) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;
    addPendingUser: (email: string, password: string) => Promise<void>;
    approveUser: (userId: string) => Promise<void>;
    revokeUser: (userId: string) => Promise<void>;
    restoreData: (data: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const AdminDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const firestore = useFirestore();
  const { userProfile, setUserProfiles, setUserProfilesLoading } = useContext(DataContext)!;

  const userProfilesRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.isAdmin) return null;
    return collection(firestore, 'userProfiles');
  }, [firestore, userProfile?.isAdmin]);

  const { data: userProfilesData, isLoading: profilesLoading } = useCollection<UserProfile>(userProfilesRef);
  
  useEffect(() => {
    setUserProfiles(userProfilesData || []);
    setUserProfilesLoading(profilesLoading);
  }, [userProfilesData, profilesLoading, setUserProfiles, setUserProfilesLoading]);

  return <>{children}</>;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const { t } = useLanguage();
    const { user, userProfile: authUserProfile, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { firebaseApp } = useUser();

    const dataUserId = user?.uid;

    const getCollectionRef = useCallback((collectionName: string) => {
        if (!firestore || !dataUserId) return null;
        const path = `users/${dataUserId}/${collectionName}`;
        return collection(firestore, path) as CollectionReference;
    }, [firestore, dataUserId]);
    
    const productsRef = useMemoFirebase(() => getCollectionRef('products'), [getCollectionRef]);
    const customersRef = useMemoFirebase(() => getCollectionRef('customers'), [getCollectionRef]);
    const salesRef = useMemoFirebase(() => getCollectionRef('sales'), [getCollectionRef]);
    const bakeryOrdersRef = useMemoFirebase(() => getCollectionRef('bakeryOrders'), [getCollectionRef]);
    const suppliersRef = useMemoFirebase(() => getCollectionRef('suppliers'), [getCollectionRef]);
    const supplierInvoicesRef = useMemoFirebase(() => getCollectionRef('supplierInvoices'), [getCollectionRef]);
    const purchaseOrdersRef = useMemoFirebase(() => getCollectionRef('purchaseOrders'), [getCollectionRef]);
    const expensesRef = useMemoFirebase(() => getCollectionRef('expenses'), [getCollectionRef]);
    
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsRef);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersRef);
    const { data: salesHistory, isLoading: salesLoading } = useCollection<SaleRecord>(salesRef);
    const { data: bakeryOrders, isLoading: bakeryOrdersLoading } = useCollection<BakeryOrder>(bakeryOrdersRef);
    const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersRef);
    const { data: supplierInvoices, isLoading: supplierInvoicesLoading } = useCollection<SupplierInvoice>(supplierInvoicesRef);
    const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = useCollection<PurchaseOrder>(purchaseOrdersRef);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);
    
    const [userProfiles, setUserProfiles] = useState<WithId<UserProfile>[]>([]);
    const [userProfilesLoading, setUserProfilesLoading] = useState(true);

    const isLoadingAllData = isUserLoading || productsLoading || customersLoading || salesLoading || bakeryOrdersLoading || suppliersLoading || supplierInvoicesLoading || purchaseOrdersLoading || expensesLoading || userProfilesLoading;
    
    const contextValue = useMemo(() => ({
        products: products || [],
        customers: customers || [],
        salesHistory: salesHistory || [],
        bakeryOrders: bakeryOrders || [],
        suppliers: suppliers || [],
        supplierInvoices: supplierInvoices || [],
        purchaseOrders: purchaseOrders || [],
        expenses: expenses || [],
        userProfiles: userProfiles,
        userProfile: authUserProfile,
        isLoading: isLoadingAllData,
        setUserProfiles,
        setUserProfilesLoading
    }), [products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices, purchaseOrders, expenses, userProfiles, authUserProfile, isLoadingAllData]);
    
    const uploadImage = useCallback(async (file: File): Promise<string> => {
        if (!dataUserId || !firebaseApp) throw new Error("User not authenticated or Firebase app not available.");
        
        const storage = getStorage(firebaseApp);
        const filePath = `users/${dataUserId}/product_images/${Date.now()}-${file.name}`;
        const imageRef = storageRef(storage, filePath);
        
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);
        
        return downloadURL;
    }, [dataUserId, firebaseApp]);

    const addProduct = useCallback(async (productData: ProductFormData): Promise<WithId<Product>> => {
        const collectionRef = getCollectionRef('products');
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");

        const { imageFile, ...restOfProductData } = productData;
        let imageUrl = productData.imageUrl || null;

        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        }

        const sanitizedData: any = { ...restOfProductData, imageUrl };
        Object.keys(sanitizedData).forEach(key => {
            if (sanitizedData[key] === undefined) {
                sanitizedData[key] = null;
            }
        });

        const newProductData = {
            ...sanitizedData,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collectionRef, newProductData)
            .catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newProductData }));
                throw error;
            });
        
        return { id: docRef.id, ...restOfProductData, imageUrl };
    }, [getCollectionRef, uploadImage]);

    const updateProduct = useCallback(async (productId: string, productData: Partial<ProductFormData>) => {
        const collectionRef = getCollectionRef('products');
        if (!collectionRef) return;
        
        const { imageFile, ...restOfProductData } = productData;
        let imageUrl = productData.imageUrl;

        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        }

        const sanitizedData: any = { ...restOfProductData, imageUrl };
        Object.keys(sanitizedData).forEach(key => {
            if (sanitizedData[key] === undefined) {
                sanitizedData[key] = null;
            }
        });

        const docRef = doc(collectionRef, productId);
        await updateDoc(docRef, sanitizedData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: sanitizedData }));
        });
    }, [getCollectionRef, uploadImage]);

    const deleteProduct = useCallback(async (productId: string) => {
        const collectionRef = getCollectionRef('products');
        if (!collectionRef) return;
        if ((contextValue.salesHistory || []).some(sale => sale.items.some(item => item.id === productId)) || (contextValue.supplierInvoices || []).some(invoice => invoice.items.some(item => item.productId === productId))) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.products.deleteErrorInUse });
            return;
        }
        const docRef = doc(collectionRef, productId);
        deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.products.productDeleted });
    }, [getCollectionRef, contextValue.salesHistory, contextValue.supplierInvoices, t, toast]);
    
    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>): Promise<WithId<Customer>> => {
        const collectionRef = getCollectionRef('customers');
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
        return { id: docRef.id, ...newCustomerData, spent: 0, balance: 0 };
        
    }, [getCollectionRef]);
    
    const updateCustomer = useCallback(async (customerId: string, customerData: Partial<Customer>) => {
        const collectionRef = getCollectionRef('customers');
        if (!collectionRef) return;
        const docRef = doc(collectionRef, customerId);
        updateDoc(docRef, customerData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: customerData }));
        });
    }, [getCollectionRef]);

    const deleteCustomer = useCallback(async (customerId: string) => {
        const collectionRef = getCollectionRef('customers');
        if (!collectionRef) return;
        if ((contextValue.salesHistory || []).some(sale => sale.customerId === customerId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.customers.deleteErrorInUse });
            return;
        }
        const docRef = doc(collectionRef, customerId);
        deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.customers.customerDeleted });
    }, [getCollectionRef, contextValue.salesHistory, t, toast]);
    
    const addSaleRecord = useCallback(async (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        const batch = writeBatch(firestore);

        const salesCollectionRef = collection(firestore, `users/${dataUserId}/sales`);
        const saleRef = doc(salesCollectionRef);
        const newSale: Omit<SaleRecord, 'id'> = { 
            customerId, 
            items: cart, 
            totals, 
            date: new Date().toISOString() 
        };
        batch.set(saleRef, newSale);

        for (const item of cart) {
            const productRef = doc(firestore, `users/${dataUserId}/products/${item.id}`);
            const product = (contextValue.products || []).find(p => p.id === item.id);
            if (product) {
                if (product.stock < item.quantity) {
                    throw new Error(`Not enough stock for '${product.name}'.`);
                }
                batch.update(productRef, { stock: product.stock - item.quantity });
            }
        }

        if (customerId) {
            const customerRef = doc(firestore, `users/${dataUserId}/customers/${customerId}`);
            const customer = (contextValue.customers || []).find(c => c.id === customerId);
            if (customer) {
                const newSpent = customer.spent + totals.total;
                const newBalance = customer.balance + totals.balance;
                batch.update(customerRef, { spent: newSpent, balance: newBalance });
            }
        }
        
        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { cart, customerId, totals } }));
            throw error;
        });

    }, [firestore, dataUserId, contextValue.products, contextValue.customers]);
    
    const makePayment = useCallback(async (customerId: string, amount: number) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        const batch = writeBatch(firestore);

        const salesCollectionRef = collection(firestore, `users/${dataUserId}/sales`);
        const paymentRef = doc(salesCollectionRef);
        const paymentRecord: Omit<SaleRecord, 'id'>= { 
            customerId, 
            items: [], 
            totals: { subtotal: 0, discount: 0, total: amount, amountPaid: amount, balance: -amount }, 
            date: new Date().toISOString() 
        };
        batch.set(paymentRef, paymentRecord);

        const customerRef = doc(firestore, `users/${dataUserId}/customers/${customerId}`);
        const customer = (contextValue.customers || []).find(c => c.id === customerId);
        if (customer) {
            const newBalance = customer.balance - amount;
            batch.update(customerRef, { balance: newBalance });
        }

        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { payment: { customerId, amount } } }));
            throw error;
        });
    }, [firestore, dataUserId, contextValue.customers]);

    const addBakeryOrder = useCallback(async (orderData: Omit<BakeryOrder, 'id'>) => {
        const collectionRef = getCollectionRef('bakeryOrders');
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        const newOrderData = { ...orderData, createdAt: serverTimestamp() };
        addDoc(collectionRef, newOrderData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newOrderData }));
        });
    }, [getCollectionRef]);

    const updateBakeryOrder = useCallback(async (orderId: string, orderData: Partial<BakeryOrder>) => {
        const collectionRef = getCollectionRef('bakeryOrders');
        if (!collectionRef) return;
        const docRef = doc(collectionRef, orderId);
        updateDoc(docRef, orderData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: orderData }));
        });
    }, [getCollectionRef]);
    
    const deleteBakeryOrder = useCallback(async (orderId: string) => {
        const collectionRef = getCollectionRef('bakeryOrders');
        if (!collectionRef) return;
        const docRef = doc(collectionRef, orderId);
        deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
    }, [getCollectionRef]);

    const deleteRecurringPattern = useCallback(async (orderName: string) => {
        const collectionRef = getCollectionRef('bakeryOrders');
        if (!collectionRef || !firestore) throw new Error("User not authenticated or data path not available.");
        const q = query(collectionRef, where("name", "==", orderName), where("isRecurring", "==", true));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'delete', requestResourceData: { name: orderName, isRecurring: true } }));
            throw error;
        });
        toast({ title: t.bakeryOrders.patternDeleted });
    }, [getCollectionRef, firestore, t, toast]);

    const setAsRecurringTemplate = useCallback(async (templateId: string, isRecurring: boolean) => {
        const collectionRef = getCollectionRef('bakeryOrders');
        if (!collectionRef || !firestore) throw new Error("User not authenticated or data path not available.");
        
        const docRef = doc(collectionRef, templateId);
        const templateOrder = (contextValue.bakeryOrders || []).find(o => o.id === templateId);

        if (!templateOrder) return;

        const batch = writeBatch(firestore);
        batch.update(docRef, { isRecurring });

        if (isRecurring) {
            const q = query(collectionRef, where("name", "==", templateOrder.name), where("isRecurring", "==", true));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                if (doc.id !== templateId) {
                    batch.update(doc.ref, { isRecurring: false });
                }
            });
        }
        
        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { isRecurring } }));
            throw error;
        });
    }, [getCollectionRef, firestore, contextValue.bakeryOrders]);

    const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
        const collectionRef = getCollectionRef('suppliers');
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        const newSupplierData = { ...supplierData, balance: 0 };
        addDoc(collectionRef, newSupplierData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newSupplierData }));
        });
    }, [getCollectionRef]);

    const updateSupplier = useCallback(async (supplierId: string, supplierData: Partial<Supplier>) => {
        const collectionRef = getCollectionRef('suppliers');
        if (!collectionRef) return;
        const docRef = doc(collectionRef, supplierId);
        updateDoc(docRef, supplierData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: supplierData }));
        });
    }, [getCollectionRef]);

    const deleteSupplier = useCallback(async (supplierId: string) => {
        const collectionRef = getCollectionRef('suppliers');
        if (!collectionRef) return;
        if ((contextValue.supplierInvoices || []).some(invoice => invoice.supplierId === supplierId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.suppliers.deleteErrorInUse });
            return;
        }
        const docRef = doc(collectionRef, supplierId);
        deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.suppliers.supplierDeleted });
    }, [getCollectionRef, contextValue.supplierInvoices, t, toast]);
    
    const addSupplierInvoice = useCallback(async (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string; purchaseOrderId?: string; }) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        const batch = writeBatch(firestore);
        
        const totalAmount = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
        const invoiceRef = doc(collection(firestore, `users/${dataUserId}/supplierInvoices`));
        const newInvoice: Omit<SupplierInvoice, 'id'> = { date: new Date().toISOString(), isPayment: false, totalAmount, ...invoiceData };
        batch.set(invoiceRef, newInvoice);

        const updatedProducts = calculateUpdatedProductsForInvoice((contextValue.products || []), invoiceData.items, invoiceData.priceUpdateStrategy as 'master' | 'average' | 'none');
        invoiceData.items.forEach(item => {
            const productRef = doc(firestore, `users/${dataUserId}/products/${item.productId}`);
            const updatedProductData = updatedProducts.find(p => p.id === item.productId);
            if(updatedProductData) {
                batch.update(productRef, {
                    stock: updatedProductData.stock,
                    purchasePrice: updatedProductData.purchasePrice,
                });
            }
        });

        const supplierRef = doc(firestore, `users/${dataUserId}/suppliers/${invoiceData.supplierId}`);
        const supplier = (contextValue.suppliers || []).find(s => s.id === invoiceData.supplierId);
        if (supplier) {
            const newBalance = (supplier.balance || 0) + (totalAmount - (invoiceData.amountPaid || 0));
            batch.update(supplierRef, { balance: newBalance });
        }

        if (invoiceData.purchaseOrderId) {
            const poRef = doc(firestore, `users/${dataUserId}/purchaseOrders/${invoiceData.purchaseOrderId}`);
            batch.update(poRef, { status: 'completed' });
        }
        
        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { invoice: invoiceData } }));
            throw error;
        });
    }, [firestore, dataUserId, contextValue.products, contextValue.suppliers]);

    const addPurchaseOrder = useCallback(async (poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WithId<PurchaseOrder>> => {
        const collectionRef = getCollectionRef('purchaseOrders');
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        
        const now = new Date().toISOString();
        const newPOData: Omit<PurchaseOrder, 'id'> = {
            ...poData,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(collectionRef, newPOData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newPOData }));
            throw error;
        });

        return { id: docRef.id, ...newPOData };
    }, [getCollectionRef]);
    
    const updatePurchaseOrder = useCallback(async (poId: string, poData: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>) => {
        const collectionRef = getCollectionRef('purchaseOrders');
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
    }, [getCollectionRef]);

    const deletePurchaseOrder = useCallback(async (poId: string) => {
        const collectionRef = getCollectionRef('purchaseOrders');
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");

        const poRef = doc(collectionRef, poId);
        
        return deleteDoc(poRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: poRef.path, operation: 'delete' }));
            throw error;
        });
    }, [getCollectionRef]);

    const makePaymentToSupplier = useCallback(async (supplierId: string, amount: number) => {
        if (!firestore || !dataUserId) throw new Error("User not authenticated or data path not available.");
        const batch = writeBatch(firestore);

        const paymentRef = doc(collection(firestore, `users/${dataUserId}/supplierInvoices`));
        const paymentRecord: Omit<SupplierInvoice, 'id'> = { supplierId, date: new Date().toISOString(), items: [], totalAmount: amount, isPayment: true, amountPaid: amount };
        batch.set(paymentRef, paymentRecord);
        
        const supplierRef = doc(firestore, `users/${dataUserId}/suppliers/${supplierId}`);
        const supplier = (contextValue.suppliers || []).find(s => s.id === supplierId);
        if(supplier) {
            batch.update(supplierRef, { balance: supplier.balance - amount });
        }

        await batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `/users/${dataUserId}`, operation: 'write', requestResourceData: { supplierPayment: { supplierId, amount } } }));
            throw error;
        });
    }, [firestore, dataUserId, contextValue.suppliers]);

    const addExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => {
        const collectionRef = getCollectionRef('expenses');
        if (!collectionRef) throw new Error("User not authenticated or data path not available.");
        const newExpenseData = { ...expenseData, createdAt: serverTimestamp() };
        addDoc(collectionRef, newExpenseData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: newExpenseData }));
        });
    }, [getCollectionRef]);

    const updateExpense = useCallback(async (expenseId: string, expenseData: Partial<Expense>) => {
        const collectionRef = getCollectionRef('expenses');
        if (!collectionRef) return;
        const docRef = doc(collectionRef, expenseId);
        updateDoc(docRef, expenseData).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: expenseData }));
        });
    }, [getCollectionRef]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        const collectionRef = getCollectionRef('expenses');
        if (!collectionRef) return;
        const docRef = doc(collectionRef, expenseId);
        deleteDoc(docRef).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
        toast({ title: t.expenses.expenseDeleted });
    }, [getCollectionRef, t, toast]);
    
    const addPendingUser = useCallback(async (email: string, password: string) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const functions = getFunctions();
        const createPendingUser = httpsCallable(functions, 'createPendingUser');
        await createPendingUser({ email, password });
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

    const fullContext = useMemo(() => ({
        ...contextValue,
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
        restoreData,
    }), [
        contextValue,
        addProduct, updateProduct, deleteProduct,
        addCustomer, updateCustomer, deleteCustomer,
        addSaleRecord, makePayment,
        addBakeryOrder, updateBakeryOrder, deleteBakeryOrder, deleteRecurringPattern, setAsRecurringTemplate,
        addSupplier, updateSupplier, deleteSupplier, addSupplierInvoice, makePaymentToSupplier,
        addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
        addExpense, updateExpense, deleteExpense,
        addPendingUser, approveUser, revokeUser, restoreData
    ]);

    return (
      <DataContext.Provider value={fullContext}>
        <AdminDataProvider>
          {children}
        </AdminDataProvider>
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
