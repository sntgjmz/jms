import { useEffect, useMemo, useState } from 'react';
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
import type { User } from '@/types/models';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface AdminEditDialogProps {
  open: boolean;
  admin: User | null;
  loading: boolean;
  serverFieldErrors: { username: string; email: string };
  submitError: string;
  onOpenChange: (open: boolean) => void;
  onClearFieldError: (field: 'username' | 'email') => void;
  onSubmit: (payload: { username: string; email: string }) => void;
}

export const AdminEditDialog = ({ open, admin, loading, serverFieldErrors, submitError, onOpenChange, onClearFieldError, onSubmit }: AdminEditDialogProps) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [formSnapshot, setFormSnapshot] = useState('');
  const isDirty = open && JSON.stringify(formData) !== formSnapshot;
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (admin) {
      const next = {
        username: admin.username,
        email: admin.email,
      };
      setFormData(next);
      setFormSnapshot(JSON.stringify(next));
    }
  }, [admin, open]);

  const errors = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    return {
      username: formData.username.trim().length < 3 ? 'Username must be at least 3 characters.' : serverFieldErrors.username,
      email: emailValid ? serverFieldErrors.email : 'Enter a valid email address.',
    };
  }, [formData, serverFieldErrors.email, serverFieldErrors.username]);

  const hasErrors = Object.values(errors).some((value) => value);

  const requestClose = async () => {
    if (loading) return;
    if (!(await confirmDiscard())) return;
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }
      void requestClose();
    }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Admin Details</DialogTitle>
          <DialogDescription>Update the admin account details below.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="editAdminUsername">Username *</Label>
            <Input
              id="editAdminUsername"
              value={formData.username}
              onChange={(e) => {
                onClearFieldError('username');
                setFormData((prev) => ({ ...prev, username: e.target.value }));
              }}
              disabled={loading}
            />
            {errors.username && <p className="text-xs text-rose-600">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="editAdminEmail">Email *</Label>
            <Input
              id="editAdminEmail"
              type="email"
              value={formData.email}
              onChange={(e) => {
                onClearFieldError('email');
                setFormData((prev) => ({ ...prev, email: e.target.value.toLowerCase() }));
              }}
              disabled={loading}
            />
            {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
          </div>

        </div>
        {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void requestClose()}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || hasErrors}
            onClick={() =>
              onSubmit({
                username: formData.username.trim(),
                email: formData.email.trim(),
              })
            }
          >
            {loading ? 'Updating...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {discardDialog}
    </>
  );
};
