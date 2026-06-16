import {
  MIN_JWT_SECRET_LENGTH,
  assertProductionJwtSecret,
} from './prod-env-assert';

const SHORT = 'a'.repeat(MIN_JWT_SECRET_LENGTH - 1);
const EXACT = 'a'.repeat(MIN_JWT_SECRET_LENGTH);
const LONG = 'a'.repeat(MIN_JWT_SECRET_LENGTH + 16);

describe('assertProductionJwtSecret', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('non-production envs', () => {
    it('does not throw in development even with a 1-char secret', () => {
      expect(() =>
        assertProductionJwtSecret({
          NODE_ENV: 'development',
          JWT_SECRET: 'x',
        }),
      ).not.toThrow();
    });

    it('does not throw in test even with an empty secret', () => {
      expect(() =>
        assertProductionJwtSecret({
          NODE_ENV: 'test',
          JWT_SECRET: '',
        }),
      ).not.toThrow();
    });

    it('does not throw when NODE_ENV is undefined', () => {
      expect(() =>
        assertProductionJwtSecret({ JWT_SECRET: 'x' }),
      ).not.toThrow();
    });
  });

  describe('production env', () => {
    it('throws when JWT_SECRET is missing', () => {
      expect(() =>
        assertProductionJwtSecret({ NODE_ENV: 'production' }),
      ).toThrow(/JWT_SECRET must be at least 32 characters/);
    });

    it('throws when JWT_SECRET is empty', () => {
      expect(() =>
        assertProductionJwtSecret({
          NODE_ENV: 'production',
          JWT_SECRET: '',
        }),
      ).toThrow(/JWT_SECRET must be at least 32 characters/);
    });

    it(`throws when JWT_SECRET is below ${MIN_JWT_SECRET_LENGTH} chars`, () => {
      expect(() =>
        assertProductionJwtSecret({
          NODE_ENV: 'production',
          JWT_SECRET: SHORT,
        }),
      ).toThrow(/JWT_SECRET must be at least 32 characters/);
    });

    it('passes when JWT_SECRET is exactly 32 chars', () => {
      expect(() =>
        assertProductionJwtSecret({
          NODE_ENV: 'production',
          JWT_SECRET: EXACT,
        }),
      ).not.toThrow();
    });

    it('passes when JWT_SECRET is well above 32 chars', () => {
      expect(() =>
        assertProductionJwtSecret({
          NODE_ENV: 'production',
          JWT_SECRET: LONG,
        }),
      ).not.toThrow();
    });
  });
});
