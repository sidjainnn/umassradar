"use client";

import {
  ArrowRight,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  EyeOff,
  FileText,
  GraduationCap,
  House,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { CampusPals } from "./CampusPals";
import { Logo } from "./Logo";

type Props = { notice: string | null; onDemo?: () => void; demoLoading?: boolean };

const SOURCES = [
  { icon: Mail, label: "UMass Gmail", detail: "Deadlines, replies and campus updates" },
  { icon: GraduationCap, label: "Canvas", detail: "Assignments and course dates" },
  { icon: CalendarDays, label: "Class schedule", detail: "Classes, conflicts and open time" },
  { icon: FileText, label: "Syllabi", detail: "Office hours, exams and policies" },
];

const FAQ = [
  ["Does Radar send or change my email?", "No. Gmail access is read-only. Radar cannot send, delete or edit messages."],
  ["What does Radar store?", "Radar stores the structured items it finds, such as a deadline and its source. Email bodies and uploaded files are not kept."],
  ["Can I remove my information?", "Yes. The Profile and privacy page lets you delete your Radar data and disconnect your sources."],
  ["Is the demo connected to my inbox?", "No. The demo uses sample student data, so you can explore the complete product without connecting anything."],
];

const SHOWCASES = [
  { label: "Morning brief", icon: Sparkles, eyebrow: "Start clear", title: "Your whole morning, explained in seconds.", text: "Radar turns the useful parts of your inbox, schedule and course files into a short brief with links back to every source.", points: ["Deadlines and appointments", "Replies people are waiting on", "What changed since yesterday"] },
  { label: "To do", icon: Check, eyebrow: "Act on it", title: "Every important message becomes a next step.", text: "Instead of rereading long threads, work from one calm list and mark items done without losing the original context.", points: ["Due dates with course labels", "Evidence from the original source", "Done and dismissed states"] },
  { label: "Planner", icon: CalendarDays, eyebrow: "See the week", title: "Classes, deadlines and free time finally line up.", text: "Your schedule becomes a useful plan with office hours you can actually attend and conflicts you can spot early.", points: ["Today timeline", "Schedule imports", "Office-hour fit checks"] },
  { label: "Opportunities", icon: BriefcaseBusiness, eyebrow: "Find the good stuff", title: "Campus opportunities stop getting buried.", text: "Research roles, jobs, clubs and events get their own focused space instead of competing with inbox noise.", points: ["Research and campus jobs", "Clubs and events", "Deadlines kept visible"] },
];

const FEATURE_CARDS = [
  { icon: Sparkles, title: "Morning Brief", detail: "Your day, distilled" },
  { icon: Check, title: "To Do", detail: "Deadlines and replies" },
  { icon: CalendarDays, title: "Schedule", detail: "Classes and free time" },
  { icon: House, title: "Housing", detail: "Sublets, swaps, roommates" },
  { icon: BookOpen, title: "Courses", detail: "Sections and syllabi" },
  { icon: BriefcaseBusiness, title: "Opportunities", detail: "Jobs, research, events" },
  { icon: BellRing, title: "Updates", detail: "Course and campus news" },
  { icon: Upload, title: "Smart Imports", detail: "Files and screenshots" },
];

export function Landing({ notice, onDemo, demoLoading }: Props) {
  const [activeShowcase, setActiveShowcase] = useState(0);
  const showcase = SHOWCASES[activeShowcase];

  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      <header className="landing-nav mx-auto flex max-w-7xl items-center gap-4 px-4 py-5 sm:px-7">
        <a href="#top" aria-label="UMass Radar home"><Logo size={36} /></a>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Homepage">
          <a href="#features">Features</a>
          <a href="#sources-heading">Sources</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <a href="/api/auth/login" className="landing-nav-cta ml-auto inline-flex min-h-10 items-center rounded-full bg-maroon-600 px-4 text-sm font-semibold text-white md:ml-3">
          Sign in
        </a>
      </header>

      <section id="top" className="landing-cinematic landing-cinematic-home relative mx-auto min-h-[820px] max-w-7xl overflow-hidden rounded-[30px] px-5 pb-0 pt-10 text-center sm:px-10 sm:pt-14 lg:px-14">
        <div className="landing-orbit" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-maroon-200 bg-white/82 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-maroon-700 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-maroon-600" />
            One calm place for your UMass day
          </p>
          <h1 className="mx-auto mt-7 max-w-[15ch] font-sans text-[46px] font-semibold leading-[1.01] tracking-[-0.055em] text-ink sm:text-[66px] lg:text-[82px]">
            Everything college needs from you, <span className="landing-underline relative whitespace-nowrap">in one view.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[64ch] text-base leading-relaxed text-ink-soft sm:text-lg">
            Radar reads the sources you choose, finds the deadlines, replies and opportunities that matter, and builds a morning plan around your real UMass schedule.
          </p>
          {notice && <p role="alert" className="mx-auto mt-5 max-w-xl rounded-2xl border border-maroon-100 bg-white/80 px-4 py-3 text-sm text-ink-soft">{notice}</p>}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a href="/api/auth/login" className="landing-hero-primary inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-maroon-600 px-9 py-3.5 font-semibold text-white">
              Get started with UMass Google <ArrowRight className="h-4 w-4" />
            </a>
            {onDemo && (
              <button onClick={onDemo} disabled={demoLoading}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-maroon-200 bg-white/82 px-6 py-3 font-semibold text-maroon-700 backdrop-blur hover:bg-white disabled:opacity-60">
                {demoLoading ? "Loading the demo…" : "Explore the demo"}
              </button>
            )}
          </div>
          <p className="mx-auto mt-4 flex max-w-[50ch] items-start justify-center gap-2 text-left text-[13px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            Read-only Gmail access. Email bodies and uploaded files are never stored.
          </p>
        </div>

        <div className="hero-card-stage relative z-10 mx-auto mt-6 max-w-6xl" aria-label="Explore every UMass Radar feature">
          <div className="hero-card-halo" aria-hidden="true" />
          <Image className="hero-card-sam" src="/mascots/sam-minuteman-3d.png" alt="Sam the Minuteman presenting UMass Radar features" width={1024} height={1536} priority />
          <div className="hero-capability-deck">
            {FEATURE_CARDS.map(({ icon: Icon, title, detail }, index) => (
              <a key={title} href="#all-features" className="hero-capability-card" aria-label={`Explore ${title}`}>
                <span className="hero-card-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="hero-card-icon"><Icon className="h-6 w-6" /></span>
                <strong>{title}</strong>
                <small>{detail}</small>
                <span className="hero-card-arrow"><ArrowRight className="h-4 w-4" /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-7 sm:py-14" aria-labelledby="sources-heading">
        <div className="text-center">
          <p className="landing-kicker">One place for the parts that matter</p>
          <h2 id="sources-heading" className="mx-auto mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Radar connects the places your semester already lives.</h2>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map(({ icon: Icon, label, detail }) => (
            <article key={label} className="source-card rounded-[20px] border border-line bg-white p-5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-maroon-50 text-maroon-600"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold text-ink">{label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="feature-stage mx-auto max-w-7xl px-4 py-14 sm:px-7 sm:py-20" aria-labelledby="feature-stage-heading">
        <div className="text-center">
          <p className="landing-kicker">Built for the part after “check your email”</p>
          <h2 id="feature-stage-heading" className="mx-auto mt-3 max-w-3xl font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">See what your day looks like when the noise is already sorted.</h2>
        </div>
        <div className="feature-tabs mx-auto mt-8 flex max-w-3xl gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2" role="tablist" aria-label="Product features">
          {SHOWCASES.map(({ label, icon: Icon }, index) => (
            <button key={label} role="tab" aria-selected={activeShowcase === index} onClick={() => setActiveShowcase(index)} className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${activeShowcase === index ? "bg-maroon-600 text-white shadow-lg" : "text-ink-muted hover:bg-maroon-50 hover:text-maroon-700"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <div className="feature-demo mt-5 grid overflow-hidden rounded-[28px] border border-line bg-white lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <p className="landing-kicker">{showcase.eyebrow}</p>
            <h3 className="mt-3 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">{showcase.title}</h3>
            <p className="mt-4 leading-relaxed text-ink-muted">{showcase.text}</p>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {showcase.points.map((point) => <CheckLine key={point}>{point}</CheckLine>)}
            </ul>
            <a href="/api/auth/login" className="mt-7 inline-flex items-center gap-2 font-bold text-maroon-600 hover:underline">Try it with your account <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="feature-demo-canvas relative min-h-[430px] p-5 sm:p-8">
            <div className="feature-demo-window rounded-[24px] border border-white/70 bg-white/94 p-4 shadow-[0_28px_70px_rgba(94,0,28,0.16)] sm:p-6">
              <div className="flex items-center justify-between border-b border-line-soft pb-4"><span className="text-xs font-bold uppercase tracking-[0.14em] text-maroon-600">{showcase.label}</span><span className="rounded-full bg-forest/10 px-3 py-1 text-[10px] font-bold text-forest">Live from your sources</span></div>
              {activeShowcase === 0 && <div className="mt-5"><p className="font-serif text-2xl font-semibold text-ink">Good morning, Maya.</p><div className="mt-4 rounded-2xl bg-maroon-600 p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-white/60">Your brief</p><p className="mt-2 leading-relaxed">Lab 6 is due tonight. Advising starts at 2 PM, and Prof. Chen is waiting on your availability.</p></div><div className="mt-4 grid grid-cols-3 gap-2"><Stat n="3" label="due this week" /><Stat n="1" label="reply owed" /><Stat n="12" label="noise filtered" /></div></div>}
              {activeShowcase === 1 && <div className="mt-4 divide-y divide-line-soft"><TaskRow title="Lab 6: circuits & signals" meta="ECE 122 · Tonight 11:59 PM" label="Due soon" /><TaskRow title="Send research availability" meta="Prof. Maria Chen" label="Reply owed" /><TaskRow title="Spring advising appointment" meta="Goodell 613 · Tomorrow 2 PM" label="Appointment" /></div>}
              {activeShowcase === 2 && <div className="mt-5"><div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-ink-muted">{["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => <span key={d} className={`rounded-xl py-2 ${i === 2 ? "bg-maroon-600 text-white" : "bg-paper"}`}>{d}</span>)}</div><div className="relative mt-5 space-y-3 border-l border-line pl-5"><MiniTask icon={BookOpen} title="COMPSCI 311 lecture" meta="10:10 AM · ILC S120" tone="navy" /><MiniTask icon={CalendarDays} title="Academic advising" meta="2:00 PM · Goodell 613" tone="maroon" /><MiniTask icon={Clock3} title="Office hours: Prof. Chen" meta="4:00 PM · You’re free" tone="gold" /></div></div>}
              {activeShowcase === 3 && <div className="mt-5 grid gap-3 sm:grid-cols-2"><Opportunity icon={BriefcaseBusiness} eyebrow="Campus job" title="Student Web Developer" meta="Apply by Nov 24" /><Opportunity icon={Sparkles} eyebrow="Research" title="Undergraduate HCI Lab" meta="Interest form open" /><Opportunity icon={GraduationCap} eyebrow="Academic" title="HackUMass Workshop" meta="Friday · 5 PM" /><Opportunity icon={CalendarDays} eyebrow="Club event" title="Design Club Meetup" meta="Campus Center" /></div>}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-story mx-auto max-w-7xl rounded-[30px] bg-[#212721] px-5 py-14 text-white sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <p className="landing-kicker landing-kicker-dark">How it works</p>
            <h2 className="mt-4 max-w-[12ch] font-serif text-4xl font-semibold leading-tight sm:text-5xl">From scattered messages to a day you can actually see.</h2>
            <p className="mt-5 max-w-[46ch] leading-relaxed text-white/62">Radar keeps the useful context, organizes it by what it means, and gives every item a clear next step.</p>
          </div>
          <ol className="space-y-4">
            <StoryStep number="01" title="It reads the sources you choose" text="Your connected inbox, Canvas feed, class schedule and uploaded syllabi become one student context." icon={BookOpen} />
            <StoryStep number="02" title="It separates signal from noise" text="Deadlines, appointments, replies, events and opportunities become structured items. Promotions stay quiet." icon={Sparkles} />
            <StoryStep number="03" title="It builds one morning screen" text="Today’s timeline, what is coming up, and the things worth a look are ready when you are." icon={CalendarDays} />
          </ol>
        </div>
      </section>

      <section id="what-it-finds" className="mx-auto max-w-7xl px-4 py-16 sm:px-7 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 lg:order-1">
            <div className="task-stack rounded-[26px] border border-line bg-white p-4 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-maroon-600">Your to do</p>
              <div className="mt-4 divide-y divide-line-soft">
                <TaskRow title="Problem set 7" meta="COMPSCI 311 · Monday 10 PM" label="Due soon" />
                <TaskRow title="Reply with research availability" meta="Prof. Maria Chen" label="Reply owed" />
                <TaskRow title="Spring advising appointment" meta="Goodell 613 · Tuesday 2 PM" label="Appointment" />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f7f7f6] px-4 py-3 text-sm">
                <span className="text-ink-muted">Newsletter pile-up</span><span className="font-semibold text-forest">Quietly filtered</span>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="landing-kicker">What needs you</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">Deadlines stop hiding in paragraphs.</h2>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-muted">A due date in a professor’s email, a Canvas assignment, and an advising reminder all land in the same calm queue—with the source still attached.</p>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              <CheckLine>Mark work done or dismiss what does not matter</CheckLine>
              <CheckLine>See the sentence that put an item on your Radar</CheckLine>
              <CheckLine>Jump back to the original email, Canvas page or source</CheckLine>
            </ul>
          </div>
        </div>

        <div className="mt-20 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="landing-kicker">What might be worth it</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">The good stuff gets its own space.</h2>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-muted">Internships, research roles, campus jobs and club events no longer compete with every other message in your inbox.</p>
          </div>
          <div className="opportunity-board grid gap-3 sm:grid-cols-2">
            <Opportunity icon={BriefcaseBusiness} eyebrow="Campus job" title="Student Web Developer" meta="Apply by Nov 24" />
            <Opportunity icon={Sparkles} eyebrow="Research" title="Undergraduate HCI Lab" meta="Interest form open" />
            <Opportunity icon={GraduationCap} eyebrow="Academic" title="HackUMass Workshop" meta="Friday · 5 PM" />
            <Opportunity icon={CalendarDays} eyebrow="Club event" title="Design Club Meetup" meta="Campus Center" />
          </div>
        </div>
      </section>

      <section id="all-features" className="product-map mx-auto max-w-7xl rounded-[30px] border border-line px-5 py-14 sm:px-10 sm:py-20 lg:px-14" aria-labelledby="workspace-heading">
        <div className="max-w-3xl">
          <p className="landing-kicker">A complete student workspace</p>
          <h2 id="workspace-heading" className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">One student system. Every part of campus life.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">Each card is a focused workspace backed by the same student context, so schedules, housing, courses and inbox items work together instead of becoming more tabs to check.</p>
        </div>
        <div className="feature-system-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceCard icon={Sparkles} title="Morning Brief" text="A personalized summary, today timeline, coming up and live counts." />
          <WorkspaceCard icon={Check} title="To do" text="Deadlines, appointments and replies with sources and completion states." />
          <WorkspaceCard icon={CalendarDays} title="Schedule" text="SPIRE schedules, calendar conflicts and office hours you can attend." />
          <WorkspaceCard icon={House} title="Housing" text="UMass-only sublets, room swaps, roommate matching, requests and safety flags." />
          <WorkspaceCard icon={BookOpen} title="Courses" text="Sections, instructors, syllabus facts, exam dates and shared resources." />
          <WorkspaceCard icon={BriefcaseBusiness} title="Opportunities" text="Campus jobs, research roles, clubs and events separated from inbox noise." />
          <WorkspaceCard icon={BellRing} title="Campus Updates" text="Course news, status changes and followed groups kept out of the noise." />
          <WorkspaceCard icon={Upload} title="Smart Imports" text="Schedules, syllabi, job boards and portal screenshots become usable items." />
        </div>
      </section>

      <section id="privacy" className="privacy-section mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-maroon-100 px-5 py-14 sm:px-10 sm:py-20 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="landing-kicker">Privacy without the fine-print fog</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">Your inbox stays yours.</h2>
            <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-ink-muted">Radar is built to extract the useful thing without becoming another owner of your information.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PrivacyCard icon={EyeOff} title="Read-only" text="Radar cannot send, edit or delete your email." />
            <PrivacyCard icon={LockKeyhole} title="Minimal storage" text="Email bodies and uploaded files are not kept." />
            <PrivacyCard icon={ShieldCheck} title="Your control" text="Disconnect sources or delete your Radar data." />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-7 sm:py-24 lg:grid-cols-[0.7fr_1.3fr]" aria-labelledby="faq-heading">
        <div>
          <p className="landing-kicker">Before you connect</p>
          <h2 id="faq-heading" className="mt-4 font-serif text-4xl font-semibold text-ink">A few fair questions.</h2>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-white">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="faq-row group px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                {question}<ChevronDown className="h-4 w-4 shrink-0 text-ink-faint transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta mx-auto mb-5 max-w-7xl overflow-hidden rounded-[30px] bg-maroon-600 px-5 py-14 text-center text-white sm:px-10 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <CampusPals />
          <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">Give tomorrow morning less to explain.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/72">Connect your UMass account, or walk through a sample day first.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/api/auth/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-maroon-700">Connect UMass Google <ArrowRight className="h-4 w-4" /></a>
            {onDemo && <button onClick={onDemo} disabled={demoLoading} className="min-h-12 rounded-full border border-white/28 px-6 py-3 font-semibold text-white hover:bg-white/10 disabled:opacity-60">{demoLoading ? "Loading the demo…" : "Explore the demo"}</button>}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <Logo size={30} />
        <span>Less noise. More college.</span>
      </footer>
    </main>
  );
}

function MiniTask({ icon: Icon, title, meta, tone }: { icon: typeof Clock3; title: string; meta: string; tone: "maroon" | "navy" | "gold" }) {
  const color = tone === "maroon" ? "bg-maroon-50 text-maroon-600" : tone === "navy" ? "bg-[#edf1f6] text-navy" : "bg-[#fff7dc] text-[#8b6b00]";
  return <div className="flex items-center gap-3 rounded-xl border border-line-soft bg-white px-3 py-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-xs text-ink">{title}</strong><small className="block truncate text-[10px] text-ink-muted">{meta}</small></span><span className="ml-auto h-4 w-4 rounded-full border border-line" /></div>;
}

function Stat({ n, label }: { n: string; label: string }) {
  return <div className="rounded-xl border border-line bg-white p-3"><strong className="font-serif text-xl text-ink">{n}</strong><span className="mt-0.5 block text-[10px] leading-tight text-ink-muted">{label}</span></div>;
}

function StoryStep({ number, title, text, icon: Icon }: { number: string; title: string; text: string; icon: typeof BookOpen }) {
  return <li className="story-step grid gap-4 rounded-[22px] border border-white/10 bg-white/6 p-5 backdrop-blur sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6"><span className="font-mono text-xs text-white/35">{number}</span><span><strong className="block font-serif text-2xl font-semibold">{title}</strong><span className="mt-2 block max-w-[54ch] text-sm leading-relaxed text-white/58">{text}</span></span><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#ffc72c]"><Icon className="h-5 w-5" /></span></li>;
}

function TaskRow({ title, meta, label }: { title: string; meta: string; label: string }) {
  return <div className="flex items-start gap-3 py-4"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink-faint text-transparent"><Check className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{title}</strong><span className="mt-0.5 block text-xs text-ink-muted">{meta}</span></span><span className="rounded-full bg-maroon-50 px-2.5 py-1 text-[10px] font-bold text-maroon-700">{label}</span></div>;
}

function CheckLine({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-maroon-50 text-maroon-600"><Check className="h-3 w-3" strokeWidth={3} /></span>{children}</li>;
}

function Opportunity({ icon: Icon, eyebrow, title, meta }: { icon: typeof Sparkles; eyebrow: string; title: string; meta: string }) {
  return <article className="opportunity-card rounded-[20px] border border-line bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-maroon-50 text-maroon-600"><Icon className="h-5 w-5" /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.13em] text-maroon-600">{eyebrow}</p><h3 className="mt-1 font-serif text-xl font-semibold text-ink">{title}</h3><p className="mt-2 text-sm text-ink-muted">{meta}</p></article>;
}

function PrivacyCard({ icon: Icon, title, text }: { icon: typeof EyeOff; title: string; text: string }) {
  return <article className="rounded-[20px] border border-maroon-100 bg-white/84 p-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-maroon-50 text-maroon-600"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p></article>;
}

function WorkspaceCard({ icon: Icon, title, text }: { icon: typeof Sparkles; title: string; text: string }) {
  return <article className="workspace-card rounded-[20px] border border-line bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-maroon-50 text-maroon-600"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-serif text-xl font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p></article>;
}
