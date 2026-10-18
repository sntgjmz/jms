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

interface BoatOperatorEditConfirmDialogProps {
  open: boolean;
  loading: boolean;
  confirmPassword: string;
  changes: { label: string; value: string }[];
  onOpenChange: (open: boolean) => void;
  onConfirmPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

export const BoatOperatorEditConfirmDialog = ({
  open,
  loading,
  confirmPassword,
  changes,
  onOpenChange,
  onConfirmPasswordChange,
  onConfirm,
}: BoatOperatorEditConfirmDialogProps) => {
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
          <DialogDescription>Enter your password to save these operator changes.</DialogDescription>
        </DialogHeader>
        {changes.length > 0 && (
          <div className="rounded-lg border bg-white p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Changes</p>
            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {changes.map((item) => (
                <p key={item.label}>
                  <span className="text-slate-500">{item.label}:</span> {item.value}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="confirmOperatorEditPassword">
            Account password
          </label>
          <Input
            id="confirmOperatorEditPassword"
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
