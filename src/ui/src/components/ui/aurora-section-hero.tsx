'use client';

import { useEffect, useState, type CSSProperties } from 'react';

export interface BackgroundSceneProps {
  /** Number of animated light beams */
  beamCount?: number;
}

const BACKGROUND_BEAM_COUNT = 60;

const BackgroundScene = ({ beamCount = BACKGROUND_BEAM_COUNT }: BackgroundSceneProps) => {
  const [beams, setBeams] = useState<Array<{ id: number; style: CSSProperties }>>([]);

  useEffect(() => {
    const generated = Array.from({ length: beamCount }).map((_, index) => {
      const riseDur = Math.random() * 2 + 4;
      const fadeDur = riseDur;
      const dropDur = Math.random() * 3 + 3;
      const delay = Math.random() * 5;

      return {
        id: index,
        style: {
          left: `${Math.random() * 100}%`,
          width: `${Math.floor(Math.random() * 3) + 1}px`,
          animationDelay: `${delay}s`,
          animationDuration: `${riseDur}s, ${fadeDur}s, ${dropDur}s`,
        },
      };
    });

    setBeams(generated);
  }, [beamCount]);

  return (
    <div className="scene" role="img" aria-label="Animated digital data background">
      <div className="floor" />
      <div className="main-column" />
      <div className="light-stream-container">
        {beams.map(beam => (
          <div key={beam.id} className="light-beam" style={beam.style} />
        ))}
      </div>
    </div>
  );
};

export default BackgroundScene;