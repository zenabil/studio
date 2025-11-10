/**
 * @fileoverview This file initializes the AI (genkit) library.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiVersion: 'v1beta' })],
});
