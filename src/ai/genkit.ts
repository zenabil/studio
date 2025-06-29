'use server';
import {genkit} from 'genkit';

// Using require for better CJS/ESM interop in Next.js server environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ollama } = require('genkitx-ollama');

export const ai = genkit({
  plugins: [
    ollama({
      models: [{name: 'gemma:2b'}],
      serverAddress: 'http://127.0.0.1:11434',
    }),
  ],
  model: 'ollama/gemma:2b',
});
