import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ClientRoot from './ClientRoot';
import AppShell from '@/components/layout/AppShell';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Tarneeb 400',
    default: 'Tarneeb 400',
  },
  description: 'Play Tarneeb and 400 online with friends in real time.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientRoot>
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  );
}