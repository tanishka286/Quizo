"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/services/user";

const isAuthTokenError = (err) => {
  const status = err?.response?.status;
  const errorText = `${err?.response?.data?.error || ""} ${
    err?.response?.data?.message || ""
  }`.toLowerCase();
  return status === 401 || errorText.includes("jwt") || errorText.includes("token");
};

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const resolveRoleAndRedirect = async () => {
      const token =
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const data = await getProfile(token);
        const role = data?.profile?.role || "student";
        if (role === "teacher") {
          router.replace("/dashboard/teacher");
          return;
        }
        router.replace("/dashboard/student");
      } catch (err) {
        if (isAuthTokenError(err)) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        router.replace("/dashboard/student");
      }
    };

    resolveRoleAndRedirect();
  }, [router]);

  return (
    <section className="min-h-[70vh] grid place-items-center">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-sm text-slate-600">Redirecting to your dashboard...</p>
      </div>
    </section>
  );
}
