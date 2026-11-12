import { useEffect, useId, useRef } from "react";
import "./Dialog.css";

export type DialogTone = "default" | "danger" | "success" | "error";

export interface DialogProps {
  open: boolean;
  title: string;
  message: string;
  variant: "confirm" | "alert";
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE_ICON: Record<DialogTone, string> = {
  default: "?",
  danger: "!",
  success: "✓",
  error: "!",
};

const Dialog = ({
  open,
  title,
  message,
  variant,
  tone = "default",
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  const isConfirm = variant === "confirm";
  // Em ação destrutiva, o foco inicial vai para Cancelar para evitar Enter acidental
  const focusCancel = isConfirm && tone === "danger";
  const resolvedConfirmLabel = confirmLabel ?? (isConfirm ? "Confirmar" : "OK");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      (focusCancel ? cancelRef.current : confirmRef.current)?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, focusCancel]);

  return (
    <dialog
      ref={dialogRef}
      className={`ui-dialog tone-${tone}`}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      // ESC: o navegador fecharia sozinho; deixamos o estado do pai decidir
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // Clique no backdrop (o próprio <dialog>, fora do cartão).
      // Em alert, fechar pelo backdrop equivale a OK.
      onClick={(event) => {
        if (event.target !== dialogRef.current) return;
        if (isConfirm) {
          onCancel();
        } else {
          onConfirm();
        }
      }}
    >
      <div className="dialog-card">
        <div className="dialog-header">
          <span className="dialog-icon" aria-hidden="true">
            {TONE_ICON[tone]}
          </span>
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
        </div>
        <p id={messageId} className="dialog-message">
          {message}
        </p>
        <div className="dialog-actions">
          {isConfirm && (
            <button
              ref={cancelRef}
              type="button"
              className="dialog-button"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className="dialog-button primary"
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default Dialog;
