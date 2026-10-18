import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function useUnsavedChangesGuard(isDirty: boolean, message = 'You have unsaved changes. Leave without saving?') {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
  }, [isDirty, message]);

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, []);

  const confirmDiscard = useCallback(() => {
    if (!isDirty) return Promise.resolve(true);
    setIsDialogOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [isDirty, message]);

  const discardDialog = useMemo(
    () => (
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && resolverRef.current) {
          resolverRef.current(false);
          resolverRef.current = null;
        }
        setIsDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[460px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (resolverRef.current) {
                  resolverRef.current(false);
                  resolverRef.current = null;
                }
                setIsDialogOpen(false);
              }}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (resolverRef.current) {
                  resolverRef.current(true);
                  resolverRef.current = null;
                }
                setIsDialogOpen(false);
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
    [isDialogOpen, message],
  );

  return { confirmDiscard, discardDialog };
}
