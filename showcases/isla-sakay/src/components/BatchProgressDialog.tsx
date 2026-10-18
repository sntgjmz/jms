import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BatchProgressDialogProps {
  open: boolean;
  isRunning: boolean;
  processedCount: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
  progressPercent: number;
  title?: string;
  description?: string;
  itemLabel?: string;
  failures?: Array<{ index: number; message: string }>;
  onClose: () => void;
}

const pluralize = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

const BatchProgressDialog = ({
  open,
  isRunning,
  processedCount,
  totalCount,
  successCount,
  failureCount,
  progressPercent,
  title = 'Submitting records',
  description,
  itemLabel = 'trips',
  failures = [],
  onClose,
}: BatchProgressDialogProps) => {
  const visibleFailures = failures.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isRunning && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRunning ? <Loader2 className="h-5 w-5 animate-spin text-sky-600" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description ?? `Processed ${processedCount} of ${totalCount} ${itemLabel}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {processedCount} / {totalCount} {itemLabel}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-600 transition-[width] duration-200 dark:bg-sky-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
              {successCount} {pluralize(successCount, 'success', 'successes')}
            </Badge>
            <Badge variant={failureCount > 0 ? 'destructive' : 'secondary'}>
              {failureCount} {pluralize(failureCount, 'failure', 'failures')}
            </Badge>
          </div>

          {failureCount > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-200">
                <AlertCircle className="h-4 w-4" />
                Failed {itemLabel}
              </div>
              <div className="mt-3 space-y-2 text-sm text-rose-700 dark:text-rose-100">
                {visibleFailures.map((failure) => (
                  <p key={`${failure.index}-${failure.message}`}>#{failure.index + 1}: {failure.message}</p>
                ))}
                {failures.length > visibleFailures.length && (
                  <p>And {failures.length - visibleFailures.length} more.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isRunning}>
            {isRunning ? 'Processing...' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchProgressDialog;
