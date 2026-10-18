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
import type { BoatOperator } from '@/types/models';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface BoatOperatorConfirmDialogProps {
  open: boolean;
  operator: BoatOperator | null;
  loading: boolean;
  confirmPassword: string;
  confirmName: string;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirmPasswordChange: (value: string) => void;
  onConfirmNameChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BoatOperatorConfirmDialog = ({
  open,
  operator,
  loading,
  confirmPassword,
  confirmName,
  error,
  onOpenChange,
  onConfirmPasswordChange,
  onConfirmNameChange,
  onConfirm,
  onCancel,
}: BoatOperatorConfirmDialogProps) => {
  const isDirty = open && Boolean(confirmPassword.trim() || confirmName.trim());
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isDirty);

  const requestClose = async () => {
    if (loading) return;
    if (!(await confirmDiscard())) return;
    onCancel();
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
          <DialogTitle>Delete Operator</DialogTitle>
          <DialogDescription>
            This will permanently delete {operator?.name || 'this operator'}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="confirmSuperAdminPassword">
            Account password
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
        {operator && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="confirmOperatorName">
              Type "{operator.name}" to confirm
            </label>
            <Input
              id="confirmOperatorName"
              type="text"
              value={confirmName}
              onChange={(e) => onConfirmNameChange(e.target.value)}
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
          <Button variant="outline" onClick={() => void requestClose()} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {discardDialog}
    </>
  );
};
