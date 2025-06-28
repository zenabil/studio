'use server';
/**
 * @fileOverview An AI agent for generating product images.
 * - generateProductImage - A function that creates an image based on a text hint.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export async function generateProductImage(productHint: string): Promise<string> {
  const { media } = await ai.generate({
    // IMPORTANT: ONLY the googleai/gemini-2.0-flash-preview-image-generation model is able to generate images. You MUST use exactly this model to generate images.
    model: 'googleai/gemini-2.0-flash-preview-image-generation',

    prompt: `A high-quality, professional product photograph of ${productHint}. The product should be centered on a clean, solid light-colored background, suitable for an e-commerce or point-of-sale product catalog.`,

    config: {
      responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
    },
  });

  if (!media?.url) {
    throw new Error('Image generation failed to return media.');
  }

  return media.url;
}
