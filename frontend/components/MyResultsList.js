"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyResults } from "@/services/result";

const isAuthTokenError = (err) => {
  const status = err?.response?.status;
  const errorText = `${err?.response?.data?.error || ""} ${
    err?.response?.data?.message || ""
  }`.toLowerCase();
  return status === 401 || errorText.includes("jwt") || errorText.includes("token");
};

const formatSubmittedAt = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

export default function MyResultsList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const loadResults = async () => {
      const token =
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const rows = await getMyResults(token);
        setResults(rows);
      } catch (err) {
        if (isAuthTokenError(err)) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load results."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [router]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">My Results</h2>
      <p className="mt-2 text-sm text-slate-600">Past quiz attempts and scores.</p>

      {loading ? <p className="mt-5 text-sm text-slate-600">Loading results...</p> : null}

      {error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No attempts yet
        </p>
      ) : null}

      {!loading && !error && results.length > 0 ? (
        <div className="mt-5 space-y-3">
          {results.map((result, index) => (
            <article
              key={`${result.quiz_id}-${result.submitted_at || index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">Quiz ID: {result.quiz_id}</p>
              <p className="mt-1 text-sm text-slate-600">Score: {result.score_percent}%</p>
              <p className="mt-1 text-sm text-slate-600">
                Correct: {result.correct_count} / {result.total_questions}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Submitted: {formatSubmittedAt(result.submitted_at)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
