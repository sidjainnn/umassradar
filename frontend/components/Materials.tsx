import { BookOpen, KeyRound, Laptop } from "lucide-react";

export type Material = {
  title: string; author: string | null; edition: string | null; isbn: string | null; required: boolean;
  access_code: boolean; platform: string | null; note: string | null; evidence: string;
};

export type MaterialGroup = "buy" | "code" | "optional" | "none";

export const GROUP_LABEL: Record<MaterialGroup, { title: string; hint: string; tint: string; ink: string }> = {
  code: { title: "Access code needed", hint: "Paid online homework or a clicker", tint: "#fbe9ee", ink: "#6a0020" },
  buy: { title: "Buy, rent or borrow", hint: "Required books and kits", tint: "#fff6dc", ink: "#6b4b00" },
  optional: { title: "Optional", hint: "Recommended, or there's a free way", tint: "#eef4ec", ink: "#2f4a29" },
  none: { title: "Nothing to buy", hint: "The syllabus says no textbook is needed", tint: "#e3f4f7", ink: "#00505c" },
};

export function groupOf(m: Material): MaterialGroup {
  if (/no (text)?book|not required|no required/i.test(m.title)) return "none";
  if (m.required && m.access_code) return "code";
  if (m.required) return "buy";
  return "optional";
}

function isDevice(m: Material) {
  return /laptop|calculator|clicker|iclicker|kit|headphones/i.test(m.title);
}

export function MaterialRow({ m, course }: { m: Material; course?: string }) {
  const g = groupOf(m);
  const Icon = m.access_code ? KeyRound : isDevice(m) ? Laptop : BookOpen;
  const search = encodeURIComponent(m.isbn ?? [m.title, m.author].filter(Boolean).join(" "));
  return (
    <li className="flex gap-3 py-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl" style={{ background: GROUP_LABEL[g].tint, color: GROUP_LABEL[g].ink }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {m.title}
          {course && <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">{course}</span>}
        </p>
        <p className="text-sm text-ink-muted">
          {[m.author, m.edition && (/edition/i.test(m.edition) ? m.edition : `${m.edition} edition`), m.platform, m.required ? "Required" : "Not required", m.isbn && `ISBN ${m.isbn}`].filter(Boolean).join(" · ")}
        </p>
        {m.note && <p className="mt-1 text-sm font-semibold text-forest">{m.note}</p>}
        {m.evidence && <p className="mt-1 font-serif text-sm italic text-ink-soft">“{m.evidence}”</p>}
        {g !== "none" && !isDevice(m) && !m.access_code && (
          <p className="mt-1.5 flex flex-wrap gap-3 text-[13px] font-semibold">
            <a className="text-maroon-700 hover:underline" target="_blank" rel="noreferrer" href={`https://umass.on.worldcat.org/search?queryString=${search}`}>Check the library</a>
            <a className="text-maroon-700 hover:underline" target="_blank" rel="noreferrer" href={`https://www.bkstr.com/umassamherststore/search?q=${search}`}>Textbook Annex</a>
          </p>
        )}
      </div>
    </li>
  );
}
