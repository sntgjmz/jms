import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { useAuth } from '@/contexts/AuthContext';
import { changeAdminPassword } from '@/api/adminService';
import { changeSuperAdminPassword } from '@/api/superadminService';
import { cn } from '@/lib/utils';
import '@/styles/animations.css';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, setAuthenticatedUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 6 &&
      confirmPassword.length >= 6 &&
      newPassword === confirmPassword &&
      !submitting
    );
  }, [confirmPassword, currentPassword, newPassword, submitting]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    if (newPassword.length < 6) {
      showErrorToast('Validation Error', 'New password must be at least 6 characters.');
      triggerShake();
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast('Validation Error', 'Passwords do not match.');
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      if (!user?.username) {
        showErrorToast('Error', 'User session not found. Please log in again.');
        setSubmitting(false);
        return;
      }

      if (user?.role === 'super_admin') {
        await changeSuperAdminPassword({ username: user.username, currentPassword, newPassword });
      } else {
        await changeAdminPassword({ username: user.username, currentPassword, newPassword });
      }

      setAuthenticatedUser({ ...user, mustChangePassword: false });

      showSuccessToast('Demo updated', 'This sample change is local to the demo and resets on reload.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || 'Failed to change password. Please try again.';
      showErrorToast('Error', message);
      setSubmitting(false);
    }
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
          <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),240px] lg:px-5">
            <div className="space-y-2.5">
              <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                Security Desk
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Change Password</h1>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Update your account password before continuing</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1">
              <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Rule</p>
                <p className="mt-1 text-sm font-semibold text-sky-900 dark:text-sky-50">Minimum 6 characters</p>
              </div>
            </div>
          </div>
        </div>

        <Card className={cn('border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78', isShaking && 'animate-shake')}>
          <CardContent className="p-6">
            <div className="mb-5">
              <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Password Form</CardTitle>
              <CardDescription>Enter your current password, then choose a new one.</CardDescription>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={submitting}
                    title={showErrors && !currentPassword ? 'Current password is required' : undefined}
                    className={cn('pr-10', showErrors && !currentPassword && 'border-red-500 focus-visible:ring-red-500')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                    title={showErrors && newPassword.length < 6 ? 'Must be at least 6 characters' : undefined}
                    className={cn('pr-10', showErrors && newPassword.length < 6 && 'border-red-500 focus-visible:ring-red-500')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                    title={showErrors && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
                    className={cn('pr-10', showErrors && newPassword !== confirmPassword && 'border-red-500 focus-visible:ring-red-500')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ChangePasswordPage;
