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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AlertSeverity, EditableNotificationType } from '../types';

interface GeneralAlertDialogProps {
  open: boolean;
  severity: AlertSeverity;
  message: string;
  mode?: 'normal' | 'broadcast';
  onOpenChange: (open: boolean) => void;
  onSeverityChange: (value: AlertSeverity) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function GeneralAlertDialog({
  open,
  severity,
  message,
  mode = 'normal',
  onOpenChange,
  onSeverityChange,
  onMessageChange,
  onSubmit,
}: GeneralAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'broadcast' ? 'Broadcast Mobile Alert' : 'Send General Alert'}</DialogTitle>
          <DialogDescription>
            {mode === 'broadcast'
              ? 'This sends to all installed mobile apps and also saves in notification history.'
              : 'Set severity and message before sending.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="general-severity">Type of Alert</Label>
            <Select value={severity} onValueChange={(value) => onSeverityChange(value as AlertSeverity)}>
              <SelectTrigger id="general-severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="general-message">Message</Label>
            <Textarea
              id="general-message"
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="Enter general alert message"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>{mode === 'broadcast' ? 'Broadcast Now' : 'Send Alert'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface WeatherAlertDialogProps {
  open: boolean;
  severity: AlertSeverity;
  message: string;
  onOpenChange: (open: boolean) => void;
  onSeverityChange: (value: AlertSeverity) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function WeatherAlertDialog({
  open,
  severity,
  message,
  onOpenChange,
  onSeverityChange,
  onMessageChange,
  onSubmit,
}: WeatherAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Weather Alert</DialogTitle>
          <DialogDescription>Set severity and message before sending.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weather-severity">Type of Alert</Label>
            <Select value={severity} onValueChange={(value) => onSeverityChange(value as AlertSeverity)}>
              <SelectTrigger id="weather-severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weather-message">Message</Label>
            <Textarea
              id="weather-message"
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="Enter weather alert message"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Send Alert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CalamityAlertDialogProps {
  open: boolean;
  signal: string;
  calamityType: string;
  message: string;
  onOpenChange: (open: boolean) => void;
  onSignalChange: (value: string) => void;
  onCalamityTypeChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function CalamityAlertDialog({
  open,
  signal,
  calamityType,
  message,
  onOpenChange,
  onSignalChange,
  onCalamityTypeChange,
  onMessageChange,
  onSubmit,
}: CalamityAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Calamity Alert</DialogTitle>
          <DialogDescription>Severity is automatic high for calamity alerts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calamity-severity">Type of Alert</Label>
            <Input id="calamity-severity" value="high (automatic)" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calamity-signal">Signal</Label>
            <Input
              id="calamity-signal"
              value={signal}
              onChange={(event) => onSignalChange(event.target.value)}
              placeholder="Enter signal (e.g., Signal #2)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calamity-type">Type of Calamity</Label>
            <Input
              id="calamity-type"
              value={calamityType}
              onChange={(event) => onCalamityTypeChange(event.target.value)}
              placeholder="Enter calamity type (e.g., Typhoon, Flood)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calamity-message">Message</Label>
            <Textarea
              id="calamity-message"
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="Enter calamity alert message"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Send Alert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditNotificationDialogProps {
  open: boolean;
  notificationType: EditableNotificationType;
  severity: AlertSeverity;
  title: string;
  message: string;
  onOpenChange: (open: boolean) => void;
  onSeverityChange: (value: AlertSeverity) => void;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function EditNotificationDialog({
  open,
  notificationType,
  severity,
  title,
  message,
  onOpenChange,
  onSeverityChange,
  onTitleChange,
  onMessageChange,
  onSubmit,
}: EditNotificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Notification</DialogTitle>
          <DialogDescription>Update notification title, severity, and message.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(event) => onTitleChange(event.target.value)} />
          </div>
          {notificationType !== 'coast_guard' && (
            <div className="space-y-2">
              <Label htmlFor="edit-severity">Type of Alert</Label>
              <Select value={severity} onValueChange={(value) => onSeverityChange(value as AlertSeverity)}>
                <SelectTrigger id="edit-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-message">Message</Label>
            <Textarea id="edit-message" value={message} onChange={(event) => onMessageChange(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
