import { useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface SignOutButtonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onConfirm: () => Promise<void>;
}

export default function SignOutButton({ children, className, style, onConfirm }: SignOutButtonProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const openDialog = () => {
    dialog.current?.showModal();
    cancelButton.current?.focus();
  };

  const confirmSignOut = () => {
    dialog.current?.close();
    void onConfirm();
  };

  return (
    <>
      <button type="button" className={className} style={style} onClick={openDialog}>
        {children}
      </button>
      <dialog ref={dialog} className="sign-out-dialog" aria-labelledby={titleId}>
        <h2 id={titleId}>Are you sure you want to sign out?</h2>
        <div className="sign-out-dialog__actions">
          <button ref={cancelButton} type="button" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="button" onClick={confirmSignOut}>Sign out</button>
        </div>
      </dialog>
    </>
  );
}
