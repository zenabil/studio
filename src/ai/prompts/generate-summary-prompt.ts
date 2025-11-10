'use server';

import {ai} from '@/ai/genkit';
import {
  GenerateSummaryFlowInputSchema,
  GenerateSummaryFlowOutputSchema,
} from '@/ai/flows/generate-summary-flow';

export const generateSummaryPrompt = ai.definePrompt(
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
