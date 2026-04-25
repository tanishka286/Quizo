import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  role,
  selectedTab,
  onSelectTab,
  onLogout,
  children,
}) {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden border-t border-slate-300 bg-white">
      <div className="flex h-full">
        <Sidebar
          role={role}
          selectedTab={selectedTab}
          onSelectTab={onSelectTab}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
