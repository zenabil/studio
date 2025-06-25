export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
  barcode: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  spent: number;
  balance: number;
};

export type Sale = {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
};

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
  { id: 'prod-01', name: 'Café Espresso', category: 'Boissons', price: 2.50, stock: 100, imageUrl: 'https://placehold.co/300x200', barcode: '1234567890123'},
  { id: 'prod-02', name: 'Croissant au Beurre', category: 'Pâtisseries', price: 1.80, stock: 50, imageUrl: 'https://placehold.co/300x200', barcode: '2345678901234'},
  { id: 'prod-03', name: 'Jus d\'Orange Frais', category: 'Boissons', price: 3.00, stock: 30, imageUrl: 'https://placehold.co/300x200', barcode: '3456789012345'},
  { id: 'prod-04', name: 'Sandwich Poulet Crudités', category: 'Sandwichs', price: 5.50, stock: 25, imageUrl: 'https://placehold.co/300x200', barcode: '4567890123456'},
  { id: 'prod-05', name: 'Salade César', category: 'Salades', price: 7.20, stock: 15, imageUrl: 'https://placehold.co/300x200', barcode: '5678901234567'},
  { id: 'prod-06', name: 'Tarte au Citron', category: 'Pâtisseries', price: 3.50, stock: 20, imageUrl: 'https://placehold.co/300x200', barcode: '6789012345678'},
  { id: 'prod-07', name: 'Eau Minérale', category: 'Boissons', price: 1.20, stock: 200, imageUrl: 'https://placehold.co/300x200', barcode: '7890123456789'},
  { id: 'prod-08', name: 'Pain au Chocolat', category: 'Pâtisseries', price: 1.90, stock: 45, imageUrl: 'https://placehold.co/300x200', barcode: '8901234567890'},
];

export const customers: Customer[] = [
  { id: 'cust-01', name: 'Jean Dupont', email: 'jean.dupont@example.com', phone: '0612345678', spent: 150.75, balance: 0 },
  { id: 'cust-02', name: 'Marie Curie', email: 'marie.curie@example.com', phone: '0687654321', spent: 275.50, balance: 25.50 },
  { id: 'cust-03', name: 'Pierre Martin', email: 'pierre.martin@example.com', phone: '0611223344', spent: 89.20, balance: 0 },
  { id: 'cust-04', name: 'Sophie Bernard', email: 'sophie.bernard@example.com', phone: '0655667788', spent: 412.00, balance: -10.00 },
];

export const salesData: Sale[] = [
  { productId: 'prod-01', productName: 'Café Espresso', unitsSold: 120, revenue: 300.00 },
  { productId: 'prod-02', productName: 'Croissant', unitsSold: 85, revenue: 153.00 },
  { productId: 'prod-04', productName: 'Sandwich Poulet', unitsSold: 60, revenue: 330.00 },
  { productId: 'prod-05', productName: 'Salade César', unitsSold: 40, revenue: 288.00 },
  { productId: 'prod-06', productName: 'Tarte Citron', unitsSold: 55, revenue: 192.50 },
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
