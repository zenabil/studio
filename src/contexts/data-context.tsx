'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
    products as initialProducts, 
    customers as initialCustomers, 
    salesHistory as initialSalesHistory,
    type Product,
    type Customer,
    type SaleRecord,
    type CartItem
} from '@/lib/data';

interface DataContextType {
    products: Product[];
    customers: Customer[];
    salesHistory: SaleRecord[];
    addProduct: (productData: Omit<Product, 'id' | 'imageUrl'>) => void;
    updateProduct: (productId: string, productData: Omit<Product, 'id' | 'imageUrl'>) => void;
    deleteProduct: (productId: string) => void;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    updateCustomer: (customerId: string, customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    deleteCustomer: (customerId: string) => void;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => void;
    makePayment: (customerId: string, amount: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(initialSalesHistory);

    const addProduct = (productData: Omit<Product, 'id' | 'imageUrl'>) => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            imageUrl: 'https://placehold.co/300x200',
            ...productData,
        };
        setProducts(prev => [newProduct, ...prev]);
    };

    const updateProduct = (productId: string, productData: Omit<Product, 'id' | 'imageUrl'>) => {
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
