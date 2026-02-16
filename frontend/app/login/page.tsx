import type { Metadata } from 'next';
import Form from '@/ui/Form';
import BgPattern from '@/components/background/BgPattern';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in or sign up to play Tarneeb 400.',
};

export default function LoginPage() {
  return (
    <section className="relative flex flex-1 items-center justify-center py-24 overflow-hidden min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <BgPattern />
      </div>
      <div className="absolute inset-0 -z-10 bg-slate-950/60" aria-hidden="true" />

      <Form />
    </section>
  );
}