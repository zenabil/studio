'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/lib/data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, WandSparkles, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { generateProductImage } from '@/ai/flows/generate-product-image-flow';
import { useToast } from '@/hooks/use-toast';

interface PosProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  currency: string;
  t: any;
}

const CACHE_PREFIX = 'product-image-';
const PLACEHOLDER_IMG = 'https://placehold.co/400x400.png';

const PosProductCardComponent: React.FC<PosProductCardProps> = ({ product, onAddToCart, currency, t }) => {
  const { toast } = useToast();
  const isOutOfStock = product.stock <= 0;
  
  const [imageUrl, setImageUrl] = useState<string>(PLACEHOLDER_IMG);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [hasCachedImage, setHasCachedImage] = useState<boolean>(false);

  useEffect(() => {
    // This effect runs once on mount to check for a cached image in localStorage.
    let isMounted = true;
    try {
      const cachedImage = localStorage.getItem(`${CACHE_PREFIX}${product.id}`);
      if (isMounted && cachedImage) {
        setImageUrl(cachedImage);
        setHasCachedImage(true);
      } else {
          // Ensure placeholder is set if no cache
          setImageUrl(PLACEHOLDER_IMG);
          setHasCachedImage(false);
      }
    } catch (error) {
        console.error("Could not access localStorage:", error);
        setImageUrl(PLACEHOLDER_IMG);
        setHasCachedImage(false);
    }
    return () => { isMounted = false; };
  }, [product.id]);

  const handleGenerateImage = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const generatedDataUri = await generateProductImage(product.name);
      setImageUrl(generatedDataUri);
      localStorage.setItem(`${CACHE_PREFIX}${product.id}`, generatedDataUri);
      setHasCachedImage(true);
    } catch (error) {
      console.error("Image generation failed:", error);
      toast({
        variant: 'destructive',
        title: t.errors.title,
        description: t.errors.imageGenerationError,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, product.name, product.id, t.errors.title, t.errors.imageGenerationError, toast]);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 flex flex-col group",
        isOutOfStock 
          ? "opacity-60 grayscale cursor-not-allowed" 
          : "hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      )}
      onClick={() => !isOutOfStock && onAddToCart(product)}
    >
      <div className="aspect-video w-full overflow-hidden relative bg-muted">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-110",
                isGenerating && "opacity-30 blur-sm"
            )}
            unoptimized={hasCachedImage} // Don't optimize base64 strings
          />
           <Button
             size="icon"
             variant="secondary"
             className={cn(
                "absolute top-2 left-2 h-7 w-7 rounded-full transition-opacity opacity-0 group-hover:opacity-100",
                isGenerating && "opacity-100"
             )}
             onClick={handleGenerateImage}
             disabled={isGenerating || isOutOfStock}
             title="Generate AI Image"
           >
            {isGenerating ? <LoaderCircle className="animate-spin" /> : <WandSparkles className="h-4 w-4" />}
           </Button>

           <div className="absolute top-2 right-2 bg-background/80 text-foreground text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
             {currency}{product.price.toFixed(2)}
           </div>
           {isOutOfStock && (
             <Badge variant="destructive" className="absolute bottom-2 left-1/2 -translate-x-1/2">
                {t.pos.outOfStock}
             </Badge>
           )}
      </div>
      <div className="p-3 flex-grow flex flex-col">
         <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors flex-grow">{product.name}</h3>
         <p className="text-xs text-muted-foreground mt-1">{product.category}</p>
      </div>
      <CardFooter className="p-2 mt-auto">
        <Button
          size="sm"
          className="w-full h-9"
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          disabled={isOutOfStock}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t.pos.addToCart}
        </Button>
      </CardFooter>
    </Card>
  );
};

export const PosProductCard = React.memo(PosProductCardComponent);
