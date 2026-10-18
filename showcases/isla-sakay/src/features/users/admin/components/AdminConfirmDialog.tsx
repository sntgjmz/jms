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
import type { User } from '@/types/models';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface AdminConfirmDialogProps {
  open: boolean;
  loading: boolean;
  error?: string;
  confirmAction: 'deactivate' | 'activate' | 'delete' | null;
  confirmPassword: string;
  confirmUsername: string;
  selectedAdmin: User | null;
  onOpenChange: (open: boolean) => void;
  onConfirmPasswordChange: (value: string) => void;
  onConfirmUsernameChange: (value: string) => void;
  onConfirm: () => void;
}

export const AdminConfirmDialog = ({
  open,
  loading,
  error,
  confirmAction,
  confirmPassword,
  confirmUsername,
  selectedAdmin,
  onOpenChange,
  onConfirmPasswordChange,
  onConfirmUsernameChange,
  onConfirm,
}: AdminConfirmDialogProps) => {
  const isDirty = open && Boolean(confirmPassword.trim() || confirmUsername.trim());
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isDirty);

  const requestClose = async () => {
    if (loading) return;
    if (!(await confirmDiscard())) return;
    onOpenChange(false);
  };

  const title =
    confirmAction === 'delete'
      ? 'Delete Admin Account'
      : confirmAction === 'deactivate'
      ? 'Deactivate Admin Account'
      : 'Activate Admin Account';

  const actionLabel =
    confirmAction === 'delete' ? 'Delete' : confirmAction === 'deactivate' ? 'Deactivate' : 'Activate';

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
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter your super admin password to confirm this action.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="confirmSuperAdminPassword">
            Super admin password
          </label>
          <Input
            id="confirmSuperAdminPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        {confirmAction === 'delete' && selectedAdmin && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="confirmUsername">
              Type "{selectedAdmin.username}" to confirm
            </label>
            <Input
              id="confirmUsername"
              type="text"
              value={confirmUsername}
              onChange={(e) => onConfirmUsernameChange(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>
        )}

        {error && (
          <p className="rounded-md border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void requestClose()}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmAction === 'delete' ? 'destructive' : 'default'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Processing...' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {discardDialog}
    </>
  );
};
