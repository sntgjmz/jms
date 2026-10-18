import { useEffect, useMemo, useRef, useState } from 'react';
import type { UserStatus } from '@/types/models';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, Eye, EyeOff, User, Mail, Shield, Lock, CheckCircle2, Phone } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { pushBellNotification } from '@/lib/notification-helpers';
import { checkAdminUsername, createAdmin } from '@/api/adminService';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { cn } from '@/lib/utils';
import { BirthDatePicker } from '@/components/BirthDatePicker';
import '@/styles/animations.css';

type PasswordMode = 'temporary' | 'custom';
type FormStep = 1 | 2 | 3;
const USERNAME_RULE = /^(?=.{3,12}$)(?=(?:.*\d){0,2}$)[A-Za-z0-9]+$/;

const generateTemporaryPassword = (length: number = 12) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 11);
const sanitizeUsername = (value: string) => value.replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);

interface AddAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAdminModal = ({ open, onOpenChange }: AddAdminModalProps) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('temporary');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [hasFocused, setHasFocused] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [serverFieldErrors, setServerFieldErrors] = useState({
    username: '',
    email: '',
  });
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    birthday: '',
    password: '',
    confirmPassword: '',
    status: 'active' as UserStatus,
  });
  const isDirty = useMemo(() => {
    return Object.values(formData).some(val => val !== '' && val !== 'active');
  }, [formData]);

  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(open && isDirty);

  const useTemporaryPassword = passwordMode === 'temporary';

  const usernameError = useMemo(() => {
    const value = formData.username.trim();
    if (value.length === 0) return '';
    if (!USERNAME_RULE.test(value)) return 'Use letters and numbers only, no spaces, max 12 characters, and up to 2 numbers.';
    if (serverFieldErrors.username) return serverFieldErrors.username;
    if (usernameStatus === 'taken') return 'Username is already taken.';
    return '';
  }, [formData.username, serverFieldErrors.username, usernameStatus]);

  const nameError = useMemo(() => {
    const value = formData.name.trim();
    if (value.length === 0) return '';
    if (value.length < 2) return 'Name must be at least 2 characters.';
    return '';
  }, [formData.name]);

  const emailError = useMemo(() => {
    const value = formData.email.trim();
    if (value.length === 0) return '';
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isValid) return 'Enter a valid email address.';
    if (serverFieldErrors.email) return serverFieldErrors.email;
    return '';
  }, [formData.email, serverFieldErrors.email]);

  const phoneError = useMemo(() => {
    const value = formData.phone.trim();
    if (value.length === 0) return '';
    if (value.length < 7) return 'Phone number looks too short.';
    return '';
  }, [formData.phone]);

  const birthdayError = useMemo(() => {
    if (!formData.birthday) return 'Birthday is required.';
    const birthDate = new Date(formData.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) return 'Admin must be at least 18 years old.';
    return '';
  }, [formData.birthday]);

  const passwordStrength = useMemo(() => {
    const value = formData.password;
    if (value.length === 0) return { label: 'No password', color: 'text-slate-500' };
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    if (score <= 1) return { label: 'Weak', color: 'text-rose-600' };
    if (score === 2) return { label: 'Fair', color: 'text-amber-600' };
    if (score === 3) return { label: 'Good', color: 'text-emerald-600' };
    return { label: 'Strong', color: 'text-emerald-700' };
  }, [formData.password]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleNextStep = () => {
    setShowErrors(true);
    if (formStep === 1) {
      if (!formData.name || !formData.birthday || nameError || birthdayError) {
        triggerShake();
        return;
      }
      setFormStep(2);
      setShowErrors(false);
    } else if (formStep === 2) {
      if (!formData.username || !formData.email || !formData.phone || usernameError || emailError || phoneError || usernameStatus === 'checking' || usernameStatus === 'taken') {
        triggerShake();
        return;
      }
      setFormStep(3);
      setShowErrors(false);
    }
  };

  const handleBackStep = () => {
    setFormStep((prev) => (prev - 1) as FormStep);
    setShowErrors(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!formData.password) {
      triggerShake();
      return;
    }
    if (!useTemporaryPassword && formData.password !== formData.confirmPassword) {
      triggerShake();
      return;
    }
    if (formData.password.length < 6) {
      triggerShake();
      return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      await createAdmin({
        username: formData.username.trim(),
        fullName: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        contactNumber: formData.phone.trim(),
        birthday: formData.birthday,
        password: formData.password,
        status: formData.status,
        requirePasswordChange: useTemporaryPassword,
      });

      showSuccessToast('Admin Created', `Admin account "${formData.username}" has been created successfully.`);
      await handleClose(true);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create admin. Please try again.';
      const normalized = String(message).toLowerCase();
      if (normalized.includes('username')) {
        setServerFieldErrors((prev) => ({ ...prev, username: message }));
        setFormStep(2);
      } else if (normalized.includes('email')) {
        setServerFieldErrors((prev) => ({ ...prev, email: message }));
        setFormStep(2);
      } else {
        setSubmitError(message);
      }
      showErrorToast('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (force = false) => {
    if (!loading) {
      const shouldClose = force ? true : await confirmDiscard();
      if (!shouldClose) return;
      setFormData({
        username: '',
        name: '',
        email: '',
        phone: '',
        birthday: '',
        password: '',
        confirmPassword: '',
        status: 'active',
      });
      setPasswordMode('temporary');
      setFormStep(1);
      setShowPassword(false);
      setUsernameStatus('idle');
      setShowErrors(false);
      setHasFocused(false);
      setSubmitError('');
      setServerFieldErrors({ username: '', email: '' });
      onOpenChange(false);
    }
  };

  const generateAndSetTempPassword = () => {
    const temp = generateTemporaryPassword(12);
    setFormData((prev) => ({
      ...prev,
      password: temp,
      confirmPassword: temp,
    }));
    setShowPassword(true);
  };

  useEffect(() => {
    if (open) {
      if (!hasFocused) {
        setTimeout(() => nameRef.current?.focus(), 0);
        setHasFocused(true);
      }
      if (passwordMode === 'temporary' && !formData.password) {
        generateAndSetTempPassword();
      }
    }
  }, [open, passwordMode, formData.password, hasFocused]);

  useEffect(() => {
    const value = formData.username.trim();
    if (!open) return;
    if (value.length < 3) {
      setUsernameStatus(value.length === 0 ? 'idle' : 'error');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const available = await checkAdminUsername(value);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.username, open]);

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      pushBellNotification({
        title: 'Copied',
        message: 'Temporary password copied to clipboard.',
        type: 'system',
        priority: 'low',
      });
    } catch (err) {
      console.error(err);
      showErrorToast('Copy failed', 'Could not copy password. Please copy it manually.');
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setFormStep(1);
            onOpenChange(true);
            return;
          }
          void handleClose();
        }}
      >
        <DialogContent className={cn("max-h-[90vh] overflow-hidden border-slate-200 bg-white p-0 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[600px]", isShaking && "animate-shake")}>
          <DialogHeader className="border-b border-slate-100 px-6 pb-5 pt-6 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  {formStep === 1 ? 'Admin Profile' : formStep === 2 ? 'Account & Contact' : 'Security Setup'}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-sm text-slate-500 dark:text-slate-300">
                  {formStep === 1 ? 'Personal details and age validation.' : formStep === 2 ? 'System username and contact channels.' : 'Password configuration and status.'}
                </DialogDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                {formStep === 1 && <User className="h-5 w-5" />}
                {formStep === 2 && <Mail className="h-5 w-5" />}
                {formStep === 3 && <Shield className="h-5 w-5" />}
              </div>
            </div>
            {/* Visual Stepper */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 flex-1 rounded-full transition-colors", formStep >= 1 ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")} />
                  <div className={cn("h-2 flex-1 rounded-full transition-colors", formStep >= 2 ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")} />
                  <div className={cn("h-2 flex-1 rounded-full transition-colors", formStep >= 3 ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")} />
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Step {formStep} of 3</span>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-170px)] space-y-5 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: 'stable' }}>
            {formStep === 1 && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Personal Details</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminName">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="adminName"
                        ref={nameRef}
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={loading}
                        title={showErrors && nameError ? nameError : undefined}
                        className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", showErrors && nameError && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {showErrors && nameError && <p className="text-xs text-rose-600">{nameError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminBirthday">Birthday <span className="text-red-500">*</span></Label>
                      <BirthDatePicker
                        value={formData.birthday}
                        onChange={(val) => setFormData((prev) => ({ ...prev, birthday: val }))}
                        disabled={loading}
                        hasError={showErrors && !!birthdayError}
                        errorMessage={showErrors && birthdayError ? birthdayError : undefined}
                      />
                      {showErrors && birthdayError && <p className="text-xs text-rose-600">{birthdayError}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Account Username</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="username"
                        ref={usernameRef}
                        value={formData.username}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, username: sanitizeUsername(value) });
                          if (serverFieldErrors.username) {
                            setServerFieldErrors((prev) => ({ ...prev, username: '' }));
                          }
                        }}
                        disabled={loading}
                        autoComplete="off"
                        title={showErrors && usernameError ? usernameError : undefined}
                        className={cn("border-slate-200 bg-white pr-10 dark:border-white/10 dark:bg-slate-950/50", showErrors && usernameError && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {usernameStatus === 'checking' && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
                      {usernameStatus === 'available' && !usernameError && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />}
                    </div>
                    {showErrors && usernameError && <p className="text-xs text-rose-600">{usernameError}</p>}
                    {!usernameError && usernameStatus === 'available' && (
                      <p className="text-xs text-emerald-600">Username is available.</p>
                    )}
                    {!usernameError && usernameStatus === 'taken' && (
                      <p className="text-xs text-rose-600">Username is already taken.</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No spaces. Letters and numbers only. Maximum 12 characters with up to 2 numbers.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Contact Channels</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase();
                          setFormData({ ...formData, email: value });
                          if (serverFieldErrors.email) {
                            setServerFieldErrors((prev) => ({ ...prev, email: '' }));
                          }
                        }}
                        disabled={loading}
                        autoComplete="off"
                        title={showErrors && emailError ? emailError : undefined}
                        className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", showErrors && emailError && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {showErrors && emailError && <p className="text-xs text-rose-600">{emailError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: sanitizePhoneNumber(e.target.value) })}
                        disabled={loading}
                        title={showErrors && phoneError ? phoneError : undefined}
                        className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", showErrors && phoneError && "border-red-500 focus-visible:ring-red-500")}
                        placeholder="09XXXXXXXXX"
                      />
                      {showErrors && phoneError && <p className="text-xs text-rose-600">{phoneError}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Password Configuration</p>
                  </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="passwordMode"
                    value="temporary"
                    checked={passwordMode === 'temporary'}
                    onChange={() => {
                      setPasswordMode('temporary');
                      if (!formData.password) {
                        generateAndSetTempPassword();
                      } else {
                        setFormData((prev) => ({ ...prev, confirmPassword: prev.password }));
                      }
                    }}
                    disabled={loading}
                  />
                  Temporary (recommended)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="passwordMode"
                    value="custom"
                    checked={passwordMode === 'custom'}
                    onChange={() => {
                      setPasswordMode('custom');
                      setShowPassword(false);
                      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
                    }}
                    disabled={loading}
                  />
                  Custom
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Temporary passwords should be shared securely. Admins will be prompted to update on first login.
              </p>
            </div>

            {useTemporaryPassword ? (
              <div className="rounded-md border border-slate-200 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">Temporary password</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={generateAndSetTempPassword}>
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || !formData.password}
                      onClick={copyTempPassword}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Click regenerate to create a password"
                      value={formData.password}
                      readOnly
                      disabled={loading}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || !formData.password}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-4 w-4" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" /> Show
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || !formData.password}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-4 w-4" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" /> Show
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={loading}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <p className={`text-xs ${passwordStrength.color}`}>
                    Password strength: {passwordStrength.label}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  {!useTemporaryPassword &&
                    formData.confirmPassword.length > 0 &&
                    formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-rose-600">Passwords do not match.</p>
                    )}
                </div>
              </>
            )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Account Status</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Initial Status <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>
            )}
            {submitError && (
              <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                {submitError}
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-slate-100 bg-white/80 px-6 py-4 backdrop-blur sm:justify-between dark:border-white/10 dark:bg-slate-950/80">
            <div className="flex items-center">
              {formStep > 1 && (
                <Button type="button" variant="outline" disabled={loading} onClick={handleBackStep} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={loading} onClick={() => void handleClose()} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              Cancel
            </Button>
            {formStep < 3 ? (
              <Button type="button" disabled={loading} className="min-w-[140px] bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400" onClick={handleNextStep}>
                {formStep === 1 ? 'Next: Contact' : 'Next: Security'}
              </Button>
            ) : (
              <form onSubmit={handleSubmit}>
              <Button type="submit" disabled={loading} className="min-w-[140px] gap-2 bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Admin
                  </>
                )}
              </Button>
              </form>
            )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {discardDialog}
    </>
  );
};
