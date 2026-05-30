import { lazy, Suspense, useEffect, useState } from "react";

// Lazy-load the WebGL scene so three.js / R3F are NEVER imported during SSR.
const Hero3DScene = lazy(() => import("./Hero3DScene"));

function HeroFallback() {
  // Lightweight placeholder shown during SSR + before the canvas mounts.
  return (
    <div
      aria-hidden
      className="absolute inset-0 animate-pulse rounded-[2rem]"
      style={{
        background:
          "radial-gradient(circle at 50% 45%, rgba(34,211,238,0.18), transparent 60%), radial-gradient(circle at 60% 60%, rgba(79,70,229,0.16), transparent 55%)",
      }}
    />
  );
}

export function Hero3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <HeroFallback />;

  return (
    <Suspense fallback={<HeroFallback />}>
      <Hero3DScene />
    </Suspense>
  );
}
