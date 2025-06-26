import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartItem } from "./data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const calculateItemTotal = (item: CartItem): number => {
  if (item.quantityPerBox && item.boxPrice && item.boxPrice > 0 && item.quantityPerBox > 0 && item.quantity >= item.quantityPerBox) {
    const numberOfBoxes = Math.floor(item.quantity / item.quantityPerBox);
    const remainingUnits = item.quantity % item.quantityPerBox;
    return (numberOfBoxes * item.boxPrice) + (remainingUnits * item.price);
  }
  return item.quantity * item.price;
};
