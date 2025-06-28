'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '@/contexts/language-context';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/data-context';

interface BarcodeScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScannerDialog({ isOpen, onClose, onScanSuccess }: BarcodeScannerDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products } = useData();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const codeReaderRef = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    let active = true;
    if (isOpen) {
      setHasCameraPermission(null);
      const startScanner = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (!active) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            
            codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {
              if (result) {
                onScanSuccess(result.getText());
              }
              if (err && !(err instanceof NotFoundException)) {
                console.error('Barcode scan error:', err);
                 toast({
                    variant: 'destructive',
                    title: t.errors.title,
                    description: t.errors.scanError,
                });
              }
            });
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      };
      startScanner();

      return () => {
        active = false;
        codeReaderRef.current.reset();
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
      };
    }
  }, [isOpen, onScanSuccess, t.errors.scanError, t.errors.title, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t.pos.scanBarcode}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" muted autoPlay playsInline />
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>{t.errors.cameraAccessRequired}</AlertTitle>
                  <AlertDescription>
                    {t.errors.cameraAccessDenied}
                  </AlertDescription>
              </Alert>
            )}
            {hasCameraPermission === null && (
                 <p className="mt-4 text-muted-foreground">{t.pos.requestingCamera}</p>
            )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.customers.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
