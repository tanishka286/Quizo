"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AttemptQuizForm from "@/components/AttemptQuizForm";

export default function QuizAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = typeof params?.quizId === "string" ? params.quizId : "";
  const [quizPreview, setQuizPreview] = useState(null);
  const [started, setStarted] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadQuizPreview = async () => {
      if (!quizId) {
        setError("Quiz not found");
        setLoadingPreview(false);
        return;
      }

      try {
        setLoadingPreview(true);
        setError("");

        const token =
          window.localStorage.getItem("token") ||
          window.localStorage.getItem("access_token");

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/quiz/${quizId}/attempt`,
          {
          headers,
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Quiz not found");
          } else {
            setError("Quiz not found");
          }
          return;
        }

        const data = await response.json();
        setQuizPreview({
          title: data?.quiz?.title || "Quiz",
          duration: data?.quiz?.duration_seconds || 0,
          totalQuestions: Array.isArray(data?.questions) ? data.questions.length : 0,
        });
      } catch {
        setError("Quiz not found");
      } finally {
        setLoadingPreview(false);
      }
    };

    loadQuizPreview();
  }, [quizId]);

  const handleStart = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");
    console.log("Token:", token);

    if (!token) {
      router.push(`/login?redirect=/quiz/${quizId}`);
      return;
    }

    setStarted(true);
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      {loadingPreview ? (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-slate-200 w-full max-w-xl">
          <p className="text-sm text-slate-500">Loading quiz...</p>
        </div>
      ) : null}

      {!loadingPreview && error ? (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-slate-200 w-full max-w-xl">
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : null}

      {!loadingPreview && !error && !started && quizPreview ? (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-slate-200 w-full max-w-xl">
          <h1 className="text-xl font-semibold text-slate-900">{quizPreview.title}</h1>
          <p className="text-sm text-slate-500">Duration: {quizPreview.duration} seconds</p>
          <p className="text-sm text-slate-500">Total Questions: {quizPreview.totalQuestions}</p>
          <p className="text-sm text-slate-500">Marks: {quizPreview.totalQuestions}</p>

          <button
            type="button"
            onClick={handleStart}
            className="bg-black hover:bg-slate-900 text-white rounded-lg px-4 py-2"
          >
            Start Quiz
          </button>
        </div>
      ) : null}

      {!loadingPreview && !error && started ? <AttemptQuizForm quizId={quizId} /> : null}
    </section>
  );
}
