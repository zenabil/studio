import { z } from 'genkit';
import { Language } from '@/contexts/language-context';

// Define the input schema for the sales summary data
const SalesSummaryDataSchema = z.object({
  totalSales: z.number().describe('Total sales revenue for the period.'),
  totalExpenses: z.number().describe('Total expenses for the period.'),
  totalProfits: z
    .number()
    .describe('Total net profit for the period (sales - expenses).'),
  topSellingProducts: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
      })
    )
    .describe('An array of the top-selling products by units sold.'),
  customerCount: z
    .number()
    .describe('The number of unique customers during the period.'),
  salesCount: z.number().describe('The total number of sales transactions.'),
});

// Define the input schema for the flow itself
export const GenerateSummaryFlowInputSchema = z.object({
  data: SalesSummaryDataSchema,
  language: z
    .nativeEnum(Language)
    .describe('The language for the output summary (e.g., "en", "fr", "ar").'),
});
export type GenerateSummaryFlowInput = z.infer<
  typeof GenerateSummaryFlowInputSchema
>;

// Define the output schema (a simple string for the summary)
export const GenerateSummaryFlowOutputSchema = z.string();
export type GenerateSummaryFlowOutput = z.infer<
  typeof GenerateSummaryFlowOutputSchema
>;
