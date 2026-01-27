import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, User, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export const RegisterPage: React.FC = () => {
  const [role, setRole] = useState<UserRole>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await register(name, email, password, role);
      if (success) {
        toast({
          title: 'Registration successful!',
          description: 'You can now sign in with your credentials.',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Registration failed',
          description: 'User may already exist or server error.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="gradient-bg p-2 rounded-lg">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">SmartTraffic</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold">Create Account</h1>
            <p className="text-muted-foreground">
              Join the traffic management system
            </p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`glow-card p-4 flex flex-col items-center gap-2 transition-all ${
                role === 'user'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'hover:bg-muted'
              }`}
            >
              <User className={`w-8 h-8 ${role === 'user' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`font-medium ${role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}>
                Public User
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`glow-card p-4 flex flex-col items-center gap-2 transition-all ${
                role === 'admin'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'hover:bg-muted'
              }`}
            >
              <Shield className={`w-8 h-8 ${role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`font-medium ${role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`}>
                Administrator
              </span>
            </button>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 gradient-bg text-primary-foreground font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
