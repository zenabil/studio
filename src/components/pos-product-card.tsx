'use client';

import React from 'react';
import type { Product } from '@/lib/data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import Image from 'next/image';

interface PosProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  currency: string;
  t: any;
}

const PLACEHOLDER_IMG = 'https://placehold.co/400x400.png';

const PosProductCardComponent: React.FC<PosProductCardProps> = ({ product, onAddToCart, currency, t }) => {
  const isOutOfStock = product.stock <= 0;
  const canSellByBox = product.quantityPerBox && product.quantityPerBox > 0 && product.boxPrice && product.boxPrice > 0;

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 flex flex-col group",
        isOutOfStock 
          ? "opacity-60 grayscale cursor-not-allowed" 
          : "hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      )}
      onClick={() => !isOutOfStock && onAddToCart(product, 1)}
    >
      <div className="aspect-video w-full overflow-hidden relative bg-muted">
          <Image
            src={PLACEHOLDER_IMG}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
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
        <div className="w-full flex items-center gap-2">
            <Button
                size="sm"
                className="h-9 flex-grow"
                onClick={(e) => { e.stopPropagation(); onAddToCart(product, 1); }}
                disabled={isOutOfStock}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.pos.addToCart}
            </Button>
            {canSellByBox && (
                <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); onAddToCart(product, product.quantityPerBox!); }}
                    disabled={isOutOfStock || product.stock < product.quantityPerBox!}
                    title={`${t.pos.addBox} (${product.quantityPerBox})`}
                >
                    <Box className="h-4 w-4" />
                </Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
};

export const PosProductCard = React.memo(PosProductCardComponent);
