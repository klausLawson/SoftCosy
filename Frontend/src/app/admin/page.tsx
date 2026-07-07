'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminEntryPage() {
  const { isAuthenticated, loading, signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/admin/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.push('/admin/dashboard');
    } catch (err: any) {
      const resp = err.response;
      const data = resp?.data || {};
      const errorMsg = data.detail || data.message || (typeof data === 'string' ? data : '');

      // Detection du lockout : soit via le status 403, soit via le detail "lockout"
      const isLockout =
        resp?.status === 403 ||
        data.detail === 'lockout' ||
        (typeof errorMsg === 'string' && (
          errorMsg.toLowerCase().includes('too many') ||
          errorMsg.toLowerCase().includes('verrouillé')
        ));

      if (isLockout) {
        setError('Trop de tentatives échouées, veuillez attendre 5 min pour vous reconnecter.');
      } else {
        const displayMsg = typeof errorMsg === 'string' && errorMsg ? errorMsg : 'Erreur lors de la connexion';
        setError(displayMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary mx-auto animate-pulse" />
          <p className="text-foreground font-medium">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Connexion SportStock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-destructive text-center font-medium border border-destructive/20 bg-destructive/5 p-3 rounded-md">{error}</p>}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="exemple@boutique.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
