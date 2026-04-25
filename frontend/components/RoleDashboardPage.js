"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/services/user";
import { getAllQuizzes, getMyQuizzes } from "@/services/quiz";
import DashboardLayout from "@/components/DashboardLayout";
import CreateQuizForm from "@/components/CreateQuizForm";
import AttemptQuizForm from "@/components/AttemptQuizForm";
import MyQuizzesList from "@/components/MyQuizzesList";
import MyResultsList from "@/components/MyResultsList";

const isAuthTokenError = (err) => {
  const status = err?.response?.status;
  const errorText = `${err?.response?.data?.error || ""} ${
    err?.response?.data?.message || ""
  }`.toLowerCase();
  return status === 401 || errorText.includes("jwt") || errorText.includes("token");
};

export default function RoleDashboardPage({ requiredRole }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [selectedTab, setSelectedTab] = useState("dashboard");

  useEffect(() => {
    const loadProfile = async () => {
      const token =
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const data = await getProfile(token);
        const resolvedProfile = data?.profile || null;
        const role = resolvedProfile?.role || "student";
        setProfile(resolvedProfile);

        if (requiredRole === "teacher" && role !== "teacher") {
          router.replace("/dashboard/student");
          return;
        }
        if (requiredRole === "student" && role !== "student") {
          router.replace("/dashboard/teacher");
          return;
        }

      } catch (err) {
        if (isAuthTokenError(err)) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }

        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [requiredRole, router]);

  useEffect(() => {
    const role = profile?.role;
    if (!role) return;

    const token =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("access_token");
    if (!token) return;

    const loadTotalQuizzes = async () => {
      try {
        if (role === "teacher") {
          const myQuizzes = await getMyQuizzes(token);
          setTotalQuizzes(Array.isArray(myQuizzes) ? myQuizzes.length : 0);
        } else {
          const allQuizzes = await getAllQuizzes(token);
          setTotalQuizzes(Array.isArray(allQuizzes) ? allQuizzes.length : 0);
        }
      } catch {
        setTotalQuizzes(0);
      }
    };

    loadTotalQuizzes();
  }, [profile?.role]);

  if (loading) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-[70vh] grid place-items-center">
        <div className="w-full max-w-lg rounded-xl border border-red-100 bg-white px-6 py-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        </div>
      </section>
    );
  }

  const role = profile?.role || requiredRole;
  const displayName = profile?.full_name?.trim() || "there";

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("access_token");
    router.replace("/login");
  };

  const renderContent = () => {
    if (selectedTab === "dashboard") {
      return (
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-slate-900">Hi, {displayName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Overview of your quiz activity and recent progress.
            </p>
          </header>

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Quizzes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalQuizzes}</p>
            </article>
            <article className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Time Spent</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">14h 30m</p>
            </article>
            <article className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Role</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-slate-900">{role}</p>
            </article>
          </section>
        </div>
      );
    }

    if (role === "teacher" && selectedTab === "createQuiz") {
      return <CreateQuizForm onQuizFinished={() => setSelectedTab("dashboard")} />;
    }

    if (role === "teacher" && selectedTab === "myQuizzes") {
      return <MyQuizzesList />;
    }

    if (role === "student" && selectedTab === "availableQuizzes") {
      return <AttemptQuizForm />;
    }

    if (role === "student" && selectedTab === "myResults") {
      return <MyResultsList />;
    }

    return null;
  };

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-10 w-screen">
      <DashboardLayout
        role={role}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>
    </div>
  );
}
