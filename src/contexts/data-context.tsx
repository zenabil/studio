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
    saveProducts,
    getCustomers,
    saveCustomers,
    getSalesHistory,
    getBakeryOrders,
    saveBakeryOrders,
    getSuppliers,
    saveSuppliers,
    getSupplierInvoices,
    saveSupplierInvoices,
    restoreBackupData as restoreServerData,
    processSale as processSaleAction,
    processPayment as processPaymentAction,
    processSupplierInvoice as processSupplierInvoiceAction,
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
    addProduct: (productData: Omit<Product, 'id' | 'imageUrl'>) => void;
    updateProduct: (productId: string, productData: Omit<Product, 'id' | 'imageUrl'>) => void;
    deleteProduct: (productId: string) => void;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    updateCustomer: (customerId: string, customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => void;
    deleteCustomer: (customerId: string) => void;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => void;
    makePayment: (customerId: string, amount: number) => void;
    restoreData: (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[]; bakeryOrders: BakeryOrder[]; suppliers: Supplier[]; supplierInvoices: SupplierInvoice[] }) => Promise<void>;
    addBakeryOrder: (orderData: Omit<BakeryOrder, 'id'>) => void;
    updateBakeryOrder: (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => void;
    deleteBakeryOrder: (orderId: string) => void;
    setBakeryOrders: (orders: BakeryOrder[]) => void;
    addSupplier: (supplierData: Omit<Supplier, 'id'>) => void;
    updateSupplier: (supplierId: string, supplierData: Omit<Supplier, 'id'>) => void;
    deleteSupplier: (supplierId: string) => void;
    addSupplierInvoice: (invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>) => void;
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
            console.error("Failed to sync data from server:", error);
            toast({
                variant: 'destructive',
                title: t.errors.title,
                description: "Could not load application data from the server."
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
    
    // Auto-sync every 5 minutes
    useEffect(() => {
        const intervalId = setInterval(() => {
            syncData(false);
        }, 5 * 60 * 1000); // 300000ms = 5 minutes

        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, [syncData]);

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
      }
    }, [toast]);
    
    const generateAndSaveProductImage = useCallback(async (productId: string, productName: string, productCategory: string) => {
        try {
            const imageUrl = await generateProductImage({ name: productName, category: productCategory });
            
            setProducts(prevProducts => {
                const newProducts = prevProducts.map(p => 
                    p.id === productId ? { ...p, imageUrl } : p
                );

                saveProducts(newProducts).catch(error => {
                    console.error("Failed to save product image URL to server:", error);
                    toast({
                        variant: 'destructive',
                        title: "Image Save Failed",
                        description: "Could not save the generated image URL."
                    });
                });
                
                return newProducts;
            });

        } catch (error) {
            console.error("Failed to generate product image:", error);
            toast({
                variant: 'destructive',
                title: "Image Generation Failed",
                description: "Could not generate an image for the product."
            });
        }
    }, [toast]);

    const addProduct = (productData: Omit<Product, 'id' | 'imageUrl'>) => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
            imageUrl: '',
        };
        const updatedProducts = [newProduct, ...products];
        handleDataUpdate(setProducts, saveProducts, updatedProducts);
        generateAndSaveProductImage(newProduct.id, newProduct.name, newProduct.category);
    };

    const updateProduct = (productId: string, productData: Omit<Product, 'id' | 'imageUrl'>) => {
        let oldProduct: Product | undefined;
        const updatedProducts = products.map(p => {
            if (p.id === productId) {
                oldProduct = { ...p }; 
                return { ...p, ...productData };
            }
            return p;
        });

        handleDataUpdate(setProducts, saveProducts, updatedProducts);
        
        if (oldProduct && (oldProduct.name !== productData.name || oldProduct.category !== productData.category)) {
            generateAndSaveProductImage(productId, productData.name, productData.category);
        }
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
        
        setSalesHistory(updatedSalesHistory);
        setProducts(updatedProducts);
        setCustomers(updatedCustomers);

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
        const updatedCustomers = customers.map(c => 
            c.id === customerId 
            ? { ...c, balance: c.balance - amount }
            : c
        );
        
        setSalesHistory(updatedSalesHistory);
        setCustomers(updatedCustomers);

        const saveTransaction = async () => {
             try {
                await processPaymentAction({
                    salesHistory: updatedSalesHistory,
                    customers: updatedCustomers,
                });
            } catch (error) {
                console.error("Failed to save payment transaction to server:", error);
                toast({
                    variant: 'destructive',
                    title: "Save Error",
                    description: "Could not save payment to the server. Your data might be out of sync.",
                });
            }
        }
       
       saveTransaction();
    };

    const addBakeryOrder = (orderData: Omit<BakeryOrder, 'id'>) => {
        const newOrder: BakeryOrder = {
            id: `b-order-${new Date().getTime()}`,
            ...orderData,
        };
        const updatedOrders = [newOrder, ...bakeryOrders];
        handleDataUpdate(setBakeryOrdersState, saveBakeryOrders, updatedOrders);
    };

    const updateBakeryOrder = (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => {
        const updatedOrders = bakeryOrders.map(o => o.id === orderId ? { ...o, ...orderData } : o);
        handleDataUpdate(setBakeryOrdersState, saveBakeryOrders, updatedOrders);
    };
    
    const deleteBakeryOrder = (orderId: string) => {
        const updatedOrders = bakeryOrders.filter(o => o.id !== orderId);
        handleDataUpdate(setBakeryOrdersState, saveBakeryOrders, updatedOrders);
    };

    const setBakeryOrders = (orders: BakeryOrder[]) => {
        handleDataUpdate(setBakeryOrdersState, saveBakeryOrders, orders);
    }

    const addSupplier = (supplierData: Omit<Supplier, 'id'>) => {
        const newSupplier: Supplier = {
            id: `supp-${new Date().getTime()}`,
            ...supplierData,
        };
        const updatedSuppliers = [newSupplier, ...suppliers];
        handleDataUpdate(setSuppliers, saveSuppliers, updatedSuppliers);
    };

    const updateSupplier = (supplierId: string, supplierData: Omit<Supplier, 'id'>) => {
        const updatedSuppliers = suppliers.map(s => (s.id === supplierId ? { ...s, ...supplierData } : s));
        handleDataUpdate(setSuppliers, saveSuppliers, updatedSuppliers);
    };

    const deleteSupplier = (supplierId: string) => {
        const updatedSuppliers = suppliers.filter(s => s.id !== supplierId);
        handleDataUpdate(setSuppliers, saveSuppliers, updatedSuppliers);
    };
    
    const addSupplierInvoice = useCallback((invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>) => {
        let totalAmount = 0;
        const updatedProducts = products.map(product => {
            const invoiceItem = invoiceData.items.find(item => item.productId === product.id);
            if (invoiceItem) {
                totalAmount += invoiceItem.quantity * invoiceItem.purchasePrice;
                return { ...product, stock: product.stock + invoiceItem.quantity };
            }
            return product;
        });

        const newInvoice: SupplierInvoice = {
            id: `SINV-${new Date().getTime()}`,
            date: new Date().toISOString(),
            totalAmount,
            ...invoiceData,
        };
        const updatedInvoices = [newInvoice, ...supplierInvoices];
        
        setProducts(updatedProducts);
        setSupplierInvoices(updatedInvoices);

        const saveTransaction = async () => {
            try {
                await processSupplierInvoiceAction({
                    products: updatedProducts,
                    supplierInvoices: updatedInvoices,
                });
            } catch (error) {
                console.error("Failed to save supplier invoice transaction:", error);
                toast({
                    variant: 'destructive',
                    title: "Save Error",
                    description: "Could not save supplier invoice to the server.",
                });
            }
        };
        saveTransaction();
    }, [products, supplierInvoices, toast]);

    const restoreData = async (data: any) => {
        setIsLoading(true);
        try {
            await restoreServerData(data);
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
