"use client";

import { useState } from "react";
import { createQuiz } from "@/services/quiz";
import AddQuestionForm from "@/components/AddQuestionForm";

export default function CreateQuizForm({ onQuizFinished }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quizId, setQuizId] = useState(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCompletionMessage("");
    setCopied(false);

    const parsedDuration = Number(duration);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError("Duration must be a number greater than 0.");
      return;
    }

    const token =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("access_token");

    if (!token) {
      setError("You are not logged in. Please login again.");
      return;
    }

    const durationSeconds =
      durationUnit === "minutes"
        ? Math.round(parsedDuration * 60)
        : Math.round(parsedDuration);

    try {
      setLoading(true);
      const response = await createQuiz(
        {
          title: title.trim(),
          duration_seconds: durationSeconds,
          shuffle_questions: shuffleQuestions,
        },
        token
      );

      setSuccess("Quiz created successfully");
      setQuizId(response?.quiz?.id || null);
      setTitle("");
      setDuration("");
      setDurationUnit("minutes");
      setShuffleQuestions(false);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to create quiz."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinishQuiz = () => {
    setQuizId(null);
    setCopied(false);
    setCompletionMessage("Quiz completed successfully");
    if (typeof onQuizFinished === "function") {
      onQuizFinished();
    }
  };

  const quizLink = quizId
    ? new URL(`/quiz/${encodeURIComponent(quizId)}`, window.location.origin).toString()
    : "";

  const handleCopyQuizLink = async () => {
    if (!quizLink) return;
    try {
      await navigator.clipboard.writeText(quizLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-2xl font-semibold text-slate-900">Create Quiz</h2>
          <p className="mt-2 text-sm text-slate-600">
            Set up your quiz details and create it instantly.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="quiz-title" className="text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="quiz-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label htmlFor="quiz-duration" className="text-sm font-medium text-slate-700">
                Duration
              </label>
              <input
                id="quiz-duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 20"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="quiz-duration-unit"
                className="text-sm font-medium text-slate-700"
              >
                Unit
              </label>
              <select
                id="quiz-duration-unit"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                <option value="minutes">Minutes</option>
                <option value="seconds">Seconds</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <span className="text-sm font-medium text-slate-700">Shuffle Questions</span>
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          {success ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              <p>{success}</p>
              {quizId ? <p className="mt-1">Quiz ID: {quizId}</p> : null}
              {quizId ? (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-medium text-emerald-800">
                    Share Quiz Link
                  </label>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <a
                      href={quizLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 underline break-all"
                    >
                      {quizLink}
                    </a>
                    <button
                      type="button"
                      onClick={() => window.open(quizLink, "_blank")}
                      className="ml-2 px-3 py-1 text-sm bg-white text-slate-900 border border-slate-300 rounded-md"
                    >
                      Open Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(quizLink);
                        setCopied(true);
                      }}
                      className="ml-2 px-3 py-1 text-sm bg-slate-900 text-white rounded-md"
                    >
                      Copy
                    </button>
                  </div>
                  {copied && <p className="text-green-600 text-sm mt-1">Link copied!</p>}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating..." : "Create Quiz"}
          </button>
        </form>
      </section>

      {!quizId && completionMessage ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {completionMessage}
        </p>
      ) : null}

      {quizId ? <AddQuestionForm quizId={quizId} onFinishQuiz={handleFinishQuiz} /> : null}
    </div>
  );
}
