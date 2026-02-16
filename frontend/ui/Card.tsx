import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'inset' | 'ghost';
  as?: 'div' | 'article' | 'section' | 'li';
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  as: Tag = 'div',
}: CardProps) {
  const variants: Record<string, string> = {
    default: 'bg-slate-800/80 border border-slate-700/60 shadow-lg shadow-slate-950/40',
    inset:   'bg-slate-900/80 border border-slate-700/40 shadow-inner',
    ghost:   'bg-transparent border border-slate-700/30',
  };

  return (
    <Tag
      className={[
        'rounded-xl p-5 backdrop-blur-sm',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-sm font-semibold uppercase tracking-widest text-slate-300 ${className}`}>
      {children}
    </h3>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`text-slate-400 ${className}`}>{children}</div>;
}