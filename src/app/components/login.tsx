import axios from 'axios';
import { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { AlertCircle, BookOpen, CheckCircle2, Eye, EyeOff, Lock, Radar, UserRound } from 'lucide-react';
import usjrLogo from '../../../usjr logo.jpg';
import { forgotPasswordStart, resetPassword } from '../services/auth-api';
import type { ForgotPasswordStartResponse } from '../models/auth';
import { ForgotPasswordStart } from './forgot-password-start';
import { ResetPassword } from './reset-password';
import { Toaster as SonnerToaster, toast } from 'sonner';

interface LoginProps {
  onLogin: (role: 'adviser' | 'student' | 'chairman' | 'admin', userData?: { name: string; id: string }) => void;
}

type AppRole = 'adviser' | 'student' | 'chairman' | 'admin';
type AuthRoute = 'login' | 'forgot-password' | 'reset-password';

const AUTH_ROUTE_PATHS: Record<AuthRoute, string> = {
  login: '/',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
};

function getAuthRouteFromPath(pathname: string): AuthRoute {
  if (pathname === AUTH_ROUTE_PATHS['forgot-password']) {
    return 'forgot-password';
  }

  if (pathname === AUTH_ROUTE_PATHS['reset-password']) {
    return 'reset-password';
  }

  return 'login';
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
  const [authRoute, setAuthRoute] = useState<AuthRoute>(() => getAuthRouteFromPath(window.location.pathname));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [canContinueForgotPassword, setCanContinueForgotPassword] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setAuthRoute(getAuthRouteFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToAuthRoute = (route: AuthRoute, replace = false) => {
    const path = AUTH_ROUTE_PATHS[route];
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
    }

    setAuthRoute(route);
  };

  const getAxiosErrorMessage = (err: unknown, fallback: string): string => {
    if (!axios.isAxiosError(err)) {
      return fallback;
    }

    const payload = err.response?.data as
      | {
          message?: string;
          Message?: string;
          error?: string;
          detail?: string;
          title?: string;
          errors?: Record<string, string[]>;
        }
      | string
      | undefined;

    if (typeof payload === 'string') {
      return payload || fallback;
    }

    const validationError = payload?.errors
      ? Object.values(payload.errors).flat().find(Boolean)
      : undefined;

    return payload?.message || payload?.Message || payload?.error || payload?.detail || validationError || payload?.title || fallback;
  };

  const canProceedWithForgotPassword = (
    response: {
      message?: string;
      canProceed?: boolean;
      emailExists?: boolean;
      exists?: boolean;
      success?: boolean;
    },
  ): boolean => {
    if (typeof response.canProceed === 'boolean') {
      return response.canProceed;
    }

    if (typeof response.emailExists === 'boolean') {
      return response.emailExists;
    }

    if (typeof response.exists === 'boolean') {
      return response.exists;
    }

    if (typeof response.success === 'boolean') {
      return response.success;
    }

    const message = (response.message || '').toLowerCase();
    if (message.includes('not found') || message.includes('does not exist') || message.includes('invalid')) {
      return false;
    }

    // If backend does not send an explicit boolean, treat a successful response as proceed.
    // This keeps compatibility with APIs that intentionally return generic success messages.
    return true;
  };

  const getForgotPasswordUsername = (response: ForgotPasswordStartResponse): string => {
    return (
      response.username?.trim() ||
      response.userName?.trim() ||
      response.Username?.trim() ||
      response.UserName?.trim() ||
      ''
    );
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
      setError('Please enter your password.');
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

      if (response.status === 401) {
        throw new Error('Invalid username or password.');
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

  const handleForgotPasswordStart = async (email: string) => {
    setForgotPasswordError('');
    setForgotPasswordMessage('');
    setCanContinueForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordUsername('');

    if (!email) {
      setForgotPasswordError('Please enter your email address.');
      return;
    }

    setIsForgotPasswordLoading(true);

    try {
      const response = await forgotPasswordStart(email);
      const canProceed = canProceedWithForgotPassword(response);

      if (!canProceed) {
        setForgotPasswordError(response.message || 'Email address was not found.');
        return;
      }

      setForgotPasswordEmail(email);
      setForgotPasswordUsername(getForgotPasswordUsername(response));
      setCanContinueForgotPassword(true);
      setForgotPasswordMessage(response.message || 'If the email exists in our system, you can proceed to set a new password.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setForgotPasswordError(getAxiosErrorMessage(err, 'Please check the submitted data.'));
      } else {
        setForgotPasswordError(getAxiosErrorMessage(err, 'Unable to process forgot password request.'));
      }
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (payload: { email: string; newPassword: string; confirmPassword: string }) => {
    setResetPasswordError('');

    if (!payload.email) {
      setResetPasswordError('Email is required.');
      return;
    }

    if (!getPasswordRules(payload.newPassword).minLength || !getPasswordRules(payload.newPassword).hasUppercase || !getPasswordRules(payload.newPassword).hasLetter || !getPasswordRules(payload.newPassword).hasNumber || !getPasswordRules(payload.newPassword).hasSpecial) {
      setResetPasswordError('Password does not meet all required rules.');
      return;
    }

    if (payload.newPassword !== payload.confirmPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }

    setIsResetPasswordLoading(true);

    try {
      const response = await resetPassword(payload.email, payload.newPassword, payload.confirmPassword);
      const successMessage = response.message || 'Password reset successfully. You can now sign in.';
      toast.success(successMessage);
      setSuccess(successMessage);
      
      // Auto-redirect to login after 2-3 seconds
      setTimeout(() => {
        navigateToAuthRoute('login', true);
        setForgotPasswordEmail('');
        setForgotPasswordUsername('');
        setCanContinueForgotPassword(false);
      }, 2500);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setResetPasswordError(getAxiosErrorMessage(err, 'Please check the submitted data.'));
      } else {
        setResetPasswordError(getAxiosErrorMessage(err, 'Unable to reset password.'));
      }
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f2] px-4 py-8 md:px-8 md:py-12">
      <SonnerToaster richColors position="top-right" />
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
              Accounts are pre-registered by admin using official IDs and email. Users can sign in directly and recover account access through the forgot password flow.
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
              <p className="font-semibold text-[#223246]">Account Recovery</p>
              <p className="mt-1 text-xs leading-relaxed text-[#5f6f80]">Forgot password helps users reset and regain access securely.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-[#e3e6e8] bg-white p-7 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] md:p-8">
          <p className="mb-1 text-sm font-semibold text-[#157150]">University of San Jose - Recoletos</p>
          <h3 className="text-[32px] font-bold leading-tight text-[#1f2937]">
            {authRoute === 'forgot-password'
              ? 'Forgot Password'
              : authRoute === 'reset-password'
                ? 'Reset Password'
                : 'Welcome Back'}
          </h3>
          <p className="mb-6 text-sm text-[#657382]">
            {authRoute === 'forgot-password'
              ? 'Step 1 of 2: enter your email address to start password reset'
              : authRoute === 'reset-password'
                ? 'Step 2 of 2: set your new password'
                : 'Sign in using your official ID and password'}
          </p>

          {authRoute === 'login' && error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authRoute === 'login' && success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {authRoute === 'forgot-password' && (
            <ForgotPasswordStart
              isLoading={isForgotPasswordLoading}
              error={forgotPasswordError}
              message={forgotPasswordMessage}
              canContinue={canContinueForgotPassword}
              onSubmit={handleForgotPasswordStart}
              onContinueToReset={() => {
                if (!canContinueForgotPassword || !forgotPasswordEmail) {
                  setForgotPasswordError('Please enter a valid registered email address.');
                  return;
                }

                setResetPasswordError('');
                navigateToAuthRoute('reset-password');
              }}
              onBackToLogin={() => {
                setForgotPasswordError('');
                setForgotPasswordMessage('');
                setCanContinueForgotPassword(false);
                setForgotPasswordEmail('');
                setForgotPasswordUsername('');
                navigateToAuthRoute('login');
              }}
            />
          )}

          {authRoute === 'reset-password' && (
            <ResetPassword
              isLoading={isResetPasswordLoading}
              error={resetPasswordError}
              success=""
              email={forgotPasswordEmail}
              accountUsername={forgotPasswordUsername}
              onSubmit={handleResetPassword}
              onBack={() => {
                setResetPasswordError('');
                navigateToAuthRoute('forgot-password');
              }}
            />
          )}

          {authRoute === 'login' && (
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
              </div>

              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-[#157150]"
                disabled={isLoading}
                onClick={() => {
                  setForgotPasswordError('');
                  setForgotPasswordMessage('');
                  setCanContinueForgotPassword(false);
                  setForgotPasswordEmail('');
                  navigateToAuthRoute('forgot-password');
                }}
              >
                Forgot Password?
              </Button>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-[#08a13f] to-[#d4a200] text-white hover:from-[#079038] hover:to-[#c09100]"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
