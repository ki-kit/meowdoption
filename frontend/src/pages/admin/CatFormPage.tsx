import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";

import type { Cat } from "../../api/cats";
import { ApiError, errorMessage, fieldErrors } from "../../api/client";
import { FormField, inputClass } from "../../components/FormField";
import { useSaveCat } from "../../hooks/useAdmin";
import { useCat } from "../../hooks/useCats";
import { catSchema, type CatFormValues } from "../../lib/catSchema";
import { CatMediaSection } from "./CatMediaSection";
import { formatAge, STATUS_LABEL } from "../../lib/format";

const TRAITS = [
  ["good_with_kids", "Good with kids"],
  ["good_with_cats", "Good with cats"],
  ["good_with_dogs", "Good with dogs"],
] as const;

/** /admin/cats/new and /admin/cats/:id/edit */
export function CatFormPage() {
  const { id } = useParams();
  const catId = id === undefined ? undefined : Number(id);
  const { data: cat, isPending, error } = useCat(catId ?? NaN);

  if (catId === undefined) return <CatForm />;
  if (error instanceof ApiError && error.status === 404) {
    return <h1 className="text-3xl font-bold text-amber-800">Cat not found</h1>;
  }
  if (error) return <p role="alert">Couldn't load this cat.</p>;
  if (isPending) return <p>Loading…</p>;
  // key: remount with fresh defaults if we navigate between two cats.
  return (
    <>
      <CatForm key={cat.id} cat={cat} />
      <CatMediaSection cat={cat} kind="photos" />
      <CatMediaSection cat={cat} kind="sounds" />
    </>
  );
}

function CatForm({ cat }: { cat?: Cat }) {
  const navigate = useNavigate();
  const save = useSaveCat(cat?.id);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, dirtyFields },
  } = useForm<CatFormValues>({
    resolver: zodResolver(catSchema),
    defaultValues: cat ?? {
      name: "",
      breed: "",
      description: "",
      castrated: false,
      status: "available",
      good_with_kids: false,
      good_with_cats: false,
      good_with_dogs: false,
    },
  });
  const age = useWatch({ control, name: "age_months" });

  const onSubmit = (values: CatFormValues) => {
    // Editing sends only what changed (PATCH), so we don't overwrite a field
    // someone else edited meanwhile.
    const body = cat
      ? Object.fromEntries(Object.keys(dirtyFields).map((k) => [k, values[k as keyof CatFormValues]]))
      : values;
    save.mutate(body, {
      onSuccess: () => navigate("/admin/cats"),
      onError: (err) => {
        for (const [field, message] of Object.entries(fieldErrors(err))) {
          setError(field as keyof CatFormValues, { message });
        }
      },
    });
  };

  const formError =
    save.isError && Object.keys(fieldErrors(save.error)).length === 0
      ? (errorMessage(save.error) ?? "Couldn't save. Please try again.")
      : undefined;

  return (
    <section className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-sm">
      <Link to="/admin/cats" className="text-amber-700 underline">← All cats</Link>
      <h1 className="mt-4 mb-6 text-3xl font-bold text-amber-800">{cat ? `Edit ${cat.name}` : "Add a cat"}</h1>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Name" error={errors.name?.message}>
          <input className={inputClass} {...register("name")} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Sex" error={errors.sex?.message}>
            <select className={inputClass} defaultValue={cat ? undefined : ""} {...register("sex")}>
              <option value="" disabled>Choose…</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </FormField>
          <FormField
            label="Age (months)"
            error={errors.age_months?.message}
            hint={Number.isInteger(age) && age >= 0 ? `= ${formatAge(age)}` : undefined}
          >
            <input type="number" min={0} max={360} className={inputClass} {...register("age_months", { valueAsNumber: true })} />
          </FormField>
        </div>

        <FormField label="Breed" error={errors.breed?.message}>
          <input className={inputClass} {...register("breed")} />
        </FormField>

        <FormField label="Description" error={errors.description?.message}>
          <textarea rows={4} className={inputClass} {...register("description")} />
        </FormField>

        <FormField label="Status" error={errors.status?.message}>
          <select className={inputClass} {...register("status")}>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="mb-1 text-sm font-medium">Health & personality</legend>
          <label className="flex items-center gap-1">
            <input type="checkbox" {...register("castrated")} />
            Castrated
          </label>
          {TRAITS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-1">
              <input type="checkbox" {...register(key)} />
              {label}
            </label>
          ))}
        </fieldset>

        {formError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-full bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : cat ? "Save changes" : "Add cat"}
        </button>
      </form>
    </section>
  );
}
