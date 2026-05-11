export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'access_token';
export const OAUTH_STATE_COOKIE_NAME = process.env.OAUTH_STATE_COOKIE_NAME ?? 'github_oauth_state';

export const EXPIRED_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 0,
  expires: new Date(0),
} as const;
