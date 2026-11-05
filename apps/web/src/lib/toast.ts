import { toast } from 'sonner';

export const showToast = {
  success: (msg: string) => toast.success(msg, { duration: 3000 }),
  error: (msg: string) => toast.error(msg, { duration: 4000 }),
  info: (msg: string) => toast.info(msg, { duration: 3000 }),
  warning: (msg: string) => toast.warning(msg, { duration: 3500 }),
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => toast.promise(promise, messages),
};
