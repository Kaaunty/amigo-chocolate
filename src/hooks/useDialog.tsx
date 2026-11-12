import { useCallback, useRef, useState } from "react";
import Dialog from "../components/Dialog";
import type { DialogTone } from "../components/Dialog";

export interface DialogOptions {
  title?: string;
  message: string;
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

type Variant = "confirm" | "alert";

interface DialogState {
  variant: Variant;
  title: string;
  message: string;
  tone: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_TITLE: Record<Variant, string> = {
  confirm: "Confirmar ação",
  alert: "Aviso",
};

/**
 * Substitui confirm()/alert() do navegador por um diálogo próprio.
 * Renderize `dialog` uma vez no JSX do componente.
 */
export const useDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<DialogState>({
    variant: "alert",
    title: "",
    message: "",
    tone: "default",
  });
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const show = useCallback(
    (variant: Variant, opts: DialogOptions): Promise<boolean> => {
      // Se já há um diálogo aberto, resolve o anterior como cancelado
      resolverRef.current?.(false);

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setState({
          variant,
          title: opts.title ?? DEFAULT_TITLE[variant],
          message: opts.message,
          tone: opts.tone ?? "default",
          confirmLabel: opts.confirmLabel,
          cancelLabel: opts.cancelLabel,
        });
        setIsOpen(true);
      });
    },
    []
  );

  const settle = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setIsOpen(false);
    resolve?.(result);
  }, []);

  const confirm = useCallback(
    (opts: DialogOptions): Promise<boolean> => show("confirm", opts),
    [show]
  );

  const alert = useCallback(
    async (opts: DialogOptions): Promise<void> => {
      await show("alert", opts);
    },
    [show]
  );

  const dialog = (
    <Dialog
      open={isOpen}
      title={state.title}
      message={state.message}
      variant={state.variant}
      tone={state.tone}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, alert, dialog };
};
