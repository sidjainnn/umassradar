"use client";

import { ArrowUpRight, Radio } from "lucide-react";

export type BriefData = {
  sentences: { text: string; item_ids: string[] }[];
  generated_by: "llm" | "template";
  generated_at: string;
};

export function Brief({
  brief,
  loading,
  onJump,
}: {
  brief: BriefData | null;
  loading: boolean;
  onJump: (id: string) => void;
}) {
  return (
    <section
      className="daily-brief"
      aria-labelledby="brief-title"
      aria-busy={loading}
    >
      <div className="brief-copy">
        <div className="eyebrow">
          <Radio size={14} aria-hidden="true" />
          <h2 id="brief-title">Your daily brief</h2>
          <span className="brief-tag">THE BIG PICTURE</span>
        </div>
        {loading ? (
          <div className="brief-skeleton" role="status">
            <span className="sr-only">Preparing your daily brief</span>
            <i />
            <i />
            <i />
          </div>
        ) : brief ? (
          <ul className="brief-lines">
            {brief.sentences.map((sentence, index) => (
              <li key={index}>
                <span>{sentence.text}</span>
                {sentence.item_ids.map((id, n) => (
                  <button
                    key={id}
                    onClick={() => onJump(id)}
                    aria-label={`View item ${n + 1} for: ${sentence.text}`}
                    title="View item"
                  >
                    <ArrowUpRight size={14} />
                    <span className="sr-only">View item</span>
                  </button>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="brief-unavailable">
            Your brief couldn’t load. Your items are still listed below.
          </p>
        )}
        <p className="brief-footnote">
          A little less inbox. A little more headspace.
        </p>
      </div>
      <div className="radar-art" aria-hidden="true">
        <div className="radar-ring ring-one" />
        <div className="radar-ring ring-two" />
        <div className="radar-ring ring-three" />
        <div className="radar-sweep" />
        <span className="radar-point point-one" />
        <span className="radar-point point-two" />
        <span className="radar-center" />
        <span className="radar-caption">ON YOUR RADAR</span>
      </div>
    </section>
  );
}
