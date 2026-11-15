"use client";

import { BedDouble, BookOpen, Briefcase, CalendarDays, ListChecks, PartyPopper } from "lucide-react";

const CARDS = [
  { label: "Deadlines", note: "Quiz 6 due Mon", icon: ListChecks, from: "#a3123f", to: "#5c0019" },
  { label: "Schedule", note: "Classes and office hours", icon: CalendarDays, from: "#1d4f8f", to: "#002554" },
  { label: "Jobs", note: "Dining, RecWell, Handshake", icon: Briefcase, from: "#5d8b52", to: "#2f4a29" },
  { label: "Clubs", note: "Events you follow", icon: PartyPopper, from: "#e07a2c", to: "#a3470b" },
  { label: "Housing", note: "Sublets and roommates", icon: BedDouble, from: "#18b6cc", to: "#007a8c" },
  { label: "Courses", note: "6,000 courses, real syllabi", icon: BookOpen, from: "#6e6aa8", to: "#3f3b75" },
];

function Card({ c }: { c: (typeof CARDS)[number] }) {
  const Icon = c.icon;
  return (
    <div
      className="fan-card relative flex h-[210px] flex-col rounded-[26px] p-4 text-white shadow-[0_24px_40px_-18px_rgba(60,0,20,0.55)] ring-1 ring-white/25 md:h-[228px]"
      style={{ background: `linear-gradient(160deg, ${c.from} 0%, ${c.to} 100%)` }}
    >
      {/* gloss */}
      <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[linear-gradient(155deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_42%)]" />
      {/* glossy icon blob */}
      <div className="relative mx-auto mt-2 grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[26px] bg-white/15 shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_14px_24px_-10px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <Icon className="h-9 w-9 drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]" strokeWidth={2.2} />
        <span className="absolute left-3 top-2 h-3 w-6 rounded-full bg-white/50 blur-[1px]" />
      </div>
      <div className="relative mt-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
        <p className="font-display text-[20px] font-extrabold leading-tight tracking-[-0.02em]">{c.label}</p>
        <p className="mt-1 text-[13px] leading-snug text-white/90">{c.note}</p>
      </div>
    </div>
  );
}

/**
 * A fan of glossy 3D cards, one per part of the app. On wide screens it fans out with no card
 * covering another's text, tilts with the pointer and each card lifts on hover. On phones it is a
 * swipeable row so every card is readable.
 */
export function CardFan({ tilt = { x: 0, y: 0 } }: { tilt?: { x: number; y: number } }) {
  const n = CARDS.length;
  return (
    <>
      <div className="relative mx-auto hidden h-[300px] w-full max-w-[980px] [perspective:1400px] md:block">
        <ul
          className="absolute inset-0 [transform-style:preserve-3d]"
          style={{ transform: `rotateX(${10 - tilt.y * 6}deg) rotateY(${tilt.x * 10}deg)`, transition: "transform 300ms cubic-bezier(.2,.8,.2,1)" }}
        >
          {CARDS.map((c, i) => {
            const t = i - (n - 1) / 2; // -2.5 .. 2.5
            return (
              <li
                key={c.label}
                className="group absolute bottom-0 left-1/2 w-[146px]"
                style={{
                  transform: `translateX(calc(-50% + ${t * 154}px)) translateY(${Math.abs(t) * Math.abs(t) * 7}px) rotateZ(${t * 4}deg) rotateY(${-t * 8}deg)`,
                  zIndex: 10 - Math.round(Math.abs(t)),
                }}
              >
                <Card c={c} />
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6 pt-4 [scrollbar-width:none] md:hidden">
        {CARDS.map((c, i) => (
          <li key={c.label} className="group w-[150px] shrink-0 snap-center" style={{ transform: `rotate(${i % 2 ? 2.5 : -2.5}deg)` }}>
            <Card c={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
