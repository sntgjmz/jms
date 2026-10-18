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

interface BoatOperatorStatusConfirmDialogProps {
  open: boolean;
  loading: boolean;
  operator: BoatOperator | null;
  confirmPassword: string;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirmPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

export const BoatOperatorStatusConfirmDialog = ({
  open,
  loading,
  operator,
  confirmPassword,
  error,
  onOpenChange,
  onConfirmPasswordChange,
  onConfirm,
}: BoatOperatorStatusConfirmDialogProps) => {
  const nextAction = operator?.status === 'active' ? 'Deactivate' : 'Activate';
  const title = `${nextAction} Operator`;
  const description = `Enter your account password to ${nextAction.toLowerCase()} this operator.`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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

        {error && (
          <p className="rounded-md border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={onConfirm}>
            {loading ? 'Processing...' : nextAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
