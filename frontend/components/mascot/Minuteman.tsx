"use client";

import { useEffect, useRef, useState } from "react";
import { useMode } from "@/lib/mode";

type Props = {
  size?: number;
  /** follow the pointer with his eyes */
  watch?: boolean;
  /** cheer once on mount */
  greet?: boolean;
  className?: string;
  label?: string;
};

/**
 * UMass Radar's mascot, a cartoon take on the UMass minuteman: tricorn hat, white side curls,
 * big chin, maroon coat with white facings, white breeches, black boots, and a maroon UMass flag.
 * Idle: he bobs, blinks and the flag ripples. His eyes follow the pointer. Hover or tap and he
 * hops, grins with happy eyes and pumps his fist. All motion stops for reduced-motion visitors.
 */
export function Minuteman({ size = 160, watch = true, greet = false, className = "", label = "UMass Radar's minuteman mascot" }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [cheer, setCheer] = useState(greet);
  const [still, setStill] = useState(true);
  const id = useRef(`mm${Math.random().toString(36).slice(2, 8)}`).current;
  const work = useMode() === "work"; // work mode: navy coat, staff badge and a coffee instead of the flag

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduce);
    if (!watch || reduce) return;
    const onMove = (e: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height * 0.32);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 400);
      setLook({ x: (dx / dist) * 2.6 * reach, y: (dy / dist) * 2.2 * reach });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [watch]);

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(false), 1400);
    return () => clearTimeout(t);
  }, [cheer]);

  const g = (n: string) => `url(#${id}-${n})`;
  // two flag outlines the ripple animates between
  const flagA = "M38 26 C 28 22, 16 30, 4 26 L 4 56 C 16 60, 28 52, 38 56 Z";
  const flagB = "M38 26 C 28 32, 16 22, 4 30 L 4 60 C 16 52, 28 62, 38 56 Z";

  return (
    <svg
      ref={ref}
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label={label}
      className={`mm-root select-none overflow-visible ${className}`}
      onPointerEnter={() => setCheer(true)}
      onClick={() => setCheer(true)}
    >
      <defs>
        <linearGradient id={`${id}-coat`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={work ? "#2d5f9e" : "#b3214c"} />
          <stop offset="55%" stopColor={work ? "#002554" : "#840028"} />
          <stop offset="100%" stopColor={work ? "#00142e" : "#560018"} />
        </linearGradient>
        <radialGradient id={`${id}-skin`} cx="42%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffe6d3" />
          <stop offset="100%" stopColor="#efc3a4" />
        </radialGradient>
        <linearGradient id={`${id}-hat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b423b" />
          <stop offset="100%" stopColor="#141814" />
        </linearGradient>
        <linearGradient id={`${id}-white`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e7e2db" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#e9a800" />
        </linearGradient>
        <linearGradient id={`${id}-flag`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a0020" />
          <stop offset="100%" stopColor="#a3123f" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3a0010" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3a0010" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="232" rx="56" ry="7" fill={g("shadow")} className="mm-shadow" />

      <g className={cheer ? "mm-hop" : "mm-bob"}>
{work ? (
          <g>
            {/* coffee to go, held up in his right hand */}
            <path d="M28 82 h24 l-3 28 q-1 5 -6 5 h-6 q-5 0 -6 -5 z" fill="#fff" stroke="#d9d2c8" strokeWidth="1.5" />
            <rect x="27" y="78" width="26" height="6" rx="2" fill="#6b4a2b" />
            <rect x="30" y="92" width="20" height="9" fill="#ffc72c" />
            <path d="M36 72 q-3 -5 1 -9 M44 72 q-3 -5 1 -9" stroke="#c9c2b8" strokeWidth="2" fill="none" strokeLinecap="round">
              {!still && <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />}
            </path>
          </g>
        ) : (
          <g>
                {/* flag on its pole, held up in his right hand */}
        <line x1="38" y1="18" x2="38" y2="176" stroke="#6b4a2b" strokeWidth="4" strokeLinecap="round" />
        <circle cx="38" cy="17" r="4" fill={g("gold")} />
        <path d={flagA} fill={g("flag")}>
          {!still && <animate attributeName="d" dur={cheer ? "0.5s" : "1.8s"} repeatCount="indefinite" values={`${flagA};${flagB};${flagA}`} />}
        </path>
        <text x="21" y="47" textAnchor="middle" fontFamily="var(--font-manrope), sans-serif" fontWeight="800" fontSize="15" fill="#fff">UM</text>
          </g>
        )}

        {/* boots and breeches */}
        <rect x="80" y="190" width="17" height="28" rx="6" fill={g("white")} />
        <rect x="103" y="190" width="17" height="28" rx="6" fill={g("white")} />
        <path d="M77 214 h21 v10 q0 5 -5 5 h-20 q-4 0 -4 -4 q0 -6 8 -11 z" fill="#1b1f1b" />
        <path d="M102 214 h21 q8 5 8 11 q0 4 -4 4 h-20 q-5 0 -5 -5 z" fill="#1b1f1b" />

        {/* coat with tails */}
        <path d="M70 122 Q100 112 130 122 L146 198 Q124 206 110 196 L100 200 L90 196 Q76 206 54 198 Z" fill={g("coat")} />
        {/* waistcoat */}
        <path d="M89 126 L111 126 L109 196 Q100 200 91 196 Z" fill={g("white")} />
        {/* white facings */}
        <path d="M88 124 L80 196 L89 196 L96 134 Z" fill="#f4efe8" />
        <path d="M112 124 L120 196 L111 196 L104 134 Z" fill="#f4efe8" />
        <circle cx="100" cy="150" r="2.8" fill={g("gold")} />
        <circle cx="100" cy="164" r="2.8" fill={g("gold")} />
        <circle cx="100" cy="178" r="2.8" fill={g("gold")} />
        <ellipse cx="78" cy="146" rx="6" ry="18" fill="#fff" opacity="0.1" transform="rotate(8 78 146)" />

        {work && (
          <g>
            <path d="M92 122 L100 150 L108 122" stroke="#ffc72c" strokeWidth="2.5" fill="none" />
            <rect x="91" y="148" width="18" height="22" rx="3" fill="#fff" stroke="#d9d2c8" />
            <rect x="94" y="152" width="12" height="5" rx="1" fill="#002554" />
            <rect x="94" y="160" width="12" height="2" fill="#c9c2b8" />
            <rect x="94" y="164" width="8" height="2" fill="#c9c2b8" />
          </g>
        )}

        {/* flag arm: shoulder to the pole */}
        <path d="M72 128 C 58 132, 48 132, 42 118" stroke={g("coat")} strokeWidth="14" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="114" r="8" fill={g("skin")} />

        {/* other arm: on his hip, or a fist pump when cheering */}
        {cheer ? (
          <g>
            <path d="M128 128 C 146 122, 154 108, 152 88" stroke={g("coat")} strokeWidth="14" strokeLinecap="round" fill="none" />
            <rect x="146" y="80" width="5" height="10" fill="#f4efe8" />
            <circle cx="152" cy="78" r="9" fill={g("skin")} />
          </g>
        ) : (
          <g>
            <path d="M128 128 C 150 138, 156 156, 136 166" stroke={g("coat")} strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="133" cy="166" r="8" fill={g("skin")} />
          </g>
        )}

        {/* jabot */}
        <path d="M88 116 Q100 124 112 116 L106 140 Q100 146 94 140 Z" fill={g("white")} />
        <path d="M93 126 Q100 131 107 126 M94 134 Q100 139 106 134" stroke="#d9d2c8" strokeWidth="1.5" fill="none" />

        {/* white side curls */}
        <g fill={g("white")} stroke="#d6cfc4" strokeWidth="1.2">
          <ellipse cx="58" cy="76" rx="9" ry="7" />
          <ellipse cx="58" cy="89" rx="9" ry="7" />
          <ellipse cx="142" cy="76" rx="9" ry="7" />
          <ellipse cx="142" cy="89" rx="9" ry="7" />
        </g>

        {/* head with a big minuteman chin */}
        <path d="M62 70 Q62 42 100 40 Q138 42 138 70 Q138 100 122 112 Q110 121 100 121 Q90 121 78 112 Q62 100 62 70 Z" fill={g("skin")} />
        <path d="M96 115 Q100 118 104 115" stroke="#c98f6e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="74" cy="94" rx="7" ry="4.5" fill="#f08a8a" opacity="0.45" />
        <ellipse cx="126" cy="94" rx="7" ry="4.5" fill="#f08a8a" opacity="0.45" />

        {/* brows: determined, raised when cheering */}
        <g stroke="#4a3426" strokeWidth="4.5" strokeLinecap="round" fill="none"
          style={{ transform: cheer ? "translateY(-3px)" : "none", transition: "transform 150ms" }}>
          <path d="M74 66 Q84 60 94 66" />
          <path d="M106 66 Q116 60 126 66" />
        </g>

        {/* eyes */}
        {cheer ? (
          <g stroke="#212721" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M78 80 Q84 72 90 80" />
            <path d="M110 80 Q116 72 122 80" />
          </g>
        ) : (
          <g className="mm-blink" style={{ transformOrigin: "100px 78px" }}>
            <ellipse cx="84" cy="78" rx="6.5" ry="8" fill="#212721" />
            <ellipse cx="116" cy="78" rx="6.5" ry="8" fill="#212721" />
            <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: "transform 120ms ease-out" }}>
              <circle cx="86" cy="75" r="2.6" fill="#fff" />
              <circle cx="118" cy="75" r="2.6" fill="#fff" />
            </g>
          </g>
        )}

        {/* nose */}
        <path d="M99 84 Q105 92 99 95" stroke="#c98f6e" strokeWidth="2.4" fill="none" strokeLinecap="round" />

        {/* confident grin, wider when cheering */}
        {cheer ? (
          <g>
            <path d="M82 99 Q100 120 118 99 Z" fill="#6a1022" />
            <path d="M85 100 L115 100 Q114 104 112 105 L88 105 Q86 104 85 100 Z" fill="#fff" />
          </g>
        ) : (
          <g>
            <path d="M86 100 Q100 113 114 100 Q100 106 86 100 Z" fill="#6a1022" />
            <path d="M88 100.5 Q100 104 112 100.5 L111 102.4 Q100 105 89 102.4 Z" fill="#fff" />
          </g>
        )}

        {/* tricorn hat with white trim and a cockade */}
        <path d="M40 54 Q66 16 100 14 Q134 16 160 54 Q140 46 122 48 L100 62 L78 48 Q60 46 40 54 Z" fill={g("hat")} />
        <path d="M40 54 Q60 46 78 48 L100 62 L122 48 Q140 46 160 54" stroke="#f4efe8" strokeWidth="3.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M70 30 Q100 16 130 30" stroke="#ffffff" strokeWidth="5" opacity="0.08" fill="none" strokeLinecap="round" />
        <circle cx="128" cy="44" r="7" fill="#fff" />
        <circle cx="128" cy="44" r="3.5" fill="#840028" />
      </g>
    </svg>
  );
}
