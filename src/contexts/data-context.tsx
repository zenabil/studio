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
} from '@/lib/data-actions';
import { useToast } from '@/hooks/use-toast';
import { generateProductImage } from '@/ai/flows/generate-product-image-flow';
import { useLanguage } from './language-context';

interface DataContextType {
    products: Product[];
    customers: Customer[];
    salesHistory: SaleRecord[];
    bakeryOrders: BakeryOrder[];
    suppliers: Supplier[];
    supplierInvoices: SupplierInvoice[];
    isLoading: boolean;
    addProduct: (productData: Omit<Product, 'id' | 'imageUrl'>) => Promise<Product>;
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
    addSupplier: (supplierData: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (supplierId: string, supplierData: Partial<Omit<Supplier, 'id'>>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addSupplierInvoice: (invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>) => Promise<void>;
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

    const syncData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) {
            setIsLoading(true);
        }
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
            if (isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [toast, t]);

    // Initial data load
    useEffect(() => {
        syncData(true);
    }, [syncData]);

    const addProduct = async (productData: Omit<Product, 'id' | 'imageUrl'>): Promise<Product> => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
            imageUrl: '',
        };
        await addProductInDB(newProduct);
        await syncData();

        // Kick off image generation but don't wait for it to complete
        generateProductImage({ name: newProduct.name, category: newProduct.category })
            .then(async (imageUrl) => {
                if (imageUrl) {
                    await updateProductInDB(newProduct.id, { imageUrl });
                    await syncData(); // Sync again to show the new image
                }
            })
            .catch(error => {
                console.error("Failed to generate product image:", error);
                toast({
                    variant: 'destructive',
                    title: "Image Generation Failed",
                    description: "Could not generate an image for the product."
                });
            });
        
        return newProduct;
    };

    const updateProduct = async (productId: string, productData: Partial<Omit<Product, 'id'>>) => {
        const oldProduct = products.find(p => p.id === productId);
        await updateProductInDB(productId, productData);
        await syncData();
        
        const updatedProductData = { ...oldProduct, ...productData };
        
        if (oldProduct && (oldProduct.name !== updatedProductData.name || oldProduct.category !== updatedProductData.category)) {
             try {
                const imageUrl = await generateProductImage({ name: updatedProductData.name!, category: updatedProductData.category! });
                if (imageUrl) {
                    await updateProductInDB(productId, { imageUrl });
                    await syncData();
                }
            } catch (error) {
                console.error("Failed to generate product image:", error);
                toast({
                    variant: 'destructive',
                    title: "Image Generation Failed",
                    description: "Could not generate an image for the product."
                });
            }
        }
    };

    const deleteProduct = async (productId: string) => {
        await deleteProductInDB(productId);
        await syncData();
    };

    const addCustomer = async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const newCustomer: Customer = {
            id: `cust-${new Date().getTime()}`,
            spent: 0,
            balance: 0,
            ...customerData,
        };
        await addCustomerInDB(newCustomer);
        await syncData();
    };
    
    const updateCustomer = async (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => {
        await updateCustomerInDB(customerId, customerData);
        await syncData();
    };

    const deleteCustomer = async (customerId: string) => {
        await deleteCustomerInDB(customerId);
        await syncData();
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
            await syncData();
        } catch (error) {
            console.error("Failed to process sale:", error);
            toast({
                variant: 'destructive',
                title: "Save Error",
                description: "Could not save sale data.",
            });
        }
    };
    
    const makePayment = async (customerId: string, amount: number) => {
        try {
            await processPayment({ customerId, amount });
            await syncData();
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
        await syncData();
    };

    const updateBakeryOrder = async (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => {
        await updateBakeryOrderInDB(orderId, orderData);
        await syncData();
    };
    
    const deleteBakeryOrder = async (orderId: string) => {
        await deleteBakeryOrderInDB(orderId);
        await syncData();
    };

    const setBakeryOrders = async (orders: BakeryOrder[]) => {
       await saveBakeryOrders(orders);
       await syncData();
    }

    const addSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
        const newSupplier: Supplier = {
            id: `supp-${new Date().getTime()}`,
            ...supplierData,
        };
        await addSupplierInDB(newSupplier);
        await syncData();
    };

    const updateSupplier = async (supplierId: string, supplierData: Partial<Omit<Supplier, 'id'>>) => {
        await updateSupplierInDB(supplierId, supplierData);
        await syncData();
    };

    const deleteSupplier = async (supplierId: string) => {
        await deleteSupplierInDB(supplierId);
        await syncData();
    };
    
    const addSupplierInvoice = async (invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>) => {
        try {
            await processSupplierInvoice(invoiceData);
            await syncData();
        } catch (error) {
            console.error("Failed to process supplier invoice:", error);
            toast({
                variant: 'destructive',
                title: "Save Error",
                description: "Could not save supplier invoice.",
            });
        }
    };

    const restoreData = async (data: any) => {
        setIsLoading(true);
        try {
            await restoreBackupData(data);
            await syncData(true);
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
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierInvoice,
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
