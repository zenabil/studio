'use client';

import React from 'react';
import type { Product } from '@/lib/data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface PosProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  currency: string;
  t: any;
}

const PosProductCardComponent: React.FC<PosProductCardProps> = ({ product, onAddToCart, currency, t }) => {
  const isOutOfStock = product.stock <= 0;

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
      <div className="aspect-video w-full overflow-hidden relative bg-muted flex items-center justify-center">
          <Package className="h-16 w-16 text-muted-foreground/50 transition-transform duration-300 group-hover:scale-110" />
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
