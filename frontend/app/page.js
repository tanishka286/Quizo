import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-20 py-8 sm:py-12">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 px-6 py-16 text-center shadow-sm sm:px-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl">
          Quizo - Smart Quiz Platform
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          Create, attempt, and evaluate quizzes effortlessly.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black sm:w-auto"
          >
            Signup
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-center text-2xl font-bold text-slate-800 sm:text-3xl">
          Features
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-2xl">📝</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-800">
              Create Quizzes
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Build quiz sets quickly with a clean and simple interface.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-2xl">🎯</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-800">
              Attempt Quizzes
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Take quizzes smoothly with a focused, distraction-free layout.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-2xl">⚡</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-800">
              Instant Results
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Get fast score updates and quick performance feedback.
            </p>
          </article>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
        Built for academic project
      </footer>
    </div>
  );
}
