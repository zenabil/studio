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
  barcode: string;
  imageUrl?: string;
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

export const products: Product[] = [
  { id: 'prod-01', name: 'Café Espresso', category: 'Boissons', price: 2.50, purchasePrice: 0.80, stock: 100, minStock: 20, quantityPerBox: 50, boxPrice: 115.00, barcode: '1234567890123', imageUrl: ''},
  { id: 'prod-02', name: 'Croissant au Beurre', category: 'Pâtisseries', price: 1.80, purchasePrice: 0.60, stock: 50, minStock: 15, quantityPerBox: 24, boxPrice: 40.00, barcode: '2345678901234', imageUrl: ''},
  { id: 'prod-03', name: 'Jus d\'Orange Frais', category: 'Boissons', price: 3.00, purchasePrice: 1.20, stock: 30, minStock: 10, quantityPerBox: 12, boxPrice: 34.00, barcode: '3456789012345', imageUrl: ''},
  { id: 'prod-04', name: 'Sandwich Poulet Crudités', category: 'Sandwichs', price: 5.50, purchasePrice: 2.50, stock: 25, minStock: 10, barcode: '4567890123456', imageUrl: ''},
  { id: 'prod-05', name: 'Salade César', category: 'Salades', price: 7.20, purchasePrice: 3.50, stock: 15, minStock: 5, barcode: '5678901234567', imageUrl: ''},
  { id: 'prod-06', name: 'Tarte au Citron', category: 'Pâtisseries', price: 3.50, purchasePrice: 1.50, stock: 8, minStock: 10, quantityPerBox: 6, barcode: '6789012345678', imageUrl: ''},
  { id: 'prod-07', name: 'Eau Minérale', category: 'Boissons', price: 1.20, purchasePrice: 0.40, stock: 200, minStock: 50, quantityPerBox: 24, boxPrice: 25.00, barcode: '7890123456789', imageUrl: ''},
  { id: 'prod-08', name: 'Pain au Chocolat', category: 'Pâtisseries', price: 1.90, purchasePrice: 0.70, stock: 12, minStock: 15, quantityPerBox: 24, boxPrice: 42.00, barcode: '8901234567890', imageUrl: ''},
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
    { id: 'supp-01', name: 'Fournisseur Boissons', phone: '0123456789', productCategory: 'Boissons' },
    { id: 'supp-02', name: 'Fournisseur Pâtisseries', phone: '0987654321', productCategory: 'Pâtisseries' },
];

export const supplierInvoices: SupplierInvoice[] = [];

export const licenseKeys: string[] = [
    "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "f0e9d8c7-b6a5-4321-fedc-ba9876543210",
    "12345678-90ab-cdef-0123-456789abcdef",
    "abcdef12-3456-7890-fedc-ba9876543210",
    "fedcba98-7654-3210-abcdef-1234567890",
    "09876543-21fe-dcba-0987-654321fedcba",
    "c4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9",
    "b3a29180-7f6e-5d4c-3b2a-19087f6e5d4c",
    "6f7e8d9c-b0a1-9283-7465-d6e7f8a9b0c1",
    "5e4d3c2b-1a09-f8e7-d6c5-b4a3928170f1",
    "2c3b4a59-6e7d-8c9b-a0f1-e2d3c4b5a698",
    "d1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6",
    "8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",

    "798a7b6c-5d4e-3f2a-1908-7f6e5d4c3b2a",
    "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
    "9f8e7d6c-5b4a-3928-170f-1e2d3c4b5a69",
    "e2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7",
    "b0a19283-7465-d6e7-f8a9-b0c1d2e3f4a5",
    "f0e9d8c7-b6a5-4321-fedc-ba9876543210",
    "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "6d5c4b3a-2918-07f6-e5d4-c3b2a19087f6",
    "c1b2a394-8576-6a5b-4c3d-2e1f09a8b7c6",
    "3f4e5d6c-7b8a-99f0-e1d2-c3b4a596e7d8",
    "a8b9c0d1-e2f3-a4b5-c6d7-e8f9a0b1c2d3",
    "7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
    "d6e7f8a9-b0c1-d2e3-f4a5-b6c7d8e9f0a1",
    "c5b4a392-8170-f1e2-d3c4-b5a697e8d9c0",
    "291807f6-e5d4-c3b2-a190-87f6e5d4c3b2",
    "e8f9a0b1-c2d3-e4f5-a6b7-c8d9e0f1a2b3",
    "1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
    "7f6e5d4c-3b2a-1908-7f6e-5d4c3b2a1908",
    "9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
    "5d4c3b2a-1908-7f6e-5d4c-3b2a19087f6e",
    "a0b1c2d3-e4f5-a6b7-c8d9-e0f1a2b3c4d5",
    "3b2a1908-7f6e-5d4c-3b2a-19087f6e5d4c",
    "f1e2d3c4-b5a6-97e8-d9c0-b1a29384756f",
    "8e9f0a1b-2c3d-4e5f-6a7b-8c9d0e1f2a3b",
    "7d6c5b4a-3928-170f-1e2d-3c4b5a697e8f",
    "b6a54321-fedc-ba98-7654-3210abcdef",
    "5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d"
]
