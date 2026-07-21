const FEATURES = [
  {
    title: "Cited to the second",
    body: "Every answer points to the exact lesson and timestamp, so you can jump straight to the source video.",
  },
  {
    title: "Understands vague questions",
    body: "Broad or fuzzy questions get rewritten and broken down automatically to find what you actually meant.",
  },
  {
    title: "Self-checks its answers",
    body: "Low-quality responses are caught and retried before they ever reach you.",
  },
  {
    title: "Guarded by design",
    body: "Off-topic or unsafe input is filtered before it reaches the model, both in and out.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="font-display text-xl font-bold text-primary sm:text-2xl md:text-3xl">
        Built on advanced RAG, not keyword search
      </h2>
      <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:mt-10 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-surface p-5 sm:p-6">
            <h3 className="font-display text-base font-medium text-primary">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}