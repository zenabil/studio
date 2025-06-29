import {genkit} from 'genkit';
import {ollama} from 'genkitx-ollama';

export const ai = genkit({
  plugins: [
    ollama({
      models: [{name: 'gemma:2b'}],
      serverAddress: 'http://127.0.0.1:11434',
    }),
  ],
  model: 'ollama/gemma:2b',
});
