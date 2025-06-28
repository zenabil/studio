export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  purchasePrice: number;
  stock: number;
  minStock: number;
  quantityPerBox?: number;
  boxPrice?: number;
  barcodes: string[];
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  boxPrice?: number;
  quantityPerBox?: number;
  barcode?: string;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  date: string;
  items: SupplierInvoiceItem[];
  totalAmount: number;
  amountPaid?: number;
  isPayment?: boolean;
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

export interface LicenseKey {
  key: string;
  createdAt: string;
}

export const products: Product[] = [
  { id: 'prod-01', name: 'Café Espresso', category: 'Boissons', price: 2.50, purchasePrice: 0.80, stock: 100, minStock: 20, quantityPerBox: 50, boxPrice: 115.00, barcodes: ['1234567890123']},
  { id: 'prod-02', name: 'Croissant au Beurre', category: 'Pâtisseries', price: 1.80, purchasePrice: 0.60, stock: 50, minStock: 15, quantityPerBox: 24, boxPrice: 40.00, barcodes: ['2345678901234']},
  { id: 'prod-03', name: 'Jus d\'Orange Frais', category: 'Boissons', price: 3.00, purchasePrice: 1.20, stock: 30, minStock: 10, quantityPerBox: 12, boxPrice: 34.00, barcodes: ['3456789012345']},
  { id: 'prod-04', name: 'Sandwich Poulet Crudités', category: 'Sandwichs', price: 5.50, purchasePrice: 2.50, stock: 25, minStock: 10, barcodes: ['4567890123456']},
  { id: 'prod-05', name: 'Salade César', category: 'Salades', price: 7.20, purchasePrice: 3.50, stock: 15, minStock: 5, barcodes: ['5678901234567']},
  { id: 'prod-06', name: 'Tarte au Citron', category: 'Pâtisseries', price: 3.50, purchasePrice: 1.50, stock: 8, minStock: 10, quantityPerBox: 6, barcodes: ['6789012345678']},
  { id: 'prod-07', name: 'Eau Minérale', category: 'Boissons', price: 1.20, purchasePrice: 0.40, stock: 200, minStock: 50, quantityPerBox: 24, boxPrice: 25.00, barcodes: ['7890123456789']},
  { id: 'prod-08', name: 'Pain au Chocolat', category: 'Pâtisseries', price: 1.90, purchasePrice: 0.70, stock: 12, minStock: 15, quantityPerBox: 24, boxPrice: 42.00, barcodes: ['8901234567890']},
];

export const customers: Customer[] = [
  { id: 'cust-01', name: 'Jean Dupont', email: 'jean.dupont@example.com', phone: '0612345678', spent: 150.75, balance: 0 },
  { id: 'cust-02', name: 'Marie Curie', email: 'marie.curie@example.com', phone: '0687654321', spent: 275.50, balance: 25.50, settlementDay: 15 },
  { id: 'cust-03', name: 'Pierre Martin', email: 'pierre.martin@example.com', phone: '0611223344', spent: 89.20, balance: 0 },
  { id: 'cust-04', name: 'Sophie Bernard', email: 'sophie.bernard@example.com', phone: '0655667788', spent: 412.00, balance: -10.00 },
];

export const bakeryOrders: BakeryOrder[] = [
    { id: '1', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), name: 'Boulangerie Al-Amal', quantity: 50, paid: true, received: true, isRecurring: true },
    { id: '2', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), name: 'Patisserie Dupont', quantity: 75, paid: false, received: true, isRecurring: false },
    { id: '3', date: new Date().toISOString(), name: 'Le Fournil de la Gare', quantity: 30, paid: false, received: false, isRecurring: false },
];

export const salesHistory: SaleRecord[] = [
    {
        id: 'SALE-001',
        customerId: 'cust-02',
        items: [
            { ...products[0], quantity: 2 },
            { ...products[1], quantity: 1 }
        ],
        totals: {
            subtotal: 6.80,
            discount: 0,
            total: 6.80,
            amountPaid: 5.00,
            balance: 1.80
        },
        date: new Date('2023-10-26T10:00:00Z').toISOString()
    },
    {
        id: 'SALE-002',
        customerId: 'cust-02',
        items: [
            { ...products[4], quantity: 1 }
        ],
        totals: {
            subtotal: 7.20,
            discount: 1,
            total: 6.20,
            amountPaid: 0,
            balance: 6.20
        },
        date: new Date('2023-10-27T12:30:00Z').toISOString()
    }
];

export const suppliers: Supplier[] = [
    { id: 'supp-01', name: 'Fournisseur Boissons', phone: '0123456789', productCategory: 'Boissons', balance: 0 },
    { id: 'supp-02', name: 'Fournisseur Pâtisseries', phone: '0987654321', productCategory: 'Pâtisseries', balance: 0 },
];

export const supplierInvoices: SupplierInvoice[] = [];

export const licenseKeys: LicenseKey[] = [
  { key: 'PRO-LICENSE-2024', createdAt: '2024-01-01T00:00:00.000Z' },
];
