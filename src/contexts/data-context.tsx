'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
    type Product,
    type Customer,
    type SaleRecord,
    type CartItem,
    type BakeryOrder,
    type Supplier,
    type SupplierInvoice,
    type SupplierInvoiceItem,
} from '@/lib/data';
import {
    getProducts,
    getCustomers,
    getSalesHistory,
    getBakeryOrders,
    getSuppliers,
    getSupplierInvoices,
    restoreBackupData,
    addProductInDB,
    updateProductInDB,
    deleteProductInDB,
    addCustomerInDB,
    updateCustomerInDB,
    deleteCustomerInDB,
    processSale,
    processPayment,
    addBakeryOrderInDB,
    updateBakeryOrderInDB,
    deleteBakeryOrderInDB,
    saveBakeryOrders,
    addSupplierInDB,
    updateSupplierInDB,
    deleteSupplierInDB,
    processSupplierInvoice,
    processSupplierPayment,
    setRecurringStatusForOrderNameInDB,
} from '@/lib/data-actions';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';

interface DataContextType {
    products: Product[];
    customers: Customer[];
    salesHistory: SaleRecord[];
    bakeryOrders: BakeryOrder[];
    suppliers: Supplier[];
    supplierInvoices: SupplierInvoice[];
    isLoading: boolean;
    addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
    updateProduct: (productId: string, productData: Partial<Omit<Product, 'id'>>) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => Promise<void>;
    updateCustomer: (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => Promise<void>;
    makePayment: (customerId: string, amount: number) => Promise<void>;
    restoreData: (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[]; bakeryOrders: BakeryOrder[]; suppliers: Supplier[]; supplierInvoices: SupplierInvoice[] }) => Promise<void>;
    addBakeryOrder: (orderData: Omit<BakeryOrder, 'id'>) => Promise<void>;
    updateBakeryOrder: (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => Promise<void>;
    deleteBakeryOrder: (orderId: string) => Promise<void>;
    setBakeryOrders: (orders: BakeryOrder[]) => Promise<void>;
    setRecurringStatusForOrderName: (orderName: string, isRecurring: boolean) => Promise<void>;
    addSupplier: (supplierData: Omit<Supplier, 'id' | 'balance'>) => Promise<void>;
    updateSupplier: (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addSupplierInvoice: (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; updateMasterPrices: boolean }) => Promise<void>;
    makePaymentToSupplier: (supplierId: string, amount: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
    const [bakeryOrders, setBakeryOrdersState] = useState<BakeryOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const syncData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [loadedProducts, loadedCustomers, loadedSalesHistory, loadedBakeryOrders, loadedSuppliers, loadedSupplierInvoices] = await Promise.all([
                getProducts(),
                getCustomers(),
                getSalesHistory(),
                getBakeryOrders(),
                getSuppliers(),
                getSupplierInvoices(),
            ]);
            setProducts(loadedProducts);
            setCustomers(loadedCustomers);
            setSalesHistory(loadedSalesHistory);
            setBakeryOrdersState(loadedBakeryOrders);
            setSuppliers(loadedSuppliers);
            setSupplierInvoices(loadedSupplierInvoices);
        } catch (error) {
            console.error("Failed to sync data:", error);
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: "Could not load application data."
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, t]);

    // Initial data load
    useEffect(() => {
        syncData();
    }, [syncData]);

