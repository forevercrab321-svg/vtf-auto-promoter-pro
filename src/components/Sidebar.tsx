"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/programs", label: "Programs" },
  { href: "/targets", label: "Targets" },
  { href: "/attack-surface", label: "Attack Surface" },
  { href: "/hypotheses", label: "Hypotheses" },
  { href: "/tests", label: "Tests" },
  { href: "/findings", label: "Findings" },
  { href: "/reports", label: "Reports" },
  { href: "/approvals", label: "Approvals" },
  { href: "/knowledge", label: "Knowledge Base" },
  { href: "/rewards", label: "Rewards / ROI" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-ink-800 bg-ink-950/95 px-3 py-5">
      <Link href="/" className="mb-1 px-2 text-lg font-black tracking-tight text-white">
        Bounty<span className="text-indigo-400">OS</span>
      </Link>
      <p className="mb-5 px-2 text-[10px] uppercase tracking-widest text-slate-500">
        Bug Bounty AI Research OS
      </p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-indigo-600/20 font-semibold text-indigo-200 ring-1 ring-indigo-500/30"
                  : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-lg border border-ink-800 bg-ink-900/60 p-3 text-[11px] leading-relaxed text-slate-500">
        <p className="font-semibold text-slate-400">Core principles</p>
        <p>Authorized only · Scope first · Minimum impact · Human control</p>
      </div>
    </aside>
  );
}
