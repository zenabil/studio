
'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';
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

interface BarcodeScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScannerDialog({ isOpen, onClose, onScanSuccess }: BarcodeScannerDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const codeReaderRef = useRef(new BrowserMultiFormatReader());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          while (active) {
            try {
              const result = await codeReaderRef.current.decodeOnceFromVideoElement(videoRef.current);
              if (result) {
                onScanSuccess(result.getText());
                break; 
              }
            } catch (err) {
              if (err instanceof NotFoundException || err instanceof ChecksumException || err instanceof FormatException) {
                // Common errors, continue scanning
              } else {
                console.error('Barcode scan error:', err);
                toast({
                  variant: 'destructive',
                  title: t.errors.title,
                  description: t.errors.scanError,
                });
                break; 
              }
            }
          }
        }
      } catch (error) {
        if (active) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      }
    };

    if (isOpen) {
      setHasCameraPermission(null);
      startScanner();
    }

    return () => {
      active = false;
      codeReaderRef.current.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
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
