import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';

interface ForgotPasswordStartProps {
  isLoading: boolean;
  message: string;
  error: string;
  canContinue: boolean;
  onSubmit: (email: string) => Promise<void>;
  onBackToLogin: () => void;
  onContinueToReset: () => void;
}

export function ForgotPasswordStart({
  isLoading,
  message,
  error,
  canContinue,
  onSubmit,
  onBackToLogin,
  onContinueToReset,
}: ForgotPasswordStartProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email Address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93a1af]" />
          <Input
            id="forgot-email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-[#e4e8eb] bg-[#f7f9fb] pl-10"
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <Button
        type="submit"
        className="h-11 w-full bg-gradient-to-r from-[#08a13f] to-[#d4a200] text-white hover:from-[#079038] hover:to-[#c09100]"
        disabled={isLoading}
      >
        {isLoading ? 'Checking email...' : 'Submit'}
      </Button>

      {message && canContinue && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={onContinueToReset}
          disabled={isLoading}
        >
          Continue
        </Button>
      )}

      <Button type="button" variant="ghost" className="h-11 w-full" onClick={onBackToLogin} disabled={isLoading}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Sign In
      </Button>
    </form>
  );
}
