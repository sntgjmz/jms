import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface AdminPasswordDialogProps {
  open: boolean;
  loading: boolean;
  error?: string;
  passwordForm: {
    superAdminPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  onOpenChange: (open: boolean) => void;
  onPasswordFormChange: (next: AdminPasswordDialogProps['passwordForm']) => void;
  onSubmit: () => void;
}

export const AdminPasswordDialog = ({
  open,
  loading,
  error,
  passwordForm,
  onOpenChange,
  onPasswordFormChange,
  onSubmit,
}: AdminPasswordDialogProps) => {
  const isDirty = open && Boolean(
    passwordForm.superAdminPassword.trim() ||
    passwordForm.newPassword.trim() ||
    passwordForm.confirmPassword.trim(),
  );
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isDirty);

  const requestClose = async () => {
    if (loading) return;
    if (!(await confirmDiscard())) return;
    onOpenChange(false);
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        void requestClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Change Admin Password</DialogTitle>
          <DialogDescription>Confirm your super admin password to change the selected admin password.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="superAdminPassword">
              Super admin password
            </label>
            <Input
              id="superAdminPassword"
              type="password"
              value={passwordForm.superAdminPassword}
              onChange={(e) =>
                onPasswordFormChange({
                  ...passwordForm,
                  superAdminPassword: e.target.value,
                })
              }
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="newAdminPassword">
              New admin password
            </label>
            <Input
              id="newAdminPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                onPasswordFormChange({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="confirmAdminPassword">
              Confirm new password
            </label>
            <Input
              id="confirmAdminPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                onPasswordFormChange({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void requestClose()}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={onSubmit}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {discardDialog}
    </>
  );
};
