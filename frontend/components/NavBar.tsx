import Link from "next/link";
import { Logo } from "./Logo";

export function NavBar({ active }: { active: "dashboard" | "courses" }) {
  const link = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f7f6f4]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/"><Logo /></Link>
        <nav className="ml-auto flex gap-1">
          {link("/", "Dashboard", active === "dashboard")}
          {link("/courses", "Courses", active === "courses")}
        </nav>
      </div>
    </header>
  );
}
