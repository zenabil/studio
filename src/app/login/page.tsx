'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Loader2, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
    const { login } = useAuth();
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await login(username, password);
        if (!success) {
            setError(t.login.invalidCredentials);
        }
        setIsLoading(false);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110"
                        >
                            <path d="M7 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7Z" />
                            <path d="M16 2v4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4" />
                            <path d="M12 18h.01" />
                        </svg>
                    </div>
                    <CardTitle>{t.login.welcome}</CardTitle>
                    <CardDescription>{t.login.enterCredentials}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">{t.login.username}</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t.login.password}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            <Loader2 className={cn("mr-2 h-4 w-4 animate-spin", { "hidden": !isLoading })} />
                            <LogIn className={cn("mr-2 h-4 w-4", { "hidden": isLoading })} />
                            {t.login.login}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
