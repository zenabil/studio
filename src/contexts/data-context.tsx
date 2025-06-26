'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    products as initialProducts, 
    customers as initialCustomers, 
    salesHistory as initialSalesHistory,
    type Product,
    type Customer,
    type SaleRecord,
    type CartItem
} from '@/lib/data';

// Define keys for localStorage
const PRODUCTS_KEY = 'mercurio-pos-products';
const CUSTOMERS_KEY = 'mercurio-pos-customers';
const SALES_HISTORY_KEY = 'mercurio-pos-sales-history';

interface DataContextType {
    products: Product[];
    customers: Customer[];
    salesHistory: SaleRecord[];
    addProduct: (productData: Omit<Product, 'id'>) => void;
    updateProduct: (productId: string, productData: Omit<Product, 'id'>) => void;
    deleteProduct: (productId: string) => void;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    updateCustomer: (customerId: string, customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    deleteCustomer: (customerId: string) => void;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => void;
    makePayment: (customerId: string, amount: number) => void;
    restoreData: (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[] }) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper function to get data from localStorage
const loadFromStorage = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') {
        return fallback;
    }
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return fallback;
    }
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [products, setProducts] = useState<Product[]>(() => loadFromStorage(PRODUCTS_KEY, initialProducts));
    const [customers, setCustomers] = useState<Customer[]>(() => loadFromStorage(CUSTOMERS_KEY, initialCustomers));
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(() => loadFromStorage(SALES_HISTORY_KEY, initialSalesHistory));

    // Persist to localStorage whenever data changes
    useEffect(() => {
        try {
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        } catch (error) {
            console.error("Failed to save products to localStorage", error);
        }
    }, [products]);

    useEffect(() => {
        try {
            localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
        } catch (error) {
            console.error("Failed to save customers to localStorage", error);
        }
    }, [customers]);

    useEffect(() => {
        try {
            localStorage.setItem(SALES_HISTORY_KEY, JSON.stringify(salesHistory));
        } catch (error) {
            console.error("Failed to save sales history to localStorage", error);
        }
    }, [salesHistory]);


    const addProduct = (productData: Omit<Product, 'id'>) => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
        };
        setProducts(prev => [newProduct, ...prev]);
    };

    const updateProduct = (productId: string, productData: Omit<Product, 'id'>) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...productData } : p));
    };

    const deleteProduct = (productId: string) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
    };

    const addCustomer = (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const newCustomer: Customer = {
            id: `cust-${new Date().getTime()}`,
            spent: 0,
            balance: 0,
            ...customerData,
        };
        setCustomers(prev => [newCustomer, ...prev]);
    };
    
    const updateCustomer = (customerId: string, customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...customerData } : c));
    };

    const deleteCustomer = (customerId: string) => {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
    };
    
    const addSaleRecord = (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        const newSale: SaleRecord = {
            id: `SALE-${new Date().getTime()}`,
            customerId: customerId,
            items: cart,
            totals: totals,
            date: new Date().toISOString(),
        };
        setSalesHistory(prev => [newSale, ...prev]);

        // Update product stock
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            cart.forEach(cartItem => {
                const productIndex = newProducts.findIndex(p => p.id === cartItem.id);
                if (productIndex !== -1) {
                    newProducts[productIndex].stock -= cartItem.quantity;
                }
            });
            return newProducts;
        });

        if (customerId) {
            setCustomers(prevCustomers => 
                prevCustomers.map(c => {
                    if (c.id === customerId) {
                        return {
                            ...c,
                            spent: c.spent + totals.total,
                            balance: c.balance + totals.balance,
                        }
                    }
                    return c;
                })
            );
        }
    };
    
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

        setSalesHistory(prev => [...prev, paymentRecord]);

        setCustomers(prev => 
            prev.map(c => 
                c.id === customerId 
                ? { ...c, balance: c.balance - amount }
                : c
            )
        );
    };

    const restoreData = (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[] }) => {
        if (data.products) setProducts(data.products);
        if (data.customers) setCustomers(data.customers);
        if (data.salesHistory) setSalesHistory(data.salesHistory);
    };

    const value = {
        products,
        customers,
        salesHistory,
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
