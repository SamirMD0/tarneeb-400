'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={[
        'w-full rounded-xl border border-slate-700/60 bg-slate-800 p-0 text-slate-50 shadow-2xl shadow-slate-950/60 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm',
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {/* Header */}
      {(title || description) && (
        <div className="border-b border-slate-700/60 px-6 py-4">
          {title && (
            <h2
              id="modal-title"
              className="text-sm font-semibold uppercase tracking-widest text-slate-200"
            >
              {title}
            </h2>
          )}
          {description && (
            <p id="modal-description" className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-5">{children}</div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </dialog>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 border-t border-slate-700/60 px-6 py-4 ${className}`}
    >
      {children}
    </div>
  );
}