import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Ship, Eye, EyeOff, ArrowLeft, Anchor, Waves, Sun, Moon, ShieldCheck, KeyRound, Server, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginByRole } from '@/api/authSessionService';
import { useAuth } from '@/contexts/AuthContext';
import { preferencesAPI } from '@/api/preferences';
import { cn } from '@/lib/utils';
import '@/styles/pages/LoginPage.css';
import '@/styles/animations.css';

type ApiErrorShape = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  cancelled?: boolean;
};

const asApiError = (error: unknown): ApiErrorShape => {
  if (typeof error === 'object' && error !== null) {
    return error as ApiErrorShape;
  }
  return {};
};

const LoginPage = () => {
  const FORCE_LOGIN_CONFIRM_COOLDOWN_SECONDS = 5;
  const CONFLICT_PREFIX = 'Account is already logged in on another device/session.';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [forceLoginDialogOpen, setForceLoginDialogOpen] = useState(false);
  const [forceLoginCooldownSeconds, setForceLoginCooldownSeconds] = useState(0);
  const [forceLoginConflictMessage, setForceLoginConflictMessage] = useState('');
  const [sessionReplacedDialogOpen, setSessionReplacedDialogOpen] = useState(false);
  const [accountChangedDialogOpen, setAccountChangedDialogOpen] = useState(false);
  const [accountChangedReason, setAccountChangedReason] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [backendUnreachable, setBackendUnreachable] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { setAuthenticatedUser } = useAuth();
  const usernameRef = useRef<HTMLInputElement>(null);
  const forceLoginResolverRef = useRef<((value: boolean) => void) | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    setIsLoaded(true);
    usernameRef.current?.focus();
    const loadClientPreferences = async () => {
      try {
        const pref = await preferencesAPI.getClientPreferences();
        if (pref.rememberedUsername) {
          setUsername(pref.rememberedUsername);
          setRememberMe(true);
        }
        const nextTheme = pref.theme === 'light' ? 'light' : 'dark';
        setTheme(nextTheme);
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      } catch {
      }
    };
    void loadClientPreferences();

    const reasonFromUrl = new URLSearchParams(location.search).get('reason');
    const reasonFromSession = sessionStorage.getItem('auth_logout_reason');
    const isSessionReplaced = reasonFromSession === 'session_replaced' || reasonFromUrl === 'session-replaced';
    const isAccountChanged = reasonFromSession === 'account_changed' || reasonFromUrl === 'account-changed';

    if (isSessionReplaced) {
      setSessionReplacedDialogOpen(true);
    }
    if (isAccountChanged) {
      setAccountChangedDialogOpen(true);
      setAccountChangedReason(sessionStorage.getItem('auth_logout_reason_detail') || 'Your account details or access were updated by an administrator.');
    }

    sessionStorage.removeItem('auth_logout_reason');
    sessionStorage.removeItem('auth_logout_reason_detail');

    if (reasonFromUrl) {
      window.history.replaceState(window.history.state, '', location.pathname);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!forceLoginDialogOpen || forceLoginCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setForceLoginCooldownSeconds((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [forceLoginDialogOpen, forceLoginCooldownSeconds]);

  useEffect(() => {
    return () => {
      if (forceLoginResolverRef.current) {
        forceLoginResolverRef.current(false);
        forceLoginResolverRef.current = null;
      }
    };
  }, []);

  const resolveForceLoginChoice = (shouldForceLogin: boolean) => {
    if (forceLoginResolverRef.current) {
      forceLoginResolverRef.current(shouldForceLogin);
      forceLoginResolverRef.current = null;
    }
    setForceLoginDialogOpen(false);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const requestForceLoginConfirmation = (conflictMessage?: string) =>
    new Promise<boolean>((resolve) => {
      setForceLoginConflictMessage(conflictMessage || CONFLICT_PREFIX);
      setForceLoginCooldownSeconds(FORCE_LOGIN_CONFIRM_COOLDOWN_SECONDS);
      forceLoginResolverRef.current = resolve;
      setForceLoginDialogOpen(true);
    });

  const validateForm = () => {
    let isValid = true;
    setUsernameError('');
    setPasswordError('');

    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!isValid) triggerShake();

    return isValid;
  };

  const retryConnection = async () => {
    setLoading(true);
    try {
      await preferencesAPI.getClientPreferences();
      setBackendUnreachable(false);
      toast({ title: 'Connected', description: 'Server connection restored.', variant: 'success' });
    } catch (error) {
      const parsed = asApiError(error);
      if (parsed.response) {
        setBackendUnreachable(false);
        toast({ title: 'Connected', description: 'Server connection restored.', variant: 'success' });
      } else {
        toast({ title: 'Connection Failed', description: 'Server is still unreachable.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const attemptRoleLogin = async (role: 'SUPERADMIN' | 'ADMIN') => {
        try {
          return await loginByRole({ username, password }, role);
        } catch (error: unknown) {
          const parsedError = asApiError(error);
          const status = parsedError.response?.status;
          const conflictMessage = parsedError.response?.data?.message;
          if (status !== 409) {
            throw error;
          }

          setLoading(false);
          const shouldForceLogin = await requestForceLoginConfirmation(conflictMessage);
          if (!shouldForceLogin) {
            throw { cancelled: true };
          }
          setLoading(true);
          return await loginByRole({ username, password }, role, { forceLogin: true });
        }
      };

      let user;
      let sessionId = '';
      try {
        const superAdminLogin = await attemptRoleLogin('SUPERADMIN');
        user = superAdminLogin.user;
        sessionId = superAdminLogin.sessionId;
      } catch (superAdminError: unknown) {
        const parsedError = asApiError(superAdminError);
        if (parsedError.cancelled) {
          setLoading(false);
          return;
        }
        const status = parsedError.response?.status;
        if (status !== 401) {
          throw superAdminError;
        }
        const adminLogin = await attemptRoleLogin('ADMIN');
        user = adminLogin.user;
        sessionId = adminLogin.sessionId;
      }

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('session_id', sessionId);
      setAuthenticatedUser(user);

      try {
        await preferencesAPI.updateClientPreferences({
          rememberedUsername: rememberMe ? username : '',
          theme,
        });
      } catch {

      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
        variant: 'success',
      });

      const nextPath = user?.role === 'admin' && user?.mustChangePassword ? '/change-password' : from;

      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 500);
    } catch (error: unknown) {
      const parsedError = asApiError(error);
      if (parsedError.cancelled) {
        setLoading(false);
        return;
      }
      console.error(error);

      if (!parsedError.response) {
        setBackendUnreachable(true);
        setLoading(false);
        return;
      }

      const status = parsedError.response?.status;
      const backendMessage = parsedError.response?.data?.message;
      const message =
        status === 403
          ? 'Your account is inactive. Please contact the administrator.'
          : status === 429
            ? (backendMessage || 'Force login is temporarily unavailable. Please try again shortly.')
          : status === 409
            ? (backendMessage || 'Account is already logged in on another device/session.')
            : 'Invalid username or password';
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (usernameError) setUsernameError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const isFormValid = username.trim().length >= 3 && password.length >= 6;
  const conflictDetails = forceLoginConflictMessage.startsWith(CONFLICT_PREFIX)
    ? forceLoginConflictMessage.slice(CONFLICT_PREFIX.length).trim()
    : forceLoginConflictMessage;
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    void preferencesAPI.updateClientPreferences({ theme: nextTheme }).catch(() => {
    });
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-cyan-50 via-slate-50 to-white dark:bg-slate-950">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <Ship className="absolute top-20 right-16 h-24 w-24 text-white/10 rotate-12" />
          <Anchor className="absolute bottom-28 left-20 h-20 w-20 text-white/10 -rotate-12" />
          <Waves className="absolute bottom-0 left-0 w-full h-32 text-blue-800/30" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          <div className="mb-8 transform hover:scale-110 transition-transform duration-300">
            <img src={`${import.meta.env.BASE_URL}login.png`} alt="Isla Sakay Logo" className="w-48 h-48 object-contain" />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-center">Isla Sakay</h1>
          <p className="text-xl text-blue-100 mb-8 text-center max-w-md">
            Boat Management System
          </p>
          <div className="space-y-4 max-w-md">
            <div className="flex items-start gap-3">
              <Anchor className="h-6 w-6 text-blue-300 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Manage Bookings</h3>
                <p className="text-sm text-blue-200">Handle passenger and cargo bookings efficiently</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Ship className="h-6 w-6 text-blue-300 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Boat Operations</h3>
                <p className="text-sm text-blue-200">Track and manage your fleet in real-time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Waves className="h-6 w-6 text-blue-300 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Analytics & Reports</h3>
                <p className="text-sm text-blue-200">Get insights with comprehensive reporting</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-b from-cyan-50 to-white dark:from-slate-950 dark:to-slate-950 p-4 sm:p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-8 h-64 w-64 rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-700/20" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/20" />
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-all duration-300 hover:gap-3 group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 inline-flex items-center gap-3 rounded-full border border-gray-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
          type="button"
        >
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide">
            {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'
          }`}>
            <span
              className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>

        <Card
          className={cn(
            'w-full max-w-md rounded-3xl border border-cyan-200/70 bg-white/90 backdrop-blur shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 transition-all duration-700',
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
            isShaking && 'animate-shake',
          )}>
          <CardHeader className="space-y-2 pb-5 sm:pb-6">
            <div className="inline-flex w-fit items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-cyan-300">
              Admin Control
            </div>
            <div className="lg:hidden mx-auto mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg p-3">
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-slate-100">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-slate-300">
              Sign in to access your admin dashboard
            </CardDescription>
            <div className="login-section-divider" aria-hidden="true">
              <span className="login-divider-line" />
              <span className="login-divider-badge">
                <Anchor className="h-3.5 w-3.5" />
              </span>
              <span className="login-divider-line" />
            </div>
          </CardHeader>
        
          <CardContent>
            {backendUnreachable && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <WifiOff className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                      Connection Failed
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      Unable to reach the server. Please check your internet connection.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={retryConnection}
                      className="mt-3 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
                    >
                      <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
                      Retry Connection
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Username
                </Label>
                <Input
                  ref={usernameRef}
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={loading}
                  title={usernameError || undefined}
                  className={`h-11 rounded-xl bg-white/90 dark:bg-slate-900 ${usernameError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-cyan-500'}`}
                  autoComplete="username"
                />
                {usernameError && (
                  <p className="text-sm text-red-600 animate-in slide-in-from-top">{usernameError}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={loading}
                    title={passwordError || undefined}
                    className={`h-11 rounded-xl bg-white/90 pr-10 dark:bg-slate-900 ${passwordError ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-cyan-500'}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 animate-in slide-in-from-top">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    disabled={loading}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-gray-600 dark:text-slate-300 cursor-pointer select-none"
                  >
                    Remember me
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                className="premium-primary-btn w-full h-11 text-white font-medium text-sm sm:text-base"
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>


              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                    Encrypted
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                    Secure session
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                    Protected API
                  </span>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={forceLoginDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resolveForceLoginChoice(false);
            return;
          }
          setForceLoginDialogOpen(true);
        }}
      >
      <DialogContent
          className="max-w-[560px] border border-blue-200/70 bg-gradient-to-br from-cyan-50 via-white to-blue-50 text-slate-900 shadow-[0_20px_60px_rgba(59,130,246,0.22)] dark:border-blue-500/30 dark:bg-gradient-to-br dark:from-[#0c172a] dark:via-[#101b31] dark:to-[#081329] dark:text-slate-100 dark:shadow-[0_25px_80px_rgba(37,99,235,0.35)] [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Session conflict detected
            </DialogTitle>
            <DialogDescription className="space-y-4 text-base text-slate-700 dark:text-slate-200/90">
              <p>This account is already logged in on another device/session.</p>
              {conflictDetails && (
                <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-slate-700 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-100">
                  {conflictDetails}
                </p>
              )}
              <p>Force login to sign out the other session and continue here.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-3 sm:space-x-0">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border border-slate-300 px-6 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-blue-400/45 dark:text-blue-100 dark:hover:bg-blue-500/15 dark:hover:text-white"
              onClick={() => resolveForceLoginChoice(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={forceLoginCooldownSeconds > 0}
              className="rounded-full border border-blue-300 bg-blue-600 px-7 font-semibold text-white shadow-[0_0_0_3px_rgba(147,197,253,0.45)] hover:bg-blue-500 dark:border-blue-300 dark:bg-blue-400 dark:text-slate-950 dark:shadow-[0_0_0_3px_rgba(59,130,246,0.4)] dark:hover:bg-blue-300"
              onClick={() => resolveForceLoginChoice(true)}
            >
              {forceLoginCooldownSeconds > 0
                ? `Force login (${forceLoginCooldownSeconds})`
                : 'Force login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionReplacedDialogOpen}>
        <DialogContent
          className="max-w-[560px] border border-red-300/35 bg-gradient-to-br from-[#2a171d] via-[#23141b] to-[#1e1117] text-red-50 shadow-[0_25px_80px_rgba(244,63,94,0.25)] [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-xl font-semibold text-red-100">
              Session ended
            </DialogTitle>
            <DialogDescription className="space-y-4 text-base text-red-100/90">
              <p>Your session has ended or was active on another device.</p>
              <p>You were automatically signed out from this device.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-3 sm:space-x-0">
            <Button
              type="button"
              className="rounded-full border border-red-200 bg-red-300 px-7 font-semibold text-red-950 hover:bg-red-200"
              onClick={() => setSessionReplacedDialogOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountChangedDialogOpen}>
        <DialogContent
          className="max-w-[560px] border border-amber-300/35 bg-gradient-to-br from-[#2a2317] via-[#241d14] to-[#1e1811] text-amber-50 shadow-[0_25px_80px_rgba(245,158,11,0.25)] [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-xl font-semibold text-amber-100">
              Account updated
            </DialogTitle>
            <DialogDescription className="space-y-4 text-base text-amber-100/90">
              <p>Your session was ended because your account was changed.</p>
              <p>{accountChangedReason}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-3 sm:space-x-0">
            <Button
              type="button"
              className="rounded-full border border-amber-200 bg-amber-300 px-7 font-semibold text-amber-950 hover:bg-amber-200"
              onClick={() => setAccountChangedDialogOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
