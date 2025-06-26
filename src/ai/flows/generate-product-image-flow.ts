'use server';
/**
 * @fileOverview An AI agent for generating product images.
 *
 * - generateProductImage - A function that generates a product image.
 * - GenerateProductImageInput - The input type for the generateProductImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateProductImageInputSchema = z.object({
  name: z.string().describe('The name of the product.'),
  category: z.string().describe('The category of the product.'),
});
export type GenerateProductImageInput = z.infer<typeof GenerateProductImageInputSchema>;

export async function generateProductImage(input: GenerateProductImageInput): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Generate a professional, high-quality, photorealistic image of the following product for an e-commerce store. The product should be on a clean, light gray background, presented in an appealing way. Product: '${input.name}', Category: '${input.category}'`,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('Image generation failed to return a valid image.');
    }
    
    return media.url;
}
