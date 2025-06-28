'use server';

import { revalidatePath } from 'next/cache';
import { addLicenseKey } from './data-actions';

function generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charCounts: { [key: string]: number } = {};
    let result = '';

    while (result.length < 12) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        const count = charCounts[char] || 0;
        if (count < 2) {
            result += char;
            charCounts[char] = count + 1;
        }
    }
    
    // Format as XXXX-XXXX-XXXX
    return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}`;
}

export async function generateAndSaveLicenseKey() {
    try {
        const key = generateKey();
        await addLicenseKey({
            key,
            createdAt: new Date().toISOString(),
        });
        revalidatePath('/settings'); // Revalidate the settings page to show the new key
        return { success: true, key };
    } catch (error) {
        console.error("Failed to generate license key:", error);
        return { success: false, error: "Failed to generate key." };
    }
}
