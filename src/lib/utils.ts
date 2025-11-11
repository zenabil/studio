import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartItem, Customer, SaleRecord, Product, SupplierInvoiceItem } from "./contexts/data-context";
import { addDays, differenceInCalendarDays, isBefore, addMonths, set } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type WithId<T> = T & { id: string };

/**
 * Calculates the total price for a cart item, applying box pricing logic.
 * If the quantity qualifies for one or more full boxes, it charges the box price for those
 * and the standard unit price for any remaining items.
 * @param item The cart item to calculate the total for.
 * @returns The total calculated price for the item, rounded to 2 decimal places.
 */
export const calculateItemTotal = (item: CartItem): number => {
  const { quantity, price, quantityPerBox, boxPrice } = item;

  // Check if the product has valid box pricing information.
  if (quantityPerBox && boxPrice && boxPrice > 0 && quantityPerBox > 0) {
    const numberOfBoxes = Math.floor(quantity / quantityPerBox);
    const remainingUnits = quantity % quantityPerBox;
    
    // Total price is the sum of the price for the full boxes and the price for the remaining units.
    const totalForBoxes = numberOfBoxes * boxPrice;
    const totalForRemaining = remainingUnits * price;
    
    return parseFloat((totalForBoxes + totalForRemaining).toFixed(2));
  }
  
  // If no box pricing is applicable, use the standard unit price for all items.
  return parseFloat((quantity * price).toFixed(2));
};

export interface DebtAlert {
  customerName: string;
  balance: number;
  dueDate: Date;
  phone: string | undefined;
  isOverdue: boolean;
}

export const calculateDebtAlerts = (
  customers: WithId<Customer>[],
  salesHistory: WithId<SaleRecord>[],
  globalPaymentTermsDays: number
): DebtAlert[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const indebtedCustomers = customers.filter(c => c && c.balance > 0);
  if (indebtedCustomers.length === 0) {
    return [];
  }

  // Pre-group sales history by customer ID for efficiency
  const salesByCustomer = salesHistory.reduce((acc, sale) => {
    if (sale.customerId) {
      if (!acc[sale.customerId]) {
        acc[sale.customerId] = [];
      }
      acc[sale.customerId].push(sale);
    }
    return acc;
  }, {} as Record<string, WithId<SaleRecord>[]>);

  const allAlerts: DebtAlert[] = [];

  for (const customer of indebtedCustomers) {
    const customerHistory = (salesByCustomer[customer.id] || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (customerHistory.length === 0) continue;

    let debits: { date: Date; amount: number }[] = [];
    let credits: { date: Date; amount: number }[] = [];

    // Separate all debits (invoice totals) and credits (all payments)
    customerHistory.forEach(tx => {
        if (tx.items.length > 0) { // It's an invoice
            debits.push({ date: new Date(tx.date), amount: tx.totals.total });
        }
        if (tx.totals.amountPaid > 0) { // Any transaction with a payment
            credits.push({ date: new Date(tx.date), amount: tx.totals.amountPaid });
        }
    });

    // Apply credits to debits in chronological order to find the oldest unpaid debt
    for (const credit of credits) {
      let creditAmountLeft = credit.amount;
      for (const debit of debits) {
        if (creditAmountLeft <= 0) break;
        if (debit.amount > 0) {
          const amountToPay = Math.min(creditAmountLeft, debit.amount);
          debit.amount -= amountToPay;
          creditAmountLeft -= amountToPay;
        }
      }
    }
    
    // Find the first invoice that is not fully paid off
    const firstOutstandingInvoice = debits.find(inv => inv.amount > 0);

    if (firstOutstandingInvoice) {
      const debtOriginDate = firstOutstandingInvoice.date;
      let alertDueDate: Date | null = null;
      
      if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
        let relevantDueDate = set(debtOriginDate, { date: customer.settlementDay });
        if (isBefore(relevantDueDate, debtOriginDate)) {
          relevantDueDate = addMonths(relevantDueDate, 1);
        }
        alertDueDate = relevantDueDate;
      } else if (globalPaymentTermsDays > 0) {
        alertDueDate = addDays(debtOriginDate, globalPaymentTermsDays);
      }
      
      if (alertDueDate) {
          const daysUntilDue = differenceInCalendarDays(alertDueDate, today);
          // Alert if the due date is today, tomorrow, or in the past
          if (daysUntilDue <= 1) { 
              allAlerts.push({
                  customerName: customer.name,
                  balance: customer.balance,
                  dueDate: alertDueDate,
                  phone: customer.phone || '',
                  isOverdue: daysUntilDue < 0,
              });
          }
      }
    }
  }

  return allAlerts.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
};

/**
 * Calculates the updated state of products after receiving a supplier invoice.
 * This is a pure function that does not modify the original product list.
 * @param currentProducts The original list of all products.
 * @param invoiceItems The items included in the new supplier invoice.
 * @param priceUpdateStrategy How to handle changes in purchase price. ('master': overwrite, 'average': calculate weighted average, 'none': do nothing).
 * @returns A new array of products with updated stock and potentially updated prices.
 */
export const calculateUpdatedProductsForInvoice = (
  currentProducts: WithId<Product>[],
  invoiceItems: SupplierInvoiceItem[],
  priceUpdateStrategy: 'master' | 'average' | 'none'
): WithId<Product>[] => {
  // Create a deep copy to avoid modifying the original array in memory.
  const updatedProducts = JSON.parse(JSON.stringify(currentProducts)) as WithId<Product>[];

  invoiceItems.forEach(item => {
    // Find the product to update in our new array.
    const productToUpdate = updatedProducts.find(p => p.id === item.productId);
    // Find the original, unmodified product state for accurate calculations.
    const originalProduct = currentProducts.find(p => p.id === item.productId);

    if (productToUpdate && originalProduct) {
      const stockBeforeInvoice = originalProduct.stock;
      const quantityFromInvoice = item.quantity;
      
      // 1. Update stock using the original stock value.
      productToUpdate.stock = stockBeforeInvoice + quantityFromInvoice;

      // 2. Update prices based on the selected strategy.
      if (priceUpdateStrategy === 'master') {
        // Directly overwrite the prices with the new ones from the invoice.
        productToUpdate.purchasePrice = item.purchasePrice;
        if (item.boxPrice !== undefined) productToUpdate.boxPrice = item.boxPrice;
        if (item.quantityPerBox !== undefined) productToUpdate.quantityPerBox = item.quantityPerBox;
      } else if (priceUpdateStrategy === 'average') {
        // Calculate the new weighted average purchase price.
        const oldPurchasePrice = originalProduct.purchasePrice || 0;
        const newPurchasePrice = item.purchasePrice;
        
        // Use non-negative stock for weighted average calculation to avoid issues with negative stock values.
        const oldPositiveStock = Math.max(0, stockBeforeInvoice);
        const totalStockAfterInvoice = oldPositiveStock + quantityFromInvoice;

        if (totalStockAfterInvoice > 0) {
          const totalOldValue = oldPositiveStock * oldPurchasePrice;
          const totalNewValue = quantityFromInvoice * newPurchasePrice;
          const newWeightedAveragePrice = (totalOldValue + totalNewValue) / totalStockAfterInvoice;
          // Round to 2 decimal places to avoid floating point inaccuracies.
          productToUpdate.purchasePrice = parseFloat(newWeightedAveragePrice.toFixed(2));
        } else {
          // If total stock is zero or less, just take the new price.
          productToUpdate.purchasePrice = newPurchasePrice;
        }
      }
      // If strategy is 'none', we do nothing to the price fields.
    }
  });

  return updatedProducts;
};
