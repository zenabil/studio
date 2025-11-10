
'use client';

import React from 'react';
import type { Product } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import Image from 'next/image';
import placeholderImageData from '@/app/lib/placeholder-images.json';


interface PosProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  currency: string;
  t: any;
}

const PosProductCardComponent: React.FC<PosProductCardProps> = ({ product, onAddToCart, currency, t }) => {
  const isOutOfStock = product.stock <= 0;
  const canSellByBox = product.quantityPerBox && product.quantityPerBox > 0 && product.boxPrice && product.boxPrice > 0;
  const { seed, width, height, hint } = placeholderImageData.productCard;
  
  const productSeed = seed + (product.id.charCodeAt(0) || 0) + (product.id.charCodeAt(1) || 0);
  const placeholderImageUrl = `https://picsum.photos/seed/${productSeed}/${width}/${height}`;

  const imageUrl = product.imageUrl || placeholderImageUrl;

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
      <div className="aspect-square w-full overflow-hidden relative bg-muted">
          <Image
            src={imageUrl}
            alt={product.name}
            width={width}
            height={height}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
            data-ai-hint={hint}
            unoptimized
          />
           {isOutOfStock && (
             <Badge variant="destructive" className="absolute top-2 left-2">
                {t.pos.outOfStock}
             </Badge>
           )}
      </div>
      <CardContent className="p-3 flex-grow flex flex-col">
         <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors flex-grow line-clamp-2">{product.name}</h3>
         <p className="text-xs text-muted-foreground mt-1">{product.category}</p>
         <div className="flex justify-between items-end mt-2">
            <span className="text-lg font-bold text-primary">
                {currency}{product.price.toFixed(2)}
            </span>
            <div className='flex gap-1'>
                {canSellByBox && (
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); onAddToCart(product, product.quantityPerBox!); }}
                        disabled={isOutOfStock || product.stock < product.quantityPerBox!}
                        title={`${t.pos.addBox} (${product.quantityPerBox})`}
                    >
                        <Box className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onAddToCart(product, 1); }}
                    disabled={isOutOfStock}
                >
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
         </div>
      </CardContent>
    </Card>
  );
};

export const PosProductCard = React.memo(PosProductCardComponent);
