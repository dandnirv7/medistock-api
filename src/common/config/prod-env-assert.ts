/**
 * Startup-time guards for production deployments.
 *
 * AGENTS.md env section mandates a >= 32 char random JWT_SECRET in
 * production. Bypass in development and test so local hacking and the
 * e2e suite aren't blocked.
 *
 * Exported separately from main.ts so the assertion can be unit-tested
 * without spinning up the whole NestJS bootstrap.
 */
export const MIN_JWT_SECRET_LENGTH = 32;

export function assertProductionJwtSecret(env = process.env): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production ` +
        '(AGENTS.md env section). Generate with: openssl rand -base64 32',
    );
  }
}