    const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
        if (productData.barcodes && productData.barcodes.length > 0) {
            const allBarcodes = new Set(products.flatMap(p => p.barcodes));
            const duplicate = productData.barcodes.find(b => allBarcodes.has(b));
            if (duplicate) {
                const errorMsg = t.products.barcodeExists.replace('{barcode}', duplicate);
                toast({ variant: 'destructive', title: t.errors.title, description: errorMsg });
                throw new Error(errorMsg);
            }
        }

        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
        };
        await addProductInDB(newProduct);
        setProducts(prev => [...prev, newProduct]);
        return newProduct;
    };

    const updateProduct = async (productId: string, productData: Partial<Omit<Product, 'id'>>) => {
        if (productData.barcodes && productData.barcodes.length > 0) {
            const allOtherBarcodes = new Set(products.filter(p => p.id !== productId).flatMap(p => p.barcodes));
            const duplicate = productData.barcodes.find(b => allOtherBarcodes.has(b));
            if (duplicate) {
                const errorMsg = t.products.barcodeExists.replace('{barcode}', duplicate);
                toast({ variant: 'destructive', title: t.errors.title, description: errorMsg });
                throw new Error(errorMsg);
            }
        }
        await updateProductInDB(productId, productData);
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...productData } : p));
    };

    const deleteProduct = async (productId: string) => {
        const isProductInSales = salesHistory.some(sale => sale.items.some(item => item.id === productId));
        if (isProductInSales) {
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: t.products.deleteErrorInUse,
            });
            return;
        }

        const isProductInSupplierInvoices = supplierInvoices.some(invoice => invoice.items.some(item => item.productId === productId));
        if (isProductInSupplierInvoices) {
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: t.products.deleteErrorInUse,
            });
            return;
        }

        await deleteProductInDB(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast({ title: t.products.productDeleted });
    };

    const addCustomer = async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const newCustomer: Customer = {
            id: `cust-${new Date().getTime()}`,
            spent: 0,
            balance: 0,
            ...customerData,
        };
        await addCustomerInDB(newCustomer);
        setCustomers(prev => [...prev, newCustomer]);
    };
    
    const updateCustomer = async (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => {
        await updateCustomerInDB(customerId, customerData);
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...customerData } : c));
    };

    const deleteCustomer = async (customerId: string) => {
        const isCustomerInSales = salesHistory.some(sale => sale.customerId === customerId);
        if (isCustomerInSales) {
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: t.customers.deleteErrorInUse,
            });
            return;
        }
        await deleteCustomerInDB(customerId);
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        toast({ title: t.customers.customerDeleted });
    };
    
    const addSaleRecord = async (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        const newSale: SaleRecord = {
            id: `SALE-${new Date().getTime()}`,
            customerId: customerId,
            items: cart,
            totals: totals,
            date: new Date().toISOString(),
        };
        
        try {
            await processSale({ saleRecord: newSale, cart });
            // Manual state updates instead of syncData()
            setProducts(prevProducts => {
                const newProducts = JSON.parse(JSON.stringify(prevProducts));
                cart.forEach(item => {
                    const productIndex = newProducts.findIndex((p: Product) => p.id === item.id);
                    if (productIndex > -1) {
                        newProducts[productIndex].stock -= item.quantity;
                    }
                });
                return newProducts;
            });

            if (customerId) {
                setCustomers(prevCustomers => 
                    prevCustomers.map(c => 
                        c.id === customerId 
                        ? { ...c, spent: c.spent + totals.total, balance: c.balance + totals.balance }
                        : c
                    )
                );
            }
            setSalesHistory(prevHistory => [...prevHistory, newSale]);
        } catch (error) {
            console.error("Sale completion failed:", error);
            throw error; // Re-throw to be handled by the UI component
        }
    };
    
    const makePayment = async (customerId: string, amount: number) => {
        const paymentRecord: SaleRecord = {
            id: `PAY-${new Date().getTime()}`,
            customerId: customerId,
            items: [],
            totals: {
                subtotal: 0,
                discount: 0,
                total: amount,
                amountPaid: amount,
                balance: -amount,
            },
            date: new Date().toISOString(),
        };

        try {
            await processPayment({ customerId, amount, paymentRecord });
            setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, balance: c.balance - amount } : c));
            setSalesHistory(prev => [...prev, paymentRecord]);
        } catch (error) {
             console.error("Failed to process payment:", error);
             toast({
                variant: 'destructive',
                title: "Save Error",
                description: "Could not save payment data.",
             });
        }
    };

    const addBakeryOrder = async (orderData: Omit<BakeryOrder, 'id'>) => {
        const newOrder: BakeryOrder = {
            id: `b-order-${new Date().getTime()}`,
            ...orderData,
        };
        await addBakeryOrderInDB(newOrder);
        setBakeryOrdersState(prev => [...prev, newOrder]);
    };

    const updateBakeryOrder = async (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => {
        await updateBakeryOrderInDB(orderId, orderData);
        setBakeryOrdersState(prev => prev.map(o => o.id === orderId ? { ...o, ...orderData } : o));
    };
    
    const deleteBakeryOrder = async (orderId: string) => {
        await deleteBakeryOrderInDB(orderId);
        setBakeryOrdersState(prev => prev.filter(o => o.id !== orderId));
    };

    const setBakeryOrders = async (orders: BakeryOrder[]) => {
       await saveBakeryOrders(orders);
       setBakeryOrdersState(orders);
    }

    const setRecurringStatusForOrderName = async (orderName: string, isRecurring: boolean) => {
        await setRecurringStatusForOrderNameInDB(orderName, isRecurring);
        setBakeryOrdersState(prev => prev.map(o => o.name === orderName ? { ...o, isRecurring } : o));
    };

    const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
        const newSupplier: Supplier = {
            id: `supp-${new Date().getTime()}`,
            balance: 0,
            ...supplierData,
        };
        await addSupplierInDB(newSupplier);
        setSuppliers(prev => [...prev, newSupplier]);
    };

    const updateSupplier = async (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => {
        await updateSupplierInDB(supplierId, supplierData);
        setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, ...supplierData } : s));
    };

    const deleteSupplier = async (supplierId: string) => {
        const isSupplierInUse = supplierInvoices.some(invoice => invoice.supplierId === supplierId);
        if (isSupplierInUse) {
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: t.suppliers.deleteErrorInUse,
            });
            return;
        }

        await deleteSupplierInDB(supplierId);
        setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        toast({ title: t.suppliers.supplierDeleted });
    };
    
    const addSupplierInvoice = async (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; updateMasterPrices: boolean }) => {
        const totalAmount = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
        const newInvoice: SupplierInvoice = {
            id: `SINV-${new Date().getTime()}`,
            date: new Date().toISOString(),
            isPayment: false,
            totalAmount,
            ...invoiceData,
        };

        try {
            await processSupplierInvoice({ invoice: newInvoice, updateMasterPrices: invoiceData.updateMasterPrices });
            
            // State updates
            await syncData(); // Temporarily using syncData for this complex transaction. For a full optimization, this would be manual too.
            
        } catch (error) {
            console.error("Failed to process supplier invoice:", error);
            toast({
                variant: 'destructive',
                title: "Save Error",
                description: "Could not save supplier invoice.",
            });
        }
    };
    
    const makePaymentToSupplier = async (supplierId: string, amount: number) => {
        const paymentRecord: SupplierInvoice = {
            id: `SPAY-${new Date().getTime()}`,
            supplierId: supplierId,
            date: new Date().toISOString(),
            items: [],
            totalAmount: amount,
            isPayment: true,
            amountPaid: amount,
        };
        try {
            await processSupplierPayment({ paymentRecord });
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, balance: s.balance - amount } : s));
            setSupplierInvoices(prev => [...prev, paymentRecord]);
        } catch (error) {
            console.error("Failed to process supplier payment:", error);
            toast({
                variant: 'destructive',
                title: "Save Error",
                description: "Could not save supplier payment.",
            });
        }
    };

    const restoreData = async (data: any) => {
        setIsLoading(true);
        try {
            await restoreBackupData(data);
            await syncData();
        } catch(error) {
            console.error("Failed to restore data:", error);
            throw error; 
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        products,
        customers,
        salesHistory,
        bakeryOrders,
        suppliers,
        supplierInvoices,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSaleRecord,
        makePayment,
        restoreData,
        addBakeryOrder,
        updateBakeryOrder,
        deleteBakeryOrder,
        setBakeryOrders,
        setRecurringStatusForOrderName,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierInvoice,
        makePaymentToSupplier,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
