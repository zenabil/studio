
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
  email: string;
  status: 'approved' | 'pending' | 'revoked';
  isAdmin: boolean;
  createdAt: string;
  subscriptionEndsAt?: string | null;
}

export type ProductFormData = Omit<Product, 'id'> & { imageFile?: File | null };

export type AddSupplierInvoiceData = {
  supplierId: string;
  items: SupplierInvoiceItem[];
  amountPaid?: number;
  priceUpdateStrategy: 'master' | 'average' | 'none';
  purchaseOrderId?: string;
};
    

    
