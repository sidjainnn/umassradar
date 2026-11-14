import Image from "next/image";

export function RadarLoader({ message = "Checking your Radar" }: { message?: string }) {
  return (
    <div className="radar-loader min-h-screen" role="status" aria-live="polite" aria-label={message}>
      <div className="radar-loader-glow" aria-hidden="true" />
      <div className="radar-loader-content">
        <div className="radar-loader-stage" aria-hidden="true">
          <span className="radar-speed-line radar-speed-line-one" />
          <span className="radar-speed-line radar-speed-line-two" />
          <span className="radar-speed-line radar-speed-line-three" />
          <Image
            className="radar-loader-sam"
            src="/mascots/sam-minuteman-3d.png"
            alt=""
            width={1024}
            height={1536}
            priority
          />
          <span className="radar-loader-shadow" />
        </div>
        <p className="radar-loader-kicker">UMass Radar</p>
        <h1>Getting your day in focus</h1>
        <div className="radar-loader-progress" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="sr-only">{message}…</span>
      </div>
    </div>
  );
}
