'use server';
/**
 * @fileOverview An AI agent for forecasting product sales.
 *
 * - salesForecastFlow - A function that predicts daily sales for a product.
 * - SalesForecastInput - The input type for the salesForecastFlow function.
 * - SalesForecastOutput - The return type for the salesForecastFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';

const DailySaleSchema = z.object({
    date: z.string().describe("The date of the sales record in YYYY-MM-DD format."),
    quantity: z.number().describe("The total quantity sold on that date."),
});

const SalesForecastInputSchema = z.object({
  productName: z.string().describe('The name of the product being forecasted.'),
  dailySales: z.array(DailySaleSchema).describe('A history of daily sales quantities for the product.'),
});
export type SalesForecastInput = z.infer<typeof SalesForecastInputSchema>;

const SalesForecastOutputSchema = z.object({
    forecastedQuantity: z.number().int().describe('The predicted integer sales quantity for today. Provide only the number.'),
    reasoning: z.string().describe("A brief explanation of the forecast, considering trends and patterns.")
});
export type SalesForecastOutput = z.infer<typeof SalesForecastOutputSchema>;

export async function salesForecastFlow(input: SalesForecastInput): Promise<SalesForecastOutput> {
  const prompt = ai.definePrompt({
    name: 'salesForecastPrompt',
    input: { schema: SalesForecastInputSchema },
    output: { schema: SalesForecastOutputSchema },
    prompt: `You are a data analyst specializing in retail sales forecasting.
Your task is to predict the sales for a specific product for today.

Analyze the following historical daily sales data for the product: {{{productName}}}

Historical Data:
{{#each dailySales}}
- Date: {{this.date}}, Quantity Sold: {{this.quantity}}
{{/each}}

Today's date is ${format(new Date(), 'yyyy-MM-dd')}.

Based on this historical data, identify any trends, seasonality (like day-of-the-week effects), or recent sales velocity.
Then, provide a sales forecast for today.

Your output must be a number representing the forecasted quantity and a brief reasoning for your prediction.`,
  });

  const { output } = await prompt(input);
  if (!output) {
      throw new Error('Failed to get a forecast from the AI model.');
  }
  return output;
}
