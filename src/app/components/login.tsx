import { useMemo, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { AlertCircle, BookOpen, CheckCircle2, Eye, EyeOff, Lock, Radar, UserRound, XCircle } from 'lucide-react';
import usjrLogo from '../../../usjr logo.jpg';

interface LoginProps {
  onLogin: (role: 'adviser' | 'student' | 'chairman' | 'admin', userData?: { name: string; id: string }) => void;
}

type AppRole = 'adviser' | 'student' | 'chairman' | 'admin';
type AuthMode = 'login' | 'set-password';

interface SetupState {
  username: string;
  setupToken?: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? 'https://localhost:53005/api';

function getApiBaseCandidates(): string[] {
  const candidates: string[] = [];

  if (API_BASE_URL) {
    candidates.push(API_BASE_URL);
  }

  if (API_BASE_URL.endsWith('/api')) {
    candidates.push(API_BASE_URL.slice(0, -4));
  } else {
    candidates.push(`${API_BASE_URL}/api`);
  }

  return Array.from(new Set(candidates.map((value) => value.replace(/\/$/, ''))));
}

async function fetchWithApiFallback(path: string, init?: RequestInit): Promise<Response> {
  const bases = getApiBaseCandidates();
  let lastResponse: Response | null = null;

  for (const base of bases) {
    const response = await fetch(`${base}${path}`, init);
    if (response.status !== 404) {
      return response;
    }

    lastResponse = response;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error('Unable to reach authentication service.');
}

  function normalizeStoredToken(token: string | undefined): string | null {
    if (!token) {
      return null;
    }

    return token.replace(/^Bearer\s+/i, '').trim();
  }

function normalizeRole(role: string | undefined): AppRole | null {
  switch (role?.toUpperCase()) {
    case 'ADVISER':
      return 'adviser';
    case 'STUDENT':
      return 'student';
    case 'CHAIRMAN':
      return 'chairman';
    case 'ADMIN':
      return 'admin';
    default:
      return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as {
    message?: string;
    error?: string;
    title?: string;
    requiresPasswordSetup?: boolean;
    setupToken?: string;
  };
  return data.message || data.error || data.title || fallback;
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

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordRules = useMemo(() => getPasswordRules(newPassword), [newPassword]);
  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const startFirstLoginSetup = async (username: string) => {
    const response = await fetchWithApiFallback('/auth/first-login/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getErrorMessage(payload, 'Unable to start first login setup.'));
    }

    const data = payload as { setupToken?: string };
    setSetupState({ username, setupToken: data.setupToken });
    setMode('set-password');
    setSuccess('First login detected. Please set your password to continue.');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier) {
      setError('Please enter your official ID.');
      return;
    }

    if (!password) {
      setError('Please enter your password. If this is your first login, use Set Password First.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchWithApiFallback('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: identifier, password }),
      });

      const payload = await response.json().catch(() => ({}));

      const loginData = payload as { requiresPasswordSetup?: boolean; setupToken?: string };
      if (response.status === 428 || loginData.requiresPasswordSetup) {
        if (loginData.setupToken) {
          setSetupState({ username: identifier, setupToken: loginData.setupToken });
          setMode('set-password');
          setSuccess('First login detected. Please set your password to continue.');
        } else {
          await startFirstLoginSetup(identifier);
        }
        return;
      }

      if (response.status === 401) {
        throw new Error('Invalid username or password. If this is your first login, click Set Password First.');
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to sign in. Please try again.'));
      }

      const data = payload as {
        token?: string;
        accessToken?: string;
        access_token?: string;
        jwt?: string;
        Token?: string;
        role?: string;
        userId?: number | string;
        id?: number | string;
        username?: string;
        firstName?: string;
        lastName?: string;
        user?: {
          id?: number | string;
          username?: string;
          role?: string;
          firstName?: string;
          lastName?: string;
        };
      };

      const mappedRole = normalizeRole(data.user?.role ?? data.role);
      if (!mappedRole) {
        throw new Error('Unsupported user role from backend response.');
      }

      const firstName = data.user?.firstName ?? data.firstName ?? '';
      const lastName = data.user?.lastName ?? data.lastName ?? '';
      const fullName = `${firstName} ${lastName}`.trim();
      const fallbackName = data.user?.username ?? data.username ?? identifier;
      const userName = fullName || fallbackName;
      const userId = String(data.user?.id ?? data.userId ?? data.id ?? identifier);

      const token = normalizeStoredToken(data.accessToken ?? data.token ?? data.access_token ?? data.jwt ?? data.Token);
      if (token) {
        if (rememberMe) {
          localStorage.setItem('auth_token', token);
          sessionStorage.removeItem('auth_token');
        } else {
          sessionStorage.setItem('auth_token', token);
          localStorage.removeItem('auth_token');
        }
      }

      onLogin(mappedRole, {
        name: userName,
        id: userId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const setupUsername = setupState?.username || identifier;

    if (!setupUsername) {
      setError('Missing account identifier for password setup.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet all required rules.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchWithApiFallback('/auth/first-login/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: setupUsername,
          password: newPassword,
          newPassword,
          confirmPassword,
          setupToken: setupState?.setupToken,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to set password for first login.'));
      }

      setSuccess('Password set successfully. You can now sign in normally.');
      setMode('login');
      setIdentifier(setupUsername);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSetupState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set password for first login.');
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordRule = ({ passed, label }: { passed: boolean; label: string }) => (
    <li className={`flex items-center gap-2 text-xs ${passed ? 'text-green-700' : 'text-gray-500'}`}>
      {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </li>
  );

  return (
    <div className="min-h-screen bg-[#f1f3f2] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="mb-12 flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-[#d7dbd8] bg-white shadow-sm">
              <img src={usjrLogo} alt="USJR logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-[34px] font-bold leading-tight text-[#0f6a4c]">University of San Jose - Recoletos</h1>
              <p className="text-sm font-semibold text-[#cc9a00]">Academic Advising System</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[40px] font-bold leading-tight text-[#223246]">Secure Academic Access</h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-[#526172]">
              Accounts are pre-registered by admin using official IDs. On first login, users are required to set a strong password before accessing the system.
            </p>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#d6eadf] bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f9ef] text-[#15803d]">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[#223246]">Pre-Registered Accounts</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f6f80]">Admin creates users and assigns roles from official records.</p>
            </div>

            <div className="rounded-2xl border border-[#f4deb5] bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7e6] text-[#c58a00]">
                <Radar className="h-5 w-5" />
              </div>
              <p className="font-semibold text-[#223246]">Forced First Password</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f6f80]">New accounts must set a strong password before normal login.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-[#e3e6e8] bg-white p-7 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] md:p-8">
          <p className="mb-1 text-sm font-semibold text-[#157150]">University of San Jose - Recoletos</p>
          <h3 className="text-[32px] font-bold leading-tight text-[#1f2937]">{mode === 'login' ? 'Welcome Back' : 'Set Your Password'}</h3>
          <p className="mb-6 text-sm text-[#657382]">
            {mode === 'login' ? 'Sign in using your official ID and password' : 'First login detected: create your permanent password'}
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Official ID (Username)</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93a1af]" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Enter official ID"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 border-[#e4e8eb] bg-[#f7f9fb] pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93a1af]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-[#e4e8eb] bg-[#f7f9fb] pl-10 pr-10"
                    disabled={isLoading}
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

              <div className="flex items-center justify-between">
                <label htmlFor="remember" className="flex cursor-pointer items-center gap-2 text-sm text-[#4f5c6a]">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#bcc6cf]"
                  />
                  Remember me
                </label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-[#157150]"
                  disabled={isLoading || !identifier}
                  onClick={() => startFirstLoginSetup(identifier)}
                >
                  Set Password First
                </Button>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-[#08a13f] to-[#d4a200] text-white hover:from-[#079038] hover:to-[#c09100]"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93a1af]" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create your new password"
                    className="h-11 border-[#e4e8eb] bg-[#f7f9fb] pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#95a2af] hover:text-[#617080]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <ul className="grid grid-cols-1 gap-1 rounded-md border border-[#e6eaee] bg-[#fbfcfd] p-3 sm:grid-cols-2">
                  <PasswordRule passed={passwordRules.minLength} label="At least 6 characters" />
                  <PasswordRule passed={passwordRules.hasUppercase} label="At least one uppercase letter" />
                  <PasswordRule passed={passwordRules.hasLetter} label="Contains letters" />
                  <PasswordRule passed={passwordRules.hasNumber} label="Contains numbers" />
                  <PasswordRule passed={passwordRules.hasSpecial} label="At least one special character" />
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-11 border-[#e4e8eb] bg-[#f7f9fb]"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-[#08a13f] to-[#d4a200] text-white hover:from-[#079038] hover:to-[#c09100]"
                disabled={isLoading}
              >
                {isLoading ? 'Saving password...' : 'Save Password'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
