import { useMemo } from "react";
import type AuthAware from "@/services/auth-aware/AuthAware";

/** Domain service bound to the current JWT, or null when logged out. */
export function useAuthenticatedService<T extends AuthAware>(Service: new () => T): T {
  return useMemo(() => new Service(), [Service]);
}
