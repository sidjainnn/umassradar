import Link from "next/link";
import { CampusTophat } from "./CampusTophat";
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
    <div className="cics-site-nav">
      <CampusTophat />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0">
            <Logo />
          </Link>
          <nav className="ml-auto flex gap-1">
            {link("/", "Dashboard", active === "dashboard")}
            {link("/courses", "Courses", active === "courses")}
          </nav>
        </div>
      </header>
    </div>
  );
}
