import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router";

import { HOUSING_LABEL, submitApplication, type HousingType } from "../api/applications";
import { ApiError, errorMessage, fieldErrors } from "../api/client";
import { FormField, inputClass } from "../components/FormField";
import { useCat } from "../hooks/useCats";
import { applicationSchema, type ApplicationForm } from "../lib/applicationSchema";

export function ApplyPage() {
  const catId = Number(useParams().id);
  const { data: cat, isPending, error: loadError } = useCat(catId);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    // housing_type left unset: the user must choose one explicitly.
    defaultValues: { full_name: "", email: "", phone: "", message: "", has_other_pets: false },
  });

  const mutation = useMutation({
    mutationFn: (data: ApplicationForm) => submitApplication(catId, data),
    onError: (error) => {
      // Server-side validation (422) lands on the matching field.
      for (const [field, message] of Object.entries(fieldErrors(error))) {
        setError(field as keyof ApplicationForm, { message });
      }
    },
  });

  const backLink = (
    <Link to={`/cats/${catId}`} className="text-amber-700 underline">
      ← Back to {cat?.name ?? "the cat"}
    </Link>
  );

  if (loadError instanceof ApiError && loadError.status === 404) {
    return <h1 className="text-center text-3xl font-bold text-amber-800">Cat not found</h1>;
  }
  if (loadError) return <p role="alert">Couldn't load this cat. Please try again later.</p>;
  if (isPending) return <p>Loading…</p>;

  if (mutation.isSuccess) {
    return (
      <section className="mx-auto max-w-xl rounded-xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-amber-800">Thank you!</h1>
        <p className="mt-4">
          We received your application for {cat.name}. We'll get in touch by email soon.
        </p>
        <Link to="/cats" className="mt-6 inline-block text-amber-700 underline">
          Meet the other cats
        </Link>
      </section>
    );
  }

  if (cat.status === "adopted") {
    return (
      <section className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-amber-800">
          {cat.name} has already found a home
        </h1>
        {backLink}
      </section>
    );
  }

  // 409 (duplicate / adopted meanwhile) and other non-field errors.
  const formError =
    mutation.isError && Object.keys(fieldErrors(mutation.error)).length === 0
      ? (errorMessage(mutation.error) ?? "Something went wrong. Please try again later.")
      : undefined;

  return (
    <section className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-sm">
      {backLink}
      <h1 className="mt-4 mb-6 text-3xl font-bold text-amber-800">Apply to adopt {cat.name}</h1>

      {/* noValidate: show our messages instead of the browser's bubbles. */}
      <form noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField label="Full name" error={errors.full_name?.message}>
          <input className={inputClass} autoComplete="name" {...register("full_name")} />
        </FormField>

        <FormField label="Email" error={errors.email?.message}>
          <input type="email" className={inputClass} autoComplete="email" {...register("email")} />
        </FormField>

        <FormField label="Phone (optional)" error={errors.phone?.message}>
          <input type="tel" className={inputClass} autoComplete="tel" {...register("phone")} />
        </FormField>

        <FormField label="Housing" error={errors.housing_type?.message}>
          <select className={inputClass} defaultValue="" {...register("housing_type")}>
            <option value="" disabled>
              Choose…
            </option>
            {(Object.entries(HOUSING_LABEL) as [HousingType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("has_other_pets")} />I have other pets
        </label>

        <FormField
          label="Tell us about your home"
          hint="Optional: who lives with you, your daily routine, experience with cats…"
          error={errors.message?.message}
        >
          <textarea rows={4} className={inputClass} {...register("message")} />
        </FormField>

        {formError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {mutation.isPending ? "Sending…" : "Send application"}
        </button>
      </form>
    </section>
  );
}
