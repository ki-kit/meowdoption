import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-amber-50 text-stone-800">
      <header className="border-b border-amber-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold text-amber-700">
            🐱 Meowdoption
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-sm text-stone-500">
        Every cat deserves a warm lap.
      </footer>
    </div>
  );
}
