'use server';
/**
 * @fileOverview A flow for generating an AI-powered summary of sales data.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import { Language } from '@/contexts/language-context';

const ai = genkit({
    plugins: [googleAI({ apiVersion: 'v1beta' })],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});


// Define the input schema for the sales summary data
const SalesSummaryDataSchema = z.object({
  totalSales: z.number().describe('Total sales revenue for the period.'),
  totalExpenses: z.number().describe('Total expenses for the period.'),
  totalProfits: z.number().describe('Total net profit for the period (sales - expenses).'),
  topSellingProducts: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
      })
    )
    .describe('An array of the top-selling products by units sold.'),
  customerCount: z.number().describe('The number of unique customers during the period.'),
  salesCount: z.number().describe('The total number of sales transactions.'),
});

// Define the input schema for the flow itself
const GenerateSummaryFlowInputSchema = z.object({
  data: SalesSummaryDataSchema,
  language: z.nativeEnum(Language).describe('The language for the output summary (e.g., "en", "fr", "ar").'),
});
type GenerateSummaryFlowInput = z.infer<typeof GenerateSummaryFlowInputSchema>;

// Define the output schema (a simple string for the summary)
const GenerateSummaryFlowOutputSchema = z.string();
type GenerateSummaryFlowOutput = z.infer<typeof GenerateSummaryFlowOutputSchema>;


const generateSummaryPrompt = ai.definePrompt(
  {
    name: 'generateSummaryPrompt',
    input: {schema: GenerateSummaryFlowInputSchema},
    output: {schema: GenerateSummaryFlowOutputSchema},
    prompt: `
        You are a business analyst AI integrated into a Point of Sale (POS) system.
        Your task is to provide a concise, insightful, and professional summary of the provided sales data.
        The summary must be in {language}.

        Analyze the following data for the selected period:
        - Total Sales Revenue: {data.totalSales}
        - Total Expenses: {data.totalExpenses}
        - Net Profit: {data.totalProfits}
        - Total number of sales transactions: {data.salesCount}
        - Number of unique customers: {data.customerCount}
        - Top 5 Selling Products (by units):
        {{#each data.topSellingProducts}}
            - {name}: {quantity} units
        {{/each}}

        Based on this data, generate a summary that includes:
        1.  A brief, high-level overview of the business performance (e.g., "The business performed well," "It was a slow period," etc.).
        2.  Mention the net profit or loss.
        3.  Highlight the top-selling product and its performance.
        4.  Provide one or two actionable insights or observations. For example, if profits are high but customer count is low, suggest focusing on customer acquisition. If one product is selling far more than others, suggest a marketing push for other items.
        
        Keep the tone professional, encouraging, and easy to understand. The output should be plain text, formatted with markdown for readability (e.g., use bullet points).
    `,
  },
);


/**
 * An asynchronous function that takes sales data and returns an AI-generated summary.
 * @param {GenerateSummaryFlowInput} input - The input data for the flow, including sales figures and language preference.
 * @returns {Promise<GenerateSummaryFlowOutput>} A promise that resolves to the generated text summary.
 */
export async function generateSummary(input: GenerateSummaryFlowInput): Promise<GenerateSummaryFlowOutput> {
  return generateSummaryFlow(input);
}

// Define the Genkit flow
const generateSummaryFlow = ai.defineFlow(
  {
    name: 'generateSummaryFlow',
    inputSchema: GenerateSummaryFlowInputSchema,
    outputSchema: GenerateSummaryFlowOutputSchema,
  },
  async (input) => {
    
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY. Please set it in your environment variables.");
    }
      
    // Execute the prompt with the structured input data
    const llmResponse = await generateSummaryPrompt(input);

    // Return the text content of the response
    return llmResponse.text;
  }
);
