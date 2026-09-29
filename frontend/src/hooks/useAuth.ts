import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchMe, login, logout } from "../api/auth";

const ME = ["me"];

export function useMe() {
  return useQuery({ queryKey: ME, queryFn: fetchMe, staleTime: 60_000 });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    // Re-fetch "me" so guarded pages see the new session right away.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop everything cached while logged in (admin data must not linger).
      queryClient.clear();
      queryClient.setQueryData(ME, null);
    },
  });
}
