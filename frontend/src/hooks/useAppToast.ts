import { toast } from "sonner";

export function useAppToast() {
  return {
    success: (title: string, desc?: string) => {
      toast.success(title, desc ? { description: desc } : undefined);
    },
    error: (title: string, desc?: string) => {
      toast.error(title, desc ? { description: desc } : undefined);
    },
    info: (title: string, desc?: string) => {
      toast.info(title, desc ? { description: desc } : undefined);
    },
    raw: toast,
  };
}
