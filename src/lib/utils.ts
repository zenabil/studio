import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartItem } from "./data";

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
