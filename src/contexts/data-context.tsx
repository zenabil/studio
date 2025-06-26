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

export const DataProvider = ({ children }: { children: ReactNode }) => {
    // Initialize with default data for server-side rendering
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(initialSalesHistory);
    const [isClient, setIsClient] = useState(false);

    // This effect runs only on the client, after the initial render
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Load data from localStorage once the component has mounted on the client
    useEffect(() => {
        if (isClient) {
            try {
                const savedProducts = window.localStorage.getItem(PRODUCTS_KEY);
                if (savedProducts) setProducts(JSON.parse(savedProducts));
                
                const savedCustomers = window.localStorage.getItem(CUSTOMERS_KEY);
                if (savedCustomers) setCustomers(JSON.parse(savedCustomers));

                const savedSalesHistory = window.localStorage.getItem(SALES_HISTORY_KEY);
                if (savedSalesHistory) setSalesHistory(JSON.parse(savedSalesHistory));
            } catch (error) {
                console.error("Failed to load data from localStorage", error);
            }
        }
    }, [isClient]);

    // Persist to localStorage whenever data changes, but only on the client
    useEffect(() => {
        if (isClient) {
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        }
    }, [products, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
        }
    }, [customers, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem(SALES_HISTORY_KEY, JSON.stringify(salesHistory));
        }
    }, [salesHistory, isClient]);


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
