import { type ReactNode } from 'react';

type NotificationVariant = 'success' | 'info' | 'warning' | 'error';

interface NotificationProps {
  variant: NotificationVariant;
  message: ReactNode;
  className?: string;
}

const variants: Record<
  NotificationVariant,
  { wrapper: string; icon: string; path: string }
> = {
  success: {
    wrapper:
      'bg-green-100 dark:bg-green-900 border-green-500 dark:border-green-700 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800',
    icon: 'text-green-600',
    path: 'M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  info: {
    wrapper:
      'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-700 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800',
    icon: 'text-blue-600',
    path: 'M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    wrapper:
      'bg-yellow-100 dark:bg-yellow-900 border-yellow-500 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800',
    icon: 'text-yellow-600',
    path: 'M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    wrapper:
      'bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-700 text-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800',
    icon: 'text-red-600',
    path: 'M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export default function Notification({ variant, message, className = '' }: NotificationProps) {
  const v = variants[variant];

  return (
    <div
      role="alert"
      className={[
        'flex items-center rounded-lg border-l-4 p-2 transition duration-300 ease-in-out hover:scale-105',
        v.wrapper,
        className,
      ].join(' ')}
    >
      <svg
        stroke="currentColor"
        viewBox="0 0 24 24"
        fill="none"
        className={`mr-2 h-5 w-5 shrink-0 ${v.icon}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d={v.path} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <p className="text-xs font-semibold">{message}</p>
    </div>
  );
}

// Convenience stack wrapper for displaying multiple notifications
interface NotificationStackProps {
  children: ReactNode;
  className?: string;
}

export function NotificationStack({ children, className = '' }: NotificationStackProps) {
  return <div className={`space-y-2 p-4 ${className}`}>{children}</div>;
}