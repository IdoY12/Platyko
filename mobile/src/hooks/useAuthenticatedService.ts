import { useMemo } from "react";
import type AuthAware from "@/services/auth-aware/AuthAware";

/** One memoised domain service instance per component; the Bearer token is read from the store per request. */
export function useAuthenticatedService<T extends AuthAware>(Service: new () => T): T {
  return useMemo(() => new Service(), [Service]);
}
