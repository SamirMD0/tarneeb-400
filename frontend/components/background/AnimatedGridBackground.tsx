'use client';

import dynamic from 'next/dynamic';

const GridScan = dynamic(
  () => import('@/components/background/AnimatedGrid').then((mod) => mod.GridScan),
  { ssr: false }
);

export default function AnimatedGridBackground() {
  return (
    <GridScan
      linesColor="#7c3aed"
      scanColor="#a78bfa"
      gridScale={0.18}
      lineThickness={1.2}
      bloomIntensity={1.2}
      scanOpacity={0.7}
      scanDirection="pingpong"
      scanDuration={3}
      scanDelay={1}
      enablePost
      className="w-full h-full"
    />
  );
}