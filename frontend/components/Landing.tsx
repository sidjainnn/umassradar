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
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
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

export function Landing({ notice, onDemo, demoLoading }: Props) {
  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      <header className="landing-nav mx-auto flex max-w-7xl items-center gap-4 px-4 py-5 sm:px-7">
        <a href="#top" aria-label="UMass Radar home"><Logo size={36} /></a>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Homepage">
          <a href="#how-it-works">How it works</a>
          <a href="#what-it-finds">What it finds</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <a href="/api/auth/login" className="landing-nav-cta ml-auto inline-flex min-h-10 items-center rounded-full bg-maroon-600 px-4 text-sm font-semibold text-white md:ml-3">
          Sign in
        </a>
      </header>

      <section id="top" className="landing-cinematic relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 overflow-hidden rounded-[30px] px-5 py-14 sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-14">
        <div className="landing-orbit" aria-hidden="true" />
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-maroon-200 bg-white/82 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-maroon-700 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-maroon-600" />
            Built around a UMass student’s day
          </p>
          <h1 className="mt-7 max-w-[11ch] font-serif text-[48px] font-semibold leading-[1.03] tracking-[-0.045em] text-ink sm:text-[64px] lg:text-[72px]">
            Wake up already <span className="text-maroon-600">caught up.</span>
          </h1>
          <p className="mt-6 max-w-[49ch] text-base leading-relaxed text-ink-soft sm:text-lg">
            UMass Radar turns the scattered parts of college—email, Canvas, schedules and syllabi—into one clear view of what needs you today.
          </p>
          {notice && <p role="alert" className="mt-5 rounded-2xl border border-maroon-100 bg-white/80 px-4 py-3 text-sm text-ink-soft">{notice}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="/api/auth/login" className="landing-hero-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-maroon-600 px-6 py-3 font-semibold text-white">
              Connect UMass Google <ArrowRight className="h-4 w-4" />
            </a>
            {onDemo && (
              <button onClick={onDemo} disabled={demoLoading}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-maroon-200 bg-white/82 px-6 py-3 font-semibold text-maroon-700 backdrop-blur hover:bg-white disabled:opacity-60">
                {demoLoading ? "Loading the demo…" : "Explore the demo"}
              </button>
            )}
          </div>
          <p className="mt-4 flex max-w-[50ch] items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            Read-only Gmail access. Email bodies and uploaded files are never stored.
          </p>
        </div>

        <div className="hero-product relative z-10 lg:pl-4" aria-label="Illustrative UMass Radar morning screen">
          <div className="hero-sam" aria-label="Sam the Minuteman welcomes students to UMass Radar">
            <Image
              src="/mascots/sam-minuteman-3d.png"
              alt="A friendly 3D Sam the Minuteman holding a class schedule"
              width={1024}
              height={1536}
              priority
            />
          </div>
          <div className="hero-window rounded-[26px] border border-white/30 bg-white/94 p-4 shadow-[0_36px_100px_rgba(0,0,0,0.38)] backdrop-blur sm:p-5">
            <div className="flex items-center gap-2 border-b border-line-soft pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-maroon-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffc72c]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#86c8bc]" />
              <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">Saturday · your campus</span>
            </div>
            <div className="grid gap-4 pt-4 sm:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-xs text-ink-muted">Good morning.</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">Here’s what needs you.</h2>
                <div className="mt-4 rounded-2xl bg-maroon-600 p-4 text-white shadow-[0_14px_30px_rgba(132,0,40,0.2)]">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-white/65"><Sparkles className="h-3.5 w-3.5" /> Your morning brief</div>
                  <p className="mt-2 text-sm leading-relaxed">Lab 6 is due tonight. Advising starts at 2, and Prof. Chen is waiting on your availability.</p>
                </div>
                <div className="mt-4 space-y-2">
                  <MiniTask icon={Clock3} title="Lab 6: circuits & signals" meta="ECE 122 · 11:59 PM" tone="maroon" />
                  <MiniTask icon={CalendarDays} title="Academic advising" meta="Goodell 613 · 2:00 PM" tone="navy" />
                  <MiniTask icon={MessageCircle} title="Send research availability" meta="Reply owed" tone="gold" />
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-[#f7f7f6] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">At a glance</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Stat n="3" label="this week" />
                  <Stat n="1" label="reply owed" />
                  <Stat n="4" label="opportunities" />
                  <Stat n="12" label="noise filtered" />
                </div>
                <div className="mt-4 rounded-xl border border-line bg-white p-3">
                  <p className="text-xs font-semibold text-ink">Next on campus</p>
                  <p className="mt-1 text-[11px] text-ink-muted">Office hours · 4 PM</p>
                  <p className="text-[11px] text-forest">You’re free</p>
                </div>
              </div>
            </div>
            <div className="hero-pals mt-3 border-t border-line-soft pt-2"><CampusPals /></div>
          </div>
          <div className="hero-float hero-float-left"><BellRing className="h-4 w-4" /><span>Deadline found</span></div>
          <div className="hero-float hero-float-right"><EyeOff className="h-4 w-4" /><span>12 distractions filtered</span></div>
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

      <section className="product-map mx-auto max-w-7xl rounded-[30px] border border-line px-5 py-14 sm:px-10 sm:py-20 lg:px-14" aria-labelledby="workspace-heading">
        <div className="max-w-3xl">
          <p className="landing-kicker">A complete student workspace</p>
          <h2 id="workspace-heading" className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">Every backend capability has a clear place to live.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">The homepage explains the promise. Once signed in, the product turns each real integration into a focused screen and a usable next step.</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceCard icon={Sparkles} title="Home" text="Morning brief, today timeline, coming up and at-a-glance counts." />
          <WorkspaceCard icon={Check} title="To do" text="Deadlines, appointments and replies with sources and completion states." />
          <WorkspaceCard icon={CalendarDays} title="Schedule" text="SPIRE schedules, calendar conflicts and office hours you can attend." />
          <WorkspaceCard icon={BriefcaseBusiness} title="Opportunities" text="Campus jobs, research roles, clubs and events separated from inbox noise." />
          <WorkspaceCard icon={BellRing} title="Updates" text="Course news, status changes and filtered newsletters kept out of the way." />
          <WorkspaceCard icon={BookOpen} title="Course profiles" text="Sections, instructors, syllabus facts, exam dates and shared resources." />
          <WorkspaceCard icon={FileText} title="Smart imports" text="Schedules, syllabi, job boards and portal screenshots become usable items." />
          <WorkspaceCard icon={ShieldCheck} title="Profile & privacy" text="Connections, re-sync controls, data visibility and account deletion." />
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
