import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartItem, Customer, SaleRecord, Product, SupplierInvoiceItem } from "./data";
import { addDays, differenceInCalendarDays, isBefore, addMonths, set } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the total price for a cart item, applying box pricing logic.
 * If the quantity qualifies for one or more full boxes, it charges the box price for those
 * and the standard unit price for any remaining items.
 * @param item The cart item to calculate the total for.
 * @returns The total calculated price for the item.
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
    
    return totalForBoxes + totalForRemaining;
  }
  
  // If no box pricing is applicable, use the standard unit price for all items.
  return quantity * price;
};

export interface DebtAlert {
  customerName: string;
  balance: number;
  dueDate: Date;
  phone: string;
  isOverdue: boolean;
}

export const calculateDebtAlerts = (
  customers: Customer[],
  salesHistory: SaleRecord[],
  paymentTermsDays: number
): DebtAlert[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: DebtAlert[] = [];

  const indebtedCustomers = customers.filter(c => !!c && c.balance > 0);
  const allSalesSorted = salesHistory.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const customer of indebtedCustomers) {
    let debtOriginDate: Date | null = null;
    let balanceTrace = customer.balance;

    const customerHistory = allSalesSorted.filter(s => s.customerId === customer.id);
    for (let i = customerHistory.length - 1; i >= 0; i--) {
      const tx = customerHistory[i];
      if (balanceTrace <= 0) break;

      debtOriginDate = new Date(tx.date);

      if (tx.items.length > 0) { // It's a Sale
        balanceTrace -= tx.totals.balance;
      } else { // It's a Payment
        balanceTrace += tx.totals.amountPaid;
      }
    }

    if (!debtOriginDate) continue;

    let alertDueDate: Date | null = null;

    if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
      let relevantDueDate = set(debtOriginDate, { date: customer.settlementDay });
      if (isBefore(relevantDueDate, debtOriginDate)) {
        relevantDueDate = addMonths(relevantDueDate, 1);
      }
      alertDueDate = relevantDueDate;
    } else if (paymentTermsDays > 0) {
      alertDueDate = addDays(debtOriginDate, paymentTermsDays);
    }

    if (alertDueDate) {
      const daysUntilDue = differenceInCalendarDays(alertDueDate, today);
      if (daysUntilDue <= 1) { // Alert for overdue, today, or tomorrow
        alerts.push({
          customerName: customer.name,
          balance: customer.balance,
          dueDate: alertDueDate,
          phone: customer.phone,
          isOverdue: daysUntilDue < 0,
        });
      }
    }
  }

  return alerts.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
};

export const calculateUpdatedProductsForInvoice = (
  currentProducts: Product[],
  invoiceItems: SupplierInvoiceItem[],
  updateMasterPrices: boolean
): Product[] => {
  // Create a deep copy to avoid modifying the original array in memory.
  const updatedProducts = JSON.parse(JSON.stringify(currentProducts)) as Product[];

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

      // 2. Update prices.
      if (updateMasterPrices) {
        // Directly overwrite the prices with the new ones from the invoice.
        productToUpdate.purchasePrice = item.purchasePrice;
        if (item.boxPrice !== undefined) productToUpdate.boxPrice = item.boxPrice;
        if (item.quantityPerBox !== undefined) productToUpdate.quantityPerBox = item.quantityPerBox;
      } else {
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
    }
  });

  return updatedProducts;
};
