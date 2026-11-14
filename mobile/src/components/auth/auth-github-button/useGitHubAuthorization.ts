import { useEffect, useState } from "react";
import { makeRedirectUri, ResponseType, useAuthRequest } from "expo-auth-session";
import { GITHUB_SCOPES, type GitHubAuthRequest } from "@project/api-contract";
import authService from "@/services/auth";

const DISCOVERY = { authorizationEndpoint: "https://github.com/login/oauth/authorize", tokenEndpoint: "https://github.com/login/oauth/access_token" };
/** Registered as the OAuth app's callback (see backend/.env.example). */
const REDIRECT_URI = makeRedirectUri({ scheme: "com.idoyahav.platyko", path: "oauth/github" });

/**
 * GitHub's authorization step (PRD 14.3), shared by sign-in and linking: PKCE in the app, the
 * code handed to the server, which alone holds the client secret. Unavailable while the server
 * has GitHub sign-in off (H7).
 */
export function useGitHubAuthorization(): { available: boolean; authorize: () => Promise<GitHubAuthRequest | null> } {
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => {
    void authService.githubClientId().then(setClientId);
  }, []);
  const [request, , promptAsync] = useAuthRequest({ clientId: clientId ?? "", scopes: [...GITHUB_SCOPES], redirectUri: REDIRECT_URI, usePKCE: true, responseType: ResponseType.Code }, DISCOVERY);
  const authorize = async (): Promise<GitHubAuthRequest | null> => {
    if (!request?.codeVerifier || !clientId) return null;
    const result = await promptAsync();
    if (result.type !== "success" || typeof result.params.code !== "string") return null;
    return { code: result.params.code, codeVerifier: request.codeVerifier, redirectUri: REDIRECT_URI };
  };
  return { available: Boolean(clientId && request), authorize };
}
