
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/language-context';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function SignupPage() {
  const { t } = useLanguage();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z
    .object({
      email: z.string().email({ message: t.auth.emailInvalid }),
      password: z.string().min(6, { message: t.auth.weakPassword }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t.auth.passwordsDoNotMatch,
      path: ['confirmPassword'],
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const adminConfigRef = doc(firestore, 'config', 'admin');
      const adminConfigSnap = await getDoc(adminConfigRef);

      let isFirstUser = false;
      if (!adminConfigSnap.exists()) {
        await setDoc(adminConfigRef, { uid: user.uid });
        isFirstUser = true;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        createdAt: new Date().toISOString(),
        approved: isFirstUser,
      });

      router.push('/');
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            setError(t.auth.emailInUse);
            break;
          case 'auth/weak-password':
            setError(t.auth.weakPassword);
            break;
          default:
            setError(t.auth.genericError);
            break;
        }
      } else {
        setError(t.auth.genericError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const combinedError = error || errors.email?.message || errors.password?.message || errors.confirmPassword?.message;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t.auth.signupTitle}</CardTitle>
          <CardDescription>{t.auth.signupDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
             {combinedError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.errors.title}</AlertTitle>
                <AlertDescription>{combinedError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register('email')}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input id="password" type="password" {...register('password')} disabled={isLoading}/>
            </div>
             <div className="grid gap-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} disabled={isLoading}/>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {t.settings.saving}...
                </>
              ) : (
                t.auth.signupButton
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t.auth.goToLogin}{' '}
            <Link href="/login" className="underline">
              {t.auth.loginLink}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
