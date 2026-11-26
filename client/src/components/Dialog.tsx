import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "regular" | "wide";
};

export default function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  size = "regular",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog-shell${size === "wide" ? " dialog-shell--wide" : ""}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="dialog-card">
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            autoFocus
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </section>
    </dialog>
  );
}
