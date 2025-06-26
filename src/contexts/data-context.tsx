'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
    type Product,
    type Customer,
    type SaleRecord,
    type CartItem
} from '@/lib/data';
import {
    getProducts,
    saveProducts,
    getCustomers,
    saveCustomers,
    getSalesHistory,
    saveSalesHistory,
    restoreBackupData as restoreServerData,
    processSale as processSaleAction
} from '@/lib/data-actions';
import { useToast } from '@/hooks/use-toast';

interface DataContextType {
    products: Product[];
    customers: Customer[];
    salesHistory: SaleRecord[];
    isLoading: boolean;
    addProduct: (productData: Omit<Product, 'id'>) => void;
    updateProduct: (productId: string, productData: Omit<Product, 'id'>) => void;
    deleteProduct: (productId: string) => void;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    updateCustomer: (customerId: string, customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    deleteCustomer: (customerId: string) => void;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => void;
    makePayment: (customerId: string, amount: number) => void;
    restoreData: (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[] }) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial data from server
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [loadedProducts, loadedCustomers, loadedSalesHistory] = await Promise.all([
                    getProducts(),
                    getCustomers(),
                    getSalesHistory()
                ]);
                setProducts(loadedProducts);
                setCustomers(loadedCustomers);
                setSalesHistory(loadedSalesHistory);
            } catch (error) {
                console.error("Failed to load data from server:", error);
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: "Could not load application data from the server."
                })
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [toast]);

    const handleDataUpdate = useCallback(async <T>(
      updateFn: React.Dispatch<React.SetStateAction<T[]>>,
      saveFn: (data: T[]) => Promise<void>,
      newData: T[]
    ) => {
      updateFn(newData);
      try {
        await saveFn(newData);
      } catch (error) {
        console.error("Failed to save data to server:", error);
        toast({
          variant: 'destructive',
          title: "Save Error",
          description: "Could not save changes to the server. Your data might be out of sync.",
        });
        // Optionally, implement a rollback mechanism here
      }
    }, [toast]);

    const addProduct = (productData: Omit<Product, 'id'>) => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
        };
        const updatedProducts = [newProduct, ...products];
        handleDataUpdate(setProducts, saveProducts, updatedProducts);
    };

    const updateProduct = (productId: string, productData: Omit<Product, 'id'>) => {
        const updatedProducts = products.map(p => p.id === productId ? { ...p, ...productData } : p);
        handleDataUpdate(setProducts, saveProducts, updatedProducts);
    };

    const deleteProduct = (productId: string) => {
        const updatedProducts = products.filter(p => p.id !== productId);
        handleDataUpdate(setProducts, saveProducts, updatedProducts);
    };

    const addCustomer = (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const newCustomer: Customer = {
            id: `cust-${new Date().getTime()}`,
            spent: 0,
            balance: 0,
            ...customerData,
        };
        const updatedCustomers = [newCustomer, ...customers];
        handleDataUpdate(setCustomers, saveCustomers, updatedCustomers);
    };
    
    const updateCustomer = (customerId: string, customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const updatedCustomers = customers.map(c => c.id === customerId ? { ...c, ...customerData } : c);
        handleDataUpdate(setCustomers, saveCustomers, updatedCustomers);
    };

    const deleteCustomer = (customerId: string) => {
        const updatedCustomers = customers.filter(c => c.id !== customerId);
        handleDataUpdate(setCustomers, saveCustomers, updatedCustomers);
    };
    
    const addSaleRecord = useCallback((cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        const newSale: SaleRecord = {
            id: `SALE-${new Date().getTime()}`,
            customerId: customerId,
            items: cart,
            totals: totals,
            date: new Date().toISOString(),
        };
        
        const updatedSalesHistory = [newSale, ...salesHistory];
        
        const updatedProducts = products.map(product => {
            const cartItem = cart.find(item => item.id === product.id);
            if (cartItem) {
                return { ...product, stock: product.stock - cartItem.quantity };
            }
            return product;
        });
        
        let updatedCustomers = [...customers];
        if (customerId) {
            updatedCustomers = customers.map(c => {
                if (c.id === customerId) {
                    return {
                        ...c,
                        spent: c.spent + totals.total,
                        balance: c.balance + totals.balance,
                    }
                }
                return c;
            });
        }
        
        // Optimistically update the UI
        setSalesHistory(updatedSalesHistory);
        setProducts(updatedProducts);
        setCustomers(updatedCustomers);

        // Call the single server action to save all changes
        const saveTransaction = async () => {
            try {
                await processSaleAction({
                    salesHistory: updatedSalesHistory,
                    products: updatedProducts,
                    customers: updatedCustomers,
                });
            } catch (error) {
                console.error("Failed to save sale transaction to server:", error);
                toast({
                    variant: 'destructive',
                    title: "Save Error",
                    description: "Could not save sale to the server. Your data might be out of sync.",
                });
            }
        };

        saveTransaction();

    }, [products, customers, salesHistory, toast]);
    
    const makePayment = (customerId: string, amount: number) => {
        const paymentRecord: SaleRecord = {
            id: `PAY-${new Date().getTime()}`,
            customerId: customerId,
            items: [],
            totals: {
                subtotal: 0,
                discount: 0,
                total: 0,
                amountPaid: amount,
                balance: -amount,
            },
            date: new Date().toISOString(),
        };

        const updatedSalesHistory = [...salesHistory, paymentRecord];
        handleDataUpdate(setSalesHistory, saveSalesHistory, updatedSalesHistory);

        const updatedCustomers = customers.map(c => 
            c.id === customerId 
            ? { ...c, balance: c.balance - amount }
            : c
        );
        handleDataUpdate(setCustomers, saveCustomers, updatedCustomers);
    };

    const restoreData = async (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[] }) => {
        setIsLoading(true);
        try {
            await restoreServerData(data);
            // Re-fetch data from server to update UI
            const [loadedProducts, loadedCustomers, loadedSalesHistory] = await Promise.all([
                getProducts(),
                getCustomers(),
                getSalesHistory()
            ]);
            setProducts(loadedProducts);
            setCustomers(loadedCustomers);
            setSalesHistory(loadedSalesHistory);
        } catch(error) {
            console.error("Failed to restore data:", error);
            throw error; // re-throw to be caught in the component
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        products,
        customers,
        salesHistory,
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
