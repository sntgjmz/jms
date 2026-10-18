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

interface AdminEditConfirmDialogProps {
  open: boolean;
  loading: boolean;
  confirmPassword: string;
  changes: { label: string; value: string }[];
  onOpenChange: (open: boolean) => void;
  onConfirmPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

export const AdminEditConfirmDialog = ({
  open,
  loading,
  confirmPassword,
  changes,
  onOpenChange,
  onConfirmPasswordChange,
  onConfirm,
}: AdminEditConfirmDialogProps) => {
  const isDirty = open && Boolean(confirmPassword.trim());
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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Confirm Edit</DialogTitle>
          <DialogDescription>Enter your password to save these admin changes.</DialogDescription>
        </DialogHeader>
        {changes.length > 0 && (
          <div className="rounded-lg border bg-white p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Changes</p>
            {changes.map((item) => (
              <p key={item.label} className="mt-2">
                <span className="text-slate-500">{item.label}:</span> {item.value}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="confirmAdminEditPassword">
            Account password
          </label>
          <Input
            id="confirmAdminEditPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void requestClose()}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={onConfirm}>
            {loading ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {discardDialog}
    </>
  );
};
