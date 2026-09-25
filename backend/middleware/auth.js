import { auth } from "express-oauth2-jwt-bearer";

/**
 * Verifies the Auth0-issued access token sent by the React frontend
 * (as `Authorization: Bearer <token>`) on every protected API call.
 *
 * This is the "Authorization" half of the requirement: even if someone
 * bypasses the frontend entirely and calls the API directly with curl,
 * they still can't get data without a valid token — the check lives on
 * the server, not just in the UI.
 *
 * DISABLE_AUTH=true is provided purely so you can build/test the weather
 * and caching logic before Auth0 is wired up. It must be false/unset
 * before you submit — leaving it on would defeat the whole point of Part 2.
 */
export function checkJwt() {
  if (process.env.DISABLE_AUTH === "true") {
    console.warn("[auth] DISABLE_AUTH=true — all requests are being allowed through unauthenticated. Do not submit like this.");
    return (req, res, next) => next();
  }

  return auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: "RS256",
  });
}
