"use client";

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { CampusPals } from "./CampusPals";
import { CampusTophat } from "./CampusTophat";

type Props = {
  notice: string | null;
  onDemo?: () => void;
  demoLoading?: boolean;
};

export function Landing({ notice, onDemo, demoLoading }: Props) {
  return (
    <main className="landing-page">
      <CampusTophat />
      <header className="landing-header">
        <Logo />
        <span>BUILT FOR LIFE AT UMASS AMHERST</span>
      </header>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">
            <span className="connection-dot" />
            Your day. A little clearer.
          </p>
          <h1>
            College is a lot.
            <br />
            <em>Your inbox can chill.</em>
          </h1>
          <p className="landing-description">
            Deadlines, appointments, replies you owe. UMass Radar brings the
            important things out of your inbox and into one calm view of today
            and this week.
          </p>
          {notice && (
            <p className="notice" role="alert">
              {notice}
            </p>
          )}
          <div className="landing-actions">
            <a href="/api/auth/login" className="primary-button">
              Connect UMass Gmail
              <ArrowRight size={16} />
            </a>
            {onDemo && (
              <button
                className="secondary-button"
                onClick={onDemo}
                disabled={demoLoading}
              >
                {demoLoading ? "Preparing your demo…" : "Explore the demo"}
              </button>
            )}
          </div>
          <p className="landing-privacy">
            <ShieldCheck size={13} />
            Read-only access. Your email stays your email.
          </p>
        </div>
        <div
          className="landing-preview"
          aria-label="Illustrative preview of a student’s daily overview"
        >
          <div className="preview-top">
            <span>
              <i className="preview-dot" />
              <i className="preview-dot" />
              <i className="preview-dot" />
            </span>
            <span>YOUR MORNING, SIMPLIFIED</span>
          </div>
          <div className="preview-card">
            <small>A little clarity for today</small>
            <h2>Good morning, Minuteman.</h2>
            <div className="preview-brief">
              <strong>On your radar</strong>A lab to finish, a conversation to
              keep moving, and time to think about what’s next.
            </div>
            <p className="preview-list-label">TODAY</p>
            {[
              {
                icon: Clock3,
                category: "deadline",
                title: "Finish your lab assignment",
                detail: "ECE 122 · Due at 5 PM",
              },
              {
                icon: CalendarDays,
                category: "appointment",
                title: "Meet with your academic advisor",
                detail: "Goodell · 2 PM",
              },
              {
                icon: MessageCircle,
                category: "reply_owed",
                title: "Send your research availability",
                detail: "A professor is waiting on you",
              },
            ].map(({ icon: Icon, category, title, detail }) => (
              <div key={title} className="preview-task">
                <div className={`item-symbol symbol-${category}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </div>
                <span className="preview-check" />
              </div>
            ))}
            <p className="preview-bottom">
              <ShieldCheck size={12} />
              The useful things stay. The noise fades away.
            </p>
          </div>
          <p className="preview-caption">
            An example day. Your radar is built from your inbox.
          </p>
          <div className="preview-pal" aria-hidden="true">
            <span>you got this!</span>
            <div className="preview-pal-face">
              <i />
              <i />
              <b />
            </div>
          </div>
        </div>
      </section>
      <section
        className="pal-zone"
        aria-label="Meet the animated Radar campus pals"
      >
        <div>
          <span className="pal-zone-kicker">tiny campus helpers</span>
          <h2>They keep watch while you do literally anything else.</h2>
        </div>
        <CampusPals />
      </section>
      <section className="landing-benefits" aria-label="How Radar helps">
        <article>
          <span>01</span>
          <h2>Know what needs you.</h2>
          <p>
            Coursework, advising, campus life. See today’s priorities and the
            week ahead in one place.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Keep the context.</h2>
          <p>
            Every item carries its source. See why it matters and jump back to
            the original email.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Make room for more.</h2>
          <p>
            Find opportunities without the newsletter pile-up. Mark things done
            and get on with your day.
          </p>
        </article>
      </section>
      <footer className="dashboard-footer">
        <span>Less noise. More college.</span>
        <span>Made for UMass Amherst students</span>
      </footer>
    </main>
  );
}
