'use client';

import { useEffect } from 'react';
import { AppProvider, useAppState } from '@/hooks/useAppState';

/**
 * SocketConnector — mounted once inside AppProvider.
 * Calls connection.connect() on boot. Never disconnects on unmount
 * because the root layout never unmounts during normal navigation.
 * Disconnect is triggered explicitly on intentional logout only.
 */
function SocketConnector() {
  const { dispatchers } = useAppState();

  useEffect(() => {
    dispatchers.connection.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

interface ClientRootProps {
  children: React.ReactNode;
}

/**
 * ClientRoot — thin 'use client' boundary required by Next.js App Router.
 * app/layout.tsx is a Server Component; AppProvider uses hooks and must
 * live inside a Client Component. This wrapper is the single authoritative
 * location where AppProvider and the socket connection are initialised.
 */
export default function ClientRoot({ children }: ClientRootProps) {
  return (
    <AppProvider>
      <SocketConnector />
      {children}
    </AppProvider>
  );
}