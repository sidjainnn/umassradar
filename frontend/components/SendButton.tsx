"use client";

import { useEffect, useRef } from "react";

/** The bookmarklet. It opens UMass Radar's /send window and hands it the page the student is looking at. */
function bookmarklet(origin: string): string {
  const code = `(function(){var A=${JSON.stringify(origin)};var w=window.open(A+'/send','radar_send','width=440,height=600');` +
    `if(!w){alert('Allow pop-ups for this page to send it to UMass Radar.');return;}` +
    `var d={type:'radar-page',url:location.href,title:document.title,text:(document.body.innerText||'').slice(0,60000)};` +
    `var n=0,t=setInterval(function(){n++;try{w.postMessage(d,A)}catch(e){}if(n>50)clearInterval(t)},300);` +
    `window.addEventListener('message',function(e){if(e.origin===A&&e.data==='radar-got-it')clearInterval(t)});})();`;
  return `javascript:${encodeURIComponent(code)}`;
}

export function SendButton() {
  const link = useRef<HTMLAnchorElement>(null);
  // React won't render javascript: links, so the bookmarklet is attached after mount.
  useEffect(() => { link.current?.setAttribute("href", bookmarklet(window.location.origin)); }, []);

  return (
    <section className="rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)] px-5 py-4">
      <h2 className="font-semibold text-ink">Bring in jobs from the UMass job board</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
        <li>Drag this button to your bookmarks bar:{" "}
          <a ref={link} onClick={(e) => e.preventDefault()} draggable
            className="ml-1 inline-block cursor-grab rounded-full bg-maroon-600 px-3 py-1 text-[13px] font-semibold text-white active:cursor-grabbing">
            Send to UMass Radar
          </a>
        </li>
        <li>Open the <a href="https://yes.umass.edu/portal/jobsearch" target="_blank" rel="noreferrer" className="font-semibold text-maroon-600 hover:underline">Student Employment job board</a>, pick On- or Off-Campus and search.</li>
        <li>Click <span className="font-semibold">Send to UMass Radar</span> in your bookmarks bar. The jobs on that page show up here.</li>
      </ol>
      <p className="mt-2 text-[13px] text-ink-muted">
        UMass doesn&apos;t let apps read the job board on their own, so the button only sends the page you&apos;re looking at, when you click it.
        It also works on Handshake job pages.
      </p>
    </section>
  );
}
