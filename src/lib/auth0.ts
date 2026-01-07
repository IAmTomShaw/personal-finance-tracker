import { Auth0Client } from "@auth0/nextjs-auth0/server";

const isConfigured = !!(
  (process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL) &&
  process.env.AUTH0_DOMAIN &&
  process.env.AUTH0_CLIENT_ID &&
  process.env.AUTH0_SECRET
);

export const auth0: Auth0Client | null = isConfigured
  ? new Auth0Client({
    appBaseUrl: process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL,
  })
  : null;

export const isAuth0Configured = isConfigured;