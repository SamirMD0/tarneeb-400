import type { Metadata } from 'next';
import Container from '@/components/layout/Container';
import PlayButton from '@/ui/PlayButton';
import BgPattern from '@/components/background/BgPattern';
import FloatingAces from '@/components/FloatingAces';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Play Tarneeb and 400 online with friends in real time.',
};

export default function HomePage() {
  return (
    <section className="relative flex flex-1 items-center justify-center py-24 overflow-hidden min-h-[calc(100vh-4rem)]">
      {/* CSS-only animated background */}
      <div className="absolute inset-0 -z-10">
        <BgPattern />
      </div>

      {/* Scrim so text stays readable */}
      <div className="absolute inset-0 -z-10 bg-slate-950/50" aria-hidden="true" />

      <Container>
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">

          {/* Left — hero text */}
          <div className="max-w-xl text-center lg:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
              Welcome to{' '}
              <span className="text-[rgba(191,123,255,0.781)]">Tarneeb 400</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-400 sm:text-xl">
              Gather your team, claim a room, and play Tarneeb or 400 online with
              friends in real time.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <PlayButton label="Play Now" href="/lobby" />
            </div>
          </div>

          {/* Right — floating aces */}
          <div className="flex w-full flex-shrink-0 items-center justify-center lg:w-auto">
            <FloatingAces />
          </div>

        </div>
      </Container>
    </section>
  );
}