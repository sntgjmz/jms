import { useEffect, useMemo, useRef, useState } from 'react';
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
import { UserPlus, Loader2, Eye, EyeOff, User, CreditCard, Mail, Phone, Shield, Lock, CheckCircle2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { pushBellNotification } from '@/lib/notification-helpers';
import type { BoatOperator } from '@/types/models';
import { checkBoatOperatorEmail, checkBoatOperatorLicense, checkBoatOperatorUsername, createBoatOperator } from '@/api/boatOperatorService';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { cn } from '@/lib/utils';
import { BirthDatePicker } from '@/components/BirthDatePicker';
import '@/styles/animations.css';

interface AddBoatOperatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (operator: BoatOperator) => void;
}

type PasswordMode = 'temporary' | 'custom';
type FormStep = 1 | 2 | 3;
const USERNAME_RULE = /^(?=.{3,12}$)(?=(?:.*\d){0,2}$)[A-Za-z0-9]+$/;

const generateTemporaryPassword = (length: number = 12) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

const sanitizeLicenseNumber = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 11);
const sanitizeUsername = (value: string) => value.replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);

export const AddBoatOperatorModal = ({ open, onOpenChange, onCreate }: AddBoatOperatorModalProps) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('temporary');
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [licenseStatus, setLicenseStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [serverFieldErrors, setServerFieldErrors] = useState({
    username: '',
    email: '',
    licenseNumber: '',
  });
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    licenseNumber: '',
    operatorType: 'banca' as BoatOperator['operatorType'],
    email: '',
    phone: '',
    birthday: '',
    password: '',
    confirmPassword: '',
    status: 'active' as BoatOperator['status'],
  });
  const isDirty = useMemo(() => {
    return (
      formData.username.trim() !== '' ||
      formData.name.trim() !== '' ||
      formData.licenseNumber.trim() !== '' ||
      formData.email.trim() !== '' ||
      formData.phone.trim() !== '' ||
      formData.birthday.trim() !== '' ||
      formData.password !== '' ||
      formData.operatorType !== 'banca'
    );
  }, [formData]);
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(open && isDirty);

  const useTemporaryPassword = passwordMode === 'temporary';

  const triggerShake = () => {
    setIsShaking(true);
    window.setTimeout(() => setIsShaking(false), 400);
  };

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
    if (value.length < 3) return 'Name must be at least 3 characters.';
    return '';
  }, [formData.name]);

  const licenseError = useMemo(() => {
    const value = formData.licenseNumber.trim();
    if (value.length === 0) return 'License is required.';
    if (!/^[A-Z0-9-]{6,20}$/.test(value)) return 'Use 6-20 characters: letters, numbers, and hyphens only.';
    if (licenseStatus === 'taken') return 'License number already exists.';
    if (serverFieldErrors.licenseNumber) return serverFieldErrors.licenseNumber;
    return '';
  }, [formData.licenseNumber, licenseStatus, serverFieldErrors.licenseNumber]);

  const phoneError = useMemo(() => {
    const value = formData.phone.trim();
    if (value.length === 0) return 'Contact number is required.';
    if (value.length < 7) return 'Phone number looks too short.';
    return '';
  }, [formData.phone]);

  const emailError = useMemo(() => {
    const value = formData.email.trim();
    if (value.length === 0) return 'Email is required.';
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isValid) return 'Enter a valid email address.';
    if (emailStatus === 'taken') return 'Email is already taken.';
    if (serverFieldErrors.email) return serverFieldErrors.email;
    return '';
  }, [emailStatus, formData.email, serverFieldErrors.email]);

  const passwordError = useMemo(() => {
    const value = formData.password;
    if (value.length === 0) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }, [formData.password]);

  const birthdayError = useMemo(() => {
    if (!formData.birthday) return 'Birthday is required.';
    const birthDate = new Date(formData.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) return 'Operator must be at least 18 years old.';
    return '';
  }, [formData.birthday]);

  const handleClose = async (force = false) => {
    if (!loading) {
      const shouldClose = force ? true : await confirmDiscard();
      if (!shouldClose) return;
      setFormData({
        username: '',
        name: '',
        licenseNumber: '',
        operatorType: 'banca',
        email: '',
        phone: '',
        birthday: '',
        password: '',
        confirmPassword: '',
        status: 'active',
      });
      setShowPassword(false);
      setPasswordMode('temporary');
      setFormStep(1);
      setShowErrors(false);
      setUsernameStatus('idle');
      setLicenseStatus('idle');
      setEmailStatus('idle');
      setSubmitError('');
      setServerFieldErrors({ username: '', email: '', licenseNumber: '' });
      onOpenChange(false);
    }
  };

  const handleNextStep = () => {
    setShowErrors(true);
    if (formStep === 1) {
      if (!formData.name || !formData.birthday || !formData.licenseNumber) return;
      if (nameError || birthdayError || licenseError || licenseStatus === 'checking' || licenseStatus === 'taken') return;
      setFormStep(2);
      setShowErrors(false);
    } else if (formStep === 2) {
      if (!formData.username || !formData.email || !formData.phone) return;
      if (usernameError || emailError || phoneError) return;
      if (usernameStatus === 'checking' || usernameStatus === 'taken') return;
      if (emailStatus === 'checking' || emailStatus === 'taken') return;
      setFormStep(3);
      setShowErrors(false);
    }
  };

  const handleBackStep = () => {
    setFormStep((prev) => (prev - 1) as FormStep);
    setShowErrors(false);
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

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      pushBellNotification({
        title: 'Copied',
        message: 'Temporary password copied to clipboard.',
        type: 'system',
        priority: 'low',
      });
    } catch {
      showErrorToast('Copy failed', 'Could not copy password. Please copy it manually.');
    }
  };

  useEffect(() => {
    if (open && passwordMode === 'temporary' && !formData.password) {
      generateAndSetTempPassword();
    }
  }, [open, passwordMode, formData.password]);

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
        const available = await checkBoatOperatorUsername(value);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.username, open]);

  useEffect(() => {
    const value = formData.licenseNumber.trim();
    if (!open) return;
    if (!value || !/^[A-Z0-9-]{6,20}$/.test(value)) {
      setLicenseStatus(value.length === 0 ? 'idle' : 'error');
      return;
    }
    setLicenseStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const available = await checkBoatOperatorLicense(value);
        setLicenseStatus(available ? 'available' : 'taken');
      } catch {
        setLicenseStatus('error');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.licenseNumber, open]);

  useEffect(() => {
    const value = formData.email.trim().toLowerCase();
    if (!open) return;
    if (!value) {
      setEmailStatus('idle');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailStatus('error');
      return;
    }
    setEmailStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const available = await checkBoatOperatorEmail(value);
        setEmailStatus(available ? 'available' : 'taken');
      } catch {
        setEmailStatus('error');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.email, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!formData.password) {
      triggerShake();
      return;
    }
    if (passwordError) {
      triggerShake();
      return;
    }
    if (!useTemporaryPassword && formData.password !== formData.confirmPassword) {
      triggerShake();
      return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      const created = await createBoatOperator({
        username: formData.username.trim(),
        fullName: formData.name.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        operatorType: formData.operatorType || 'banca',
        email: formData.email.trim(),
        contactNumber: formData.phone.trim(),
        birthday: formData.birthday,
        password: formData.password,
        isActive: formData.status === 'active',
        requirePasswordChange: useTemporaryPassword,
      });
      onCreate(created);
      showSuccessToast('Operator Added', `Operator "${created.name}" has been created.`);
      await handleClose(true);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create operator. Please try again.';
      const normalized = String(message).toLowerCase();
      if (normalized.includes('username')) {
        setServerFieldErrors((prev) => ({ ...prev, username: message }));
        setFormStep(2);
      } else if (normalized.includes('email')) {
        setServerFieldErrors((prev) => ({ ...prev, email: message }));
        setFormStep(2);
      } else if (normalized.includes('license')) {
        setServerFieldErrors((prev) => ({ ...prev, licenseNumber: message }));
        setFormStep(1);
      } else {
        setSubmitError(message);
      }
      showErrorToast('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            void handleClose();
            return;
          }
          setFormStep(1);
          onOpenChange(true);
          if (next) {
            if (passwordMode === 'temporary' && !formData.password) {
              const temp = generateTemporaryPassword(12);
              setFormData((prev) => ({
                ...prev,
                password: temp,
                confirmPassword: temp,
              }));
              setShowPassword(true);
            }
          }
        }}
      >
        <DialogContent className={cn("max-h-[90vh] overflow-hidden border-slate-200 bg-white p-0 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[600px]", isShaking && "animate-shake")}>
          <DialogHeader className="border-b border-slate-100 px-6 pb-5 pt-6 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  {formStep === 1 ? 'Operator Profile' : formStep === 2 ? 'Contact & Account' : 'Security Setup'}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-sm text-slate-500 dark:text-slate-300">
                  {formStep === 1 ? 'Personal details and license information.' : formStep === 2 ? 'System username and contact channels.' : 'Password configuration and status.'}
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
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Operator Type & Details</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operatorType">Operator Type <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.operatorType ?? 'banca'}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, operatorType: value as 'cargo' | 'banca' }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger id="operatorType" className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banca">Banca</SelectItem>
                        <SelectItem value="cargo">Cargo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="operatorName">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="operatorName"
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
                      <Label htmlFor="operatorBirthday">Birthday <span className="text-red-500">*</span></Label>
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

                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">License & Type</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="operatorLicense">License Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="operatorLicense"
                        value={formData.licenseNumber}
                        onChange={(e) =>
                          setFormData((prev) => {
                            if (serverFieldErrors.licenseNumber) {
                              setServerFieldErrors((current) => ({ ...current, licenseNumber: '' }));
                            }
                            return { ...prev, licenseNumber: sanitizeLicenseNumber(e.target.value) };
                          })
                        }
                        disabled={loading}
                        title={showErrors && licenseError ? licenseError : undefined}
                        className={cn("border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50", showErrors && licenseError && "border-red-500 focus-visible:ring-red-500")}
                        placeholder="e.g. BOAT-2026-0142"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Use the actual issued license number. Letters, numbers, and hyphens only.</p>
                      {showErrors && licenseError && <p className="text-xs text-rose-600">{licenseError}</p>}
                      {!licenseError && licenseStatus === 'available' && (
                        <p className="text-xs text-emerald-600">License number is available.</p>
                      )}
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
                    <Label htmlFor="operatorUsername">Username <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="operatorUsername"
                        ref={usernameRef}
                        value={formData.username}
                        onChange={(e) =>
                          setFormData((prev) => {
                            if (serverFieldErrors.username) {
                              setServerFieldErrors((current) => ({ ...current, username: '' }));
                            }
                            return { ...prev, username: sanitizeUsername(e.target.value) };
                          })
                        }
                        disabled={loading}
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
                      <Label htmlFor="operatorEmail">Email Address <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="operatorEmail"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => {
                              if (serverFieldErrors.email) {
                                setServerFieldErrors((current) => ({ ...current, email: '' }));
                              }
                              return { ...prev, email: e.target.value.toLowerCase() };
                            })
                          }
                          disabled={loading}
                          title={showErrors && emailError ? emailError : undefined}
                          className={cn("border-slate-200 bg-white pr-10 dark:border-white/10 dark:bg-slate-950/50", showErrors && emailError && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {emailStatus === 'checking' && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
                        {emailStatus === 'available' && !emailError && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />}
                      </div>
                      {showErrors && emailError && <p className="text-xs text-rose-600">{emailError}</p>}
                      {!emailError && emailStatus === 'available' && (
                        <p className="text-xs text-emerald-600">Email is available.</p>
                      )}
                      {!emailError && emailStatus === 'taken' && (
                        <p className="text-xs text-rose-600">Email is already taken.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operatorContact">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="operatorContact"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: sanitizePhoneNumber(e.target.value) }))}
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
                  
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="passwordMode"
                      value="temporary"
                      checked={passwordMode === 'temporary'}
                      onChange={() => {
                      setPasswordMode('temporary');
                      generateAndSetTempPassword();
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
                  Temporary passwords should be shared securely. Operators will be prompted to update on first login.
                </p>

                {useTemporaryPassword ? (
                  <div className="rounded-md border border-slate-200 p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">Temporary password</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          onClick={generateAndSetTempPassword}
                        >
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
                      <Label htmlFor="operatorPassword">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="operatorPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          readOnly
                          disabled={loading}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={loading || !formData.password}
                          onClick={() => setShowPassword((prev) => !prev)}
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
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="operatorPassword">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="operatorPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                          disabled={loading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {showErrors && passwordError && <p className="text-xs text-rose-600">{passwordError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operatorConfirmPassword">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="operatorConfirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        disabled={loading}
                      />
                      {showErrors &&
                        formData.confirmPassword.length > 0 &&
                        formData.password !== formData.confirmPassword && (
                        <p className="text-xs text-rose-600">Passwords do not match.</p>
                      )}
                    </div>
                  </div>
                )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Account Status</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operatorStatus">Initial Status <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: BoatOperator['status']) =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger id="operatorStatus" className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50">
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
                    Add Operator
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
