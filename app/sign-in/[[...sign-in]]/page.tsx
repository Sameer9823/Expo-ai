import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="terminal-grid flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-6">
      <Link href="/" className="font-display text-lg font-bold text-primary">
        Expo<span className="text-accent">.</span>search
        <span
          className="ml-0.5 inline-block h-[0.8em] w-[2px] translate-y-[1px] bg-accent animate-blink"
          aria-hidden="true"
        />
      </Link>
      <SignIn />
    </main>
  );
}