'use client';

import React from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle } from 'lucide-react';

interface PosProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  currency: string;
  t: any;
}

const PosProductCardComponent: React.FC<PosProductCardProps> = ({ product, onAddToCart, currency, t }) => {
  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 flex flex-col group cursor-pointer"
      onClick={() => onAddToCart(product)}
      data-ai-hint="product photo"
    >
      <div className="aspect-video w-full overflow-hidden relative bg-muted">
          <Image 
              src={product.imageUrl || `https://placehold.co/400x300.png`} 
              alt={product.name}
              width={400}
              height={300}
              unoptimized={!!product.imageUrl}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
           <div className="absolute top-2 right-2 bg-background/80 text-foreground text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
             {currency}{product.price.toFixed(2)}
           </div>
           {!product.imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
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
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t.pos.addToCart}
        </Button>
      </CardFooter>
    </Card>
  );
};

export const PosProductCard = React.memo(PosProductCardComponent);
