"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import type { Engine, ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

async function initialiseParticles(engine: Engine) {
  await loadSlim(engine);
}

/**
 * Decorative profile-cover ambience. It deliberately has no pointer events
 * and does not mount for visitors who ask their operating system to reduce
 * motion, so the profile remains readable and comfortable on every device.
 */
export function ProfileParticles() {
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOTION_QUERY);
    const updateMotionPreference = () => setMotionAllowed(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      background: { color: { value: "transparent" } },
      detectRetina: true,
      fpsLimit: 48,
      fullScreen: { enable: false },
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
      particles: {
        color: { value: ["#ffffff", "#bae6fd", "#67e8f9"] },
        links: {
          color: "#dbeafe",
          distance: 118,
          enable: true,
          opacity: 0.14,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "out" },
          speed: 0.28,
        },
        number: {
          density: { enable: true, width: 900, height: 300 },
          value: 22,
        },
        opacity: { value: { min: 0.08, max: 0.3 } },
        shape: { type: "circle" },
        size: { value: { min: 1, max: 2.2 } },
      },
    }),
    []
  );

  if (!motionAllowed) return null;

  return (
    <div className="profile-particles" aria-hidden="true">
      <ParticlesProvider init={initialiseParticles}>
        <Particles id="profile-cover-particles" options={options} />
      </ParticlesProvider>
    </div>
  );
}
