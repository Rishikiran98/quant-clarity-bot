import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' })
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'signup' | 'login' | 'reset' | 'update'>('signup');
  const { signIn, signUp, signOut, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for password recovery token in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setView('update');
    }
  }, []);

  useEffect(() => {
    if (user && view !== 'update') {
      navigate('/');
    }
  }, [user, navigate, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (view === 'update') {
      // Validate new password
      const passwordSchema = z.string().min(6, { message: 'Password must be at least 6 characters' });
      const passwordResult = passwordSchema.safeParse(newPassword);

      if (!passwordResult.success) {
        toast({
          title: 'Validation Error',
          description: passwordResult.error.errors[0].message,
          variant: 'destructive'
        });
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await updatePassword(newPassword);
        if (error) throw error;
        toast({
          title: 'Password Updated',
          description: 'Your password has been successfully updated'
        });
        navigate('/');
      } catch (error: any) {
        toast({
          title: 'Password Update Failed',
          description: error.message || 'An error occurred',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (view === 'reset') {
      // Validate email only for password reset
      const emailSchema = z.string().trim().email({ message: 'Invalid email address' }).max(255);
      const emailResult = emailSchema.safeParse(email);

      if (!emailResult.success) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive'
        });
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({
          title: 'Password Reset Email Sent',
          description: 'Check your email for the password reset link'
        });
        setView('login');
      } catch (error: any) {
        toast({
          title: 'Password Reset Failed',
          description: error.message || 'An error occurred',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Validate inputs for signup/login
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      if (view === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;

        // Optional: sign out immediately (keeps email-confirm flow consistent)
        await signOut();

        setView('login');
        setPassword('');
        toast({
          title: 'Account Created',
          description: 'Please sign in with your credentials'
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({
          title: 'Welcome Back',
          description: 'Successfully signed in'
        });
      }
    } catch (error: any) {
      toast({
        title: view === 'signup' ? 'Signup Failed' : 'Login Failed',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signIn('demo@quantclarity.app', 'demopassword');
      if (error) throw error;
      toast({
        title: 'Demo Login',
        description: 'You are now signed in as a demo user'
      });
    } catch (error: any) {
      toast({
        title: 'Demo Login Failed',
        description: error.message || 'Unable to sign in as demo user',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background p-4">
      <Card className="w-full max-w-md p-8 border-primary/20">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Financial RAG System
          </h1>
          <p className="text-muted-foreground">
            {view === 'signup'
              ? 'Create a new account'
              : view === 'reset'
                ? 'Reset your password'
                : view === 'update'
                  ? 'Set your new password'
                  : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {view !== 'update' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          {view === 'update' ? (
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          ) : view !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {view === 'signup'
                  ? 'Creating Account...'
                  : view === 'reset'
                    ? 'Sending Reset Link...'
                    : view === 'update'
                      ? 'Updating Password...'
                      : 'Signing In...'}
              </>
            ) : (
              <>
                {view === 'signup' ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                ) : view === 'reset' ? (
                  <>Send Reset Link</>
                ) : view === 'update' ? (
                  <>Update Password</>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </>
            )}
          </Button>
        </form>

        {/* Demo Login Button */}
        {view !== 'update' && (
          <Button
            variant="outline"
            className="w-full mt-4"
            disabled={isLoading}
            onClick={handleDemoLogin}
          >
            Continue as Guest
          </Button>
        )}

        {view !== 'update' && (
          <div className="mt-6 text-center space-y-2">
            {view === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setView('reset');
                  setPassword('');
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (view === 'reset') {
                  setView('login');
                } else {
                  setView(view === 'signup' ? 'login' : 'signup');
                }
                setPassword('');
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {view === 'signup'
                ? 'Already have an account? Sign in'
                : view === 'reset'
                  ? 'Back to sign in'
                  : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
