import { toast } from '@/hooks/use-toast';

export function showSuccessToast(
  title: string,
  description?: string
) {
  return toast({
    title,
    description,
    variant: 'success',
  });
}

export function showErrorToast(
  title: string,
  description?: string
) {
  return toast({
    title,
    description,
    variant: 'destructive',
  });
}

export function showWarningToast(
  title: string,
  description?: string
) {
  return toast({
    title,
    description,
    variant: 'warning',
  });
}

export function showInfoToast(
  title: string,
  description?: string
) {
  return toast({
    title,
    description,
    variant: 'info',
  });
}

export function showLoadingToast(message: string = 'Loading...') {
  return toast({
    title: message,
    duration: 9999999,
  });
}

export function dismissToast() {
  // Note: For dismiss, you'll need to call it from a component using useToast hook
  console.warn('dismissToast: Use useToast().dismiss() directly in components');
}
