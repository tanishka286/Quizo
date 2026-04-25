export default function Sidebar({
  role,
  selectedTab,
  onSelectTab,
  onLogout,
}) {
  const teacherItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "createQuiz", label: "Create Quiz" },
    { key: "myQuizzes", label: "My Quizzes" },
  ];

  const studentItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "availableQuizzes", label: "Available Quizzes" },
    { key: "myResults", label: "My Results" },
  ];

  const menuItems = role === "teacher" ? teacherItems : studentItems;

  return (
    <aside className="flex h-full w-[240px] flex-col overflow-y-auto bg-black text-white">
      <div className="border-b border-slate-800 px-6 py-5">
        <h2 className="text-2xl font-bold tracking-tight">Quizo</h2>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = selectedTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={onLogout}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
