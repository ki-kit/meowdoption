import { Link } from "react-router";

export function HomePage() {
  return (
    <section className="text-center">
      <h1 className="text-4xl font-bold text-amber-800">Find your new best friend</h1>
      <p className="mt-4 text-lg text-stone-600">
        Browse cats waiting for a loving home.
      </p>
      <Link
        to="/cats"
        className="mt-8 inline-block rounded-full bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700"
      >
        Browse cats
      </Link>
    </section>
  );
}
