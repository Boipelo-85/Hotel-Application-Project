import { useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface ConfirmationButtonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  title: string;
  description?: string;
  dismissLabel: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export default function ConfirmationButton({
  children, className, style, disabled, title, description, dismissLabel, confirmLabel, onConfirm,
}: ConfirmationButtonProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const openDialog = () => {
    dialog.current?.showModal();
    dismissButton.current?.focus();
  };

  const confirm = () => {
    dialog.current?.close();
    void onConfirm();
  };

  return (
    <>
      <button type="button" className={className} style={style} disabled={disabled} onClick={openDialog}>
        {children}
      </button>
      <dialog ref={dialog} className="sign-out-dialog" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        <div className="sign-out-dialog__actions">
          <button ref={dismissButton} type="button" onClick={() => dialog.current?.close()}>
            {dismissLabel}
          </button>
          <button type="button" onClick={confirm}>{confirmLabel}</button>
        </div>
      </dialog>
    </>
  );
}
