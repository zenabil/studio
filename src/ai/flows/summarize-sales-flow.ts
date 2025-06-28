
'use server';
/**
 * @fileOverview An AI agent for summarizing sales reports.
 * - summarizeSalesFlow - A function that generates a natural language summary of sales data.
 * - SummarizeSalesInput - The input type for the summarizeSalesFlow function.
 * - SummarizeSalesOutput - The return type for the summarizeSalesFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const BestSellerSchema = z.object({
    name: z.string(),
    quantity: z.number(),
});

const SalesOverTimePointSchema = z.object({
    date: z.string(),
    sales: z.number(),
});

const SummarizeSalesInputSchema = z.object({
  totalSales: z.number(),
  totalProfits: z.number(),
  totalExpenses: z.number(),
  uniqueCustomerCount: z.number(),
  totalProductsSold: z.number(),
  bestSellers: z.array(BestSellerSchema),
  salesOverTime: z.array(SalesOverTimePointSchema),
  dateRange: z.object({
    from: z.string(),
    to: z.string().optional(),
  }),
  currency: z.string(),
});
export type SummarizeSalesInput = z.infer<typeof SummarizeSalesInputSchema>;

const SummarizeSalesOutputSchema = z.object({
    summary: z.string().describe("A concise, insightful summary of the business performance based on the provided data. Should be in markdown format. It should highlight key trends, successes, and areas for concern."),
});
export type SummarizeSalesOutput = z.infer<typeof SummarizeSalesOutputSchema>;

export async function summarizeSalesFlow(input: SummarizeSalesInput): Promise<SummarizeSalesOutput> {
  const prompt = ai.definePrompt({
    name: 'summarizeSalesPrompt',
    input: { schema: SummarizeSalesInputSchema },
    output: { schema: SummarizeSalesOutputSchema },
    prompt: `You are a professional business analyst. Your task is to provide a concise summary and analysis of the following sales data for a small business. The summary should be in markdown format.

Data for the period from {{dateRange.from}} to {{#if dateRange.to}}{{dateRange.to}}{{else}}{{dateRange.from}}{{/if}}:

**Key Metrics:**
*   **Total Sales:** {{currency}}{{totalSales}}
*   **Total Expenses:** {{currency}}{{totalExpenses}}
*   **Net Profit:** {{currency}}{{totalProfits}}
*   **Total Products Sold:** {{totalProductsSold}} units
*   **Unique Customers:** {{uniqueCustomerCount}}

**Best-Selling Products (by units sold):**
{{#each bestSellers}}
*   {{this.name}}: {{this.quantity}} units
{{/each}}

**Sales Trend Over Time:**
{{#each salesOverTime}}
*   {{this.date}}: {{../currency}}{{this.sales}}
{{/each}}

**Analysis Task:**
Based on the data above, please provide a summary that includes:
1.  An overall performance assessment (e.g., profitable, breaking even, loss-making).
2.  Key insights from the best-selling products. What is driving sales?
3.  Observations about the sales trend over time. Is there growth, decline, or stability? Are there any notable peaks or dips?
4.  One or two actionable recommendations for the business owner based on this data.

The tone should be professional, encouraging, and easy to understand for a non-expert. Use markdown for formatting (e.g., bolding, bullet points).`,
  });

  const { output } = await prompt(input);
  if (!output) {
      throw new Error('Failed to get a summary from the AI model.');
  }
  return output;
}
