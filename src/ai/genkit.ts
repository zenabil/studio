'use server';

import {genkit, Plugin} from '@genkit-ai/ai';
import {googleAI} from '@genkit-ai/google-genai';

const plugins: Plugin<any>[] = [];

if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI({apiVersion: 'v1beta'}));
}

export const ai = genkit({
  plugins,
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
