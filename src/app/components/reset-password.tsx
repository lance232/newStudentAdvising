import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ResetPasswordProps {
  isLoading: boolean;
  error: string;
  success: string;
  email: string;
  accountUsername?: string;
  onSubmit: (payload: { email: string; newPassword: string; confirmPassword: string }) => Promise<void>;
  onBack: () => void;
}

function getPasswordRules(password: string) {
  return {
    minLength: password.length >= 6,
    hasUppercase: /[A-Z]/.test(password),
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

export function ResetPassword({ isLoading, error, success, email, accountUsername, onSubmit, onBack }: ResetPasswordProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordRules = useMemo(() => getPasswordRules(newPassword), [newPassword]);

  const hasValidPassword = Object.values(passwordRules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasValidPassword) {
      return;
    }

    await onSubmit({ email, newPassword, confirmPassword });
  };

  const PasswordRule = ({ passed, label }: { passed: boolean; label: string }) => (
    <li className={`flex items-center gap-2 text-xs ${passed ? 'text-green-700' : 'text-gray-500'}`}>
      {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </li>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {accountUsername && (
        <div className="space-y-2">
          <Label htmlFor="reset-username">Verified Username</Label>
          <Input
            id="reset-username"
            type="text"
            value={accountUsername}
            className="h-11 border-[#e4e8eb] bg-[#f7f9fb]"
            readOnly
            disabled
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reset-new-password">New Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93a1af]" />
          <Input
            id="reset-new-password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Create your new password"
            className="h-11 border-[#e4e8eb] bg-[#f7f9fb] pl-10 pr-10"
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#95a2af] hover:text-[#617080]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-1 rounded-md border border-[#e6eaee] bg-[#fbfcfd] p-3 sm:grid-cols-2">
        <PasswordRule passed={passwordRules.minLength} label="At least 6 characters" />
        <PasswordRule passed={passwordRules.hasUppercase} label="At least one uppercase letter" />
        <PasswordRule passed={passwordRules.hasLetter} label="Contains letters" />
        <PasswordRule passed={passwordRules.hasNumber} label="Contains numbers" />
        <PasswordRule passed={passwordRules.hasSpecial} label="At least one special character" />
      </ul>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Confirm Password</Label>
        <Input
          id="reset-confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="h-11 border-[#e4e8eb] bg-[#f7f9fb]"
          disabled={isLoading}
          required
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Button
        type="submit"
        className="h-11 w-full bg-gradient-to-r from-[#08a13f] to-[#d4a200] text-white hover:from-[#079038] hover:to-[#c09100]"
        disabled={isLoading || !hasValidPassword}
      >
        {isLoading ? 'Resetting password...' : 'Reset Password'}
      </Button>

      <Button type="button" variant="ghost" className="h-11 w-full" onClick={onBack} disabled={isLoading}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
    </form>
  );
}
