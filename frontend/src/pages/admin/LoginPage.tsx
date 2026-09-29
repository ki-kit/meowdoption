import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

import { ApiError } from "../../api/client";
import { FormField, inputClass } from "../../components/FormField";
import { useLogin, useMe } from "../../hooks/useAuth";
import { safeRedirect } from "../../lib/safeRedirect";

const schema = z.object({
  email: z.string().trim().min(1, "Please enter your email"),
  password: z.string().min(1, "Please enter your password"),
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = safeRedirect(searchParams.get("next"));
  const navigate = useNavigate();
  const { data: me } = useMe();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Already logged in (e.g. opened the login page from a bookmark).
  if (me && !loginMutation.isPending) return <Navigate to={next} replace />;

  const onSubmit = (data: LoginForm) =>
    loginMutation.mutate(data, { onSuccess: () => navigate(next, { replace: true }) });

  const error = loginMutation.error;
  const formError = !error
    ? undefined
    : error instanceof ApiError && error.status === 401
      ? "Incorrect email or password."
      : "Something went wrong. Please try again later.";

  return (
    <section className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold text-amber-800">Admin login</h1>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="username" className={inputClass} {...register("email")} />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register("password")}
          />
        </FormField>

        {formError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-full bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {loginMutation.isPending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </section>
  );
}
