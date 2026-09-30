import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCat,
  deleteCat,
  deleteMedia,
  makeMediaPrimary,
  uploadMedia,
  fetchApplications,
  setApplicationStatus,
  updateCat,
  type ApplicationFilters,
  type ApplicationStatus,
  type CatInput,
  type MediaKind,
} from "../api/admin";

export function useApplications(filters: ApplicationFilters) {
  return useQuery({
    queryKey: ["applications", filters],
    queryFn: () => fetchApplications(filters),
    placeholderData: keepPreviousData,
  });
}

/** After admin writes, cached lists/details (public ones too) are out of date. */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ["cats", "cat", "applications"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export function useSetApplicationStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      setApplicationStatus(id, status),
    // Approving changes other applications and the cat, so refetch everything.
    onSuccess: invalidate,
  });
}

export function useSaveCat(id?: number) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: Partial<CatInput>) =>
      id === undefined ? createCat(data as CatInput) : updateCat(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteCat() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: deleteCat, onSuccess: invalidate });
}

/** Upload / make primary / delete for one cat's photos or sounds. */
export function useMediaActions(kind: MediaKind, catId: number) {
  const invalidate = useInvalidateAll();
  return {
    upload: useMutation({ mutationFn: (file: File) => uploadMedia(kind, catId, file), onSuccess: invalidate }),
    makePrimary: useMutation({ mutationFn: (id: number) => makeMediaPrimary(kind, id), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number) => deleteMedia(kind, id), onSuccess: invalidate }),
  };
}
