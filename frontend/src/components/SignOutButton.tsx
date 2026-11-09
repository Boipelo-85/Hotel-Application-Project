import type { CSSProperties, ReactNode } from 'react';
import ConfirmationButton from './Modal';

interface SignOutButtonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onConfirm: () => Promise<void>;
}

export default function SignOutButton(props: SignOutButtonProps) {
  return (
    <ConfirmationButton
      {...props}
      title="Are you sure you want to sign out?"
      dismissLabel="Cancel"
      confirmLabel="Sign out"
    />
  );
}
