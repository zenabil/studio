import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartItem } from "./data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const calculateItemTotal = (item: CartItem): number => {
  const { quantity, price, quantityPerBox, boxPrice } = item;

  // Check if the product has valid box pricing information and if the quantity sold qualifies for the bulk discount.
  if (quantityPerBox && boxPrice && boxPrice > 0 && quantityPerBox > 0 && quantity >= quantityPerBox) {
    // Apply a flat discounted rate (price per unit from box) to the entire quantity.
    const pricePerUnitInBox = boxPrice / quantityPerBox;
    return quantity * pricePerUnitInBox;
  }
  
  // Otherwise, use the standard unit price for all items.
  return quantity * price;
};
