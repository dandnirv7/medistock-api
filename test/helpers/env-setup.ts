/**
 * Set NODE_ENV before any test module imports AppModule — AppModule reads
 * the env at boot to lift the throttler cap under e2e load.
 */
process.env.NODE_ENV = 'test';
