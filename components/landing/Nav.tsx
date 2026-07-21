"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-base/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-sm font-bold text-primary">
          Expo<span className="text-accent">.</span>search
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="#how-it-works"
            className="text-sm text-muted transition-colors hover:text-primary"
          >
            How it works
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-muted transition-colors hover:text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-surface2 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-border"
          >
            Get started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary sm:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu panel */}
      {open && (
        <div className="border-t border-border/60 px-4 pb-4 sm:hidden">
          <div className="flex flex-col gap-1 pt-2">
            <Link
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-primary"
            >
              How it works
            </Link>
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-primary"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-surface2 px-3 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-border"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}