"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CampusScene } from "./landing/CampusScene";
import { CardFan } from "./landing/CardFan";
import { FeatureTabs } from "./landing/FeatureTabs";
import { Logo } from "./Logo";
import { Minuteman } from "./mascot/Minuteman";

type Props = { notice: string | null; onDemo?: () => void; onLogin?: () => void; demoLoading?: boolean };

/** Hand-drawn underline under the key phrase of the headline. */
function Swoosh() {
  return (
    <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-[0.32em] w-full">
      <path d="M4 12 C 70 2, 150 2, 296 9" stroke="#840028" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Landing({ notice, onDemo, onLogin, demoLoading }: Props) {
  const hero = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function login(e: MouseEvent<HTMLAnchorElement>) {
    if (!onLogin || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onLogin();
  }

  // the hero scene and card fan lean toward the pointer (skipped with reduced motion)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const box = hero.current?.getBoundingClientRect();
      if (!box) return;
      setTilt({
        x: Math.max(-1, Math.min(1, (e.clientX - box.left - box.width / 2) / (box.width / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - box.top - box.height / 2) / (box.height / 2))),
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const primary = "inline-flex items-center justify-center rounded-full bg-maroon-600 px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(132,0,40,0.7)] transition hover:-translate-y-0.5 hover:bg-maroon-700 active:translate-y-0";
  const secondary = "inline-flex items-center justify-center rounded-full bg-white/80 px-6 py-3 text-[15px] font-semibold text-ink ring-1 ring-line backdrop-blur transition hover:bg-white disabled:opacity-60";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-line-soft/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Logo />
          <nav className="ml-6 hidden gap-6 text-[15px] text-ink-soft md:flex">
            <a href="#features" className="hover:text-ink">What it does</a>
            <a href="#privacy" className="hover:text-ink">Privacy</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {onDemo && <button onClick={onDemo} disabled={demoLoading} className="hidden rounded-full px-4 py-2 text-[15px] font-semibold text-ink-soft hover:bg-paper sm:block">Try the demo</button>}
            <a href="/api/auth/login" onClick={login} className="rounded-full bg-maroon-600 px-4 py-2 text-[15px] font-semibold text-white hover:bg-maroon-700">Sign in</a>
          </div>
        </div>
      </header>

      <section ref={hero} className="relative overflow-hidden pb-20 pt-14 sm:pt-20">
        <CampusScene shift={{ x: tilt.x * -6, y: tilt.y * -4 }} />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <a href="#features" className="rise inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-ink-soft ring-1 ring-maroon-100 backdrop-blur hover:text-ink">
            <span className="h-2 w-2 rounded-full bg-maroon-600" /> New: housing board, jobs and clubs
          </a>
          <h1 className="rise mt-6 font-display text-[44px] font-extrabold leading-[1.04] tracking-[-0.045em] text-ink [animation-delay:60ms] sm:text-[68px]">
            Everything UMass needs from you,{" "}
            <span className="relative inline-block whitespace-nowrap">in one place<Swoosh /></span>
          </h1>
          <p className="rise mx-auto mt-6 max-w-[56ch] text-[18px] leading-relaxed text-ink-soft [animation-delay:120ms]">
            OneMass reads your UMass email, Canvas and class schedule, then shows the deadlines, appointments,
            replies you owe, jobs, clubs and housing in one calm place.
          </p>
          {notice && <p role="alert" className="mx-auto mt-6 max-w-xl rounded-2xl bg-white/90 px-4 py-3 text-sm text-ink-soft ring-1 ring-line">{notice}</p>}
          <div className="rise mt-8 flex flex-col items-center gap-3 [animation-delay:180ms]">
            <a href="/api/auth/login" onClick={login} className={`${primary} w-full max-w-sm`}>Sign in with your UMass Google account</a>
            {onDemo && (
              <button onClick={onDemo} disabled={demoLoading} className={secondary}>
                {demoLoading ? "Loading the demo…" : "Try it with a demo inbox"}
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-14">
          <div className="relative z-0 mx-auto -mb-[70px] w-fit md:-mb-[118px]" style={{ transform: `translate3d(${tilt.x * 6}px, 0, 0)` }}>
            <Minuteman size={170} greet />
          </div>
          <div className="relative z-10"><CardFan tilt={tilt} /></div>
        </div>
      </section>

      <div id="features"><FeatureTabs /></div>

      <section id="privacy" className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid items-center gap-8 rounded-[32px] bg-ink px-8 py-12 text-white sm:px-12 md:grid-cols-[auto_1fr]">
          <ShieldCheck className="h-14 w-14 text-gold" strokeWidth={1.75} />
          <div>
            <h2 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em]">Private by design</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-2 text-[15px] text-white/85 sm:grid-cols-2">
              <li>Read-only access to your UMass email</li>
              <li>Email bodies are never stored</li>
              <li>Your Google token is encrypted</li>
              <li>Delete everything with one click</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbeef2_100%)] px-6 pb-24 pt-10 text-center">
        <Minuteman size={120} />
        <h2 className="mt-4 font-display text-[36px] font-extrabold tracking-[-0.035em] text-ink">Stop digging through your inbox</h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-[17px] text-ink-soft">Sign in once. You stay signed in all semester.</p>
        <a href="/api/auth/login" onClick={login} className={`${primary} mt-7`}>Sign in with your UMass Google account</a>
      </section>

      <footer className="border-t border-line-soft px-6 py-8 text-center text-[13px] text-ink-muted">
        OneMass is a student project from HackUMass XIV. It isn&apos;t run by the University of Massachusetts.
      </footer>
    </div>
  );
}
