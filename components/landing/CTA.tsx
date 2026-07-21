import Link from "next/link";

export function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center sm:px-8 sm:py-14">
        <h2 className="font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl">
          Stop scrubbing through video.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Sign in and ask your first question — the answer will tell you
          exactly where to look.
        </p>
        <Link
          href="/sign-up"
          className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-base transition-colors hover:bg-[#ff8258]"
        >
          Start asking questions
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 text-center font-mono text-xs text-muted sm:flex-row sm:justify-between sm:gap-0 sm:text-left">
        <span>Expo.search</span>
         <a
        
          href="https://github.com/Sameer9823/Expo-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary hover:underline"
        >
          GitHub
        </a>

        <span>&copy; {new Date().getFullYear()} Sameer Selokar</span>
      </div>
    </footer>
  );
}