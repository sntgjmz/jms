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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BoatOperator } from '@/types/models';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface BoatOperatorEditDialogProps {
  open: boolean;
  operator: BoatOperator | null;
  loading: boolean;
  serverFieldErrors: { username: string; email: string; licenseNumber: string };
  submitError: string;
  onOpenChange: (open: boolean) => void;
  onClearFieldError: (field: 'username' | 'email' | 'licenseNumber') => void;
  onSubmit: (payload: {
    username: string;
    fullName: string;
    licenseNumber: string;
    operatorType: 'cargo' | 'banca';
    email: string;
    contactNumber: string;
    birthday: string;
  }) => void;
}

export const BoatOperatorEditDialog = ({
  open,
  operator,
  loading,
  serverFieldErrors,
  submitError,
  onOpenChange,
  onClearFieldError,
  onSubmit,
}: BoatOperatorEditDialogProps) => {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    licenseNumber: '',
    operatorType: 'banca' as 'cargo' | 'banca',
    email: '',
    contactNumber: '',
    birthday: '',
  });
  const [formSnapshot, setFormSnapshot] = useState('');
  const isDirty = open && JSON.stringify(formData) !== formSnapshot;
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (operator) {
      const next = {
        username: operator.username || '',
        fullName: operator.name || '',
        licenseNumber: operator.licenseNumber || '',
        operatorType: (operator.operatorType || 'banca') as 'cargo' | 'banca',
        email: operator.email || '',
        contactNumber: operator.phone || '',
        birthday: operator.birthday || '',
      };
      setFormData(next);
      setFormSnapshot(JSON.stringify(next));
    }
  }, [operator, open]);

  const errors = useMemo(() => {
    return {
      username: formData.username.trim().length < 3 ? 'Username must be at least 3 characters.' : serverFieldErrors.username,
      fullName: formData.fullName.trim().length < 3 ? 'Name must be at least 3 characters.' : '',
      licenseNumber: /^[A-Z0-9-]{6,20}$/.test(formData.licenseNumber.trim()) ? serverFieldErrors.licenseNumber : 'Use 6-20 characters: letters, numbers, and hyphens only.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) ? serverFieldErrors.email : 'Enter a valid email address.',
      contactNumber: formData.contactNumber.trim().length < 7 ? 'Phone number looks too short.' : '',
      birthday: formData.birthday ? '' : 'Birthday is required.',
    };
  }, [formData, serverFieldErrors.email, serverFieldErrors.licenseNumber, serverFieldErrors.username]);

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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Boat Operator</DialogTitle>
          <DialogDescription>Update the operator profile information below.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editOperatorUsername">Username *</Label>
              <Input
                id="editOperatorUsername"
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
              <Label htmlFor="editOperatorName">Full Name *</Label>
              <Input
                id="editOperatorName"
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                disabled={loading}
              />
              {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editOperatorEmail">Email *</Label>
              <Input
                id="editOperatorEmail"
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
            <div className="space-y-2">
              <Label htmlFor="editOperatorContact">Contact number *</Label>
              <Input
                id="editOperatorContact"
                value={formData.contactNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                disabled={loading}
              />
              {errors.contactNumber && <p className="text-xs text-rose-600">{errors.contactNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editOperatorLicense">License number *</Label>
              <Input
                id="editOperatorLicense"
                value={formData.licenseNumber}
                onChange={(e) => {
                  onClearFieldError('licenseNumber');
                  setFormData((prev) => ({
                    ...prev,
                    licenseNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, ''),
                  }));
                }}
                disabled={loading}
              />
              {errors.licenseNumber && <p className="text-xs text-rose-600">{errors.licenseNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOperatorType">Operator type *</Label>
              <Select
                value={formData.operatorType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, operatorType: value as 'cargo' | 'banca' }))
                }
                disabled={loading}
              >
                <SelectTrigger id="editOperatorType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banca">Banca</SelectItem>
                  <SelectItem value="cargo">Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editOperatorBirthday">Birthday *</Label>
              <Input
                id="editOperatorBirthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData((prev) => ({ ...prev, birthday: e.target.value }))}
                disabled={loading}
              />
              {errors.birthday && <p className="text-xs text-rose-600">{errors.birthday}</p>}
            </div>
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
                fullName: formData.fullName.trim(),
                licenseNumber: formData.licenseNumber.trim(),
                operatorType: formData.operatorType,
                email: formData.email.trim(),
                contactNumber: formData.contactNumber.trim(),
                birthday: formData.birthday,
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
