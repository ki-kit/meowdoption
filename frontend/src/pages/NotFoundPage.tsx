import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-bold text-amber-800">Page not found</h1>
      <p className="mt-4 text-stone-600">This cat wandered off.</p>
      <Link to="/" className="mt-6 inline-block text-amber-700 underline">
        Back to home
      </Link>
    </section>
  );
}
