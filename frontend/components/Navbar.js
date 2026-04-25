import Link from "next/link";

export default function Navbar() {
  return (
    <div className="navbar-container">
      <div className="navbar-top-line"></div>
      <nav className="navbar mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-800">
          <span className="inline-flex items-center gap-2 rounded-xl px-1 py-0.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white shadow-sm">
              Q
            </span>
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">
              Quizo
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          >
            Signup
          </Link>
        </div>
      </nav>
      <div className="navbar-bottom-line"></div>
    </div>
  );
}
