import { Auth0Provider } from "@auth0/auth0-react";

/**
 * Wraps the app with Auth0's SPA SDK.
 *
 * WHY THE SDK INSTEAD OF HAND-ROLLING OAUTH:
 * Auth0's React SDK implements the Authorization Code Flow with PKCE for us
 * (the recommended flow for single-page apps). Writing this by hand means
 * correctly handling the redirect, state/nonce validation, token exchange,
 * and silent refresh — all security-sensitive code that's easy to get
 * subtly wrong. Using the maintained SDK here is the safer engineering
 * choice, not a shortcut.
 *
 * MFA and the signup whitelist (Part 2, Steps 2 & 3) are NOT configured in
 * this file — they're configured in the Auth0 Dashboard against your
 * tenant (Authentication > Database > disable signups; Security > MFA >
 * enable email factor). There is no client-side code for those; that's the
 * point of using Auth0 rather than building custom auth.
 */
export function Auth0ProviderWithConfig({ children }) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  );
}
