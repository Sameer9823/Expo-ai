const STEPS = [
  {
    n: "01",
    title: "Ask in plain language",
    body: "Type any question about the course — a concept, a bug, a step you missed.",
  },
  {
    n: "02",
    title: "We search every subtitle",
    body: "Your question is matched against the transcript of every lesson, not just keywords.",
  },
  {
    n: "03",
    title: "Get the answer, and the source",
    body: "The response links straight back to the lesson name and the timestamp it came from.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl">
        How it works
      </h2>
      <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-3 sm:gap-8">
        {STEPS.map((step) => (
          <div key={step.n} className="border-t border-border pt-5">
            <span className="font-mono text-xs text-accent">{step.n}</span>
            <h3 className="mt-3 font-display text-base font-medium text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}