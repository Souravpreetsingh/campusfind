#!/usr/bin/env node
/**
 * Validate CampusFind environment configuration.
 *
 * Loads .env manually (no dotenv dependency), validates required values and
 * refuses placeholders. Never prints values — only variable names.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

/** Minimal .env parser: KEY=VALUE lines, optional quotes, # comments. */
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const result = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// Real environment variables take precedence over .env file values.
const fileValues = loadEnvFile(envPath);
const env = { ...fileValues, ...process.env };

const problems = [];
const requireValue = (name) => {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push(`${name}: missing or empty`);
    return '';
  }
  return value;
};

const isPlaceholder = (value) =>
  /(change-this-password|replace-with|local-development-secret-change-me|example|changeme|your[-_])/i.test(
    value,
  );

// Always required.
const databaseUrl = requireValue('DATABASE_URL');
const sessionSecret = requireValue('SESSION_SECRET');

if (sessionSecret && sessionSecret.length < 32) {
  problems.push('SESSION_SECRET: must be at least 32 characters');
}
if (sessionSecret && isPlaceholder(sessionSecret)) {
  problems.push('SESSION_SECRET: contains a known placeholder value');
}
if (databaseUrl && isPlaceholder(databaseUrl)) {
  problems.push('DATABASE_URL: contains a known placeholder value');
}

const nodeEnv = env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const seedEmail = env.SEED_ADMIN_EMAIL;
const seedPassword = env.SEED_ADMIN_PASSWORD;
if (isProduction) {
  if (typeof seedEmail !== 'string' || seedEmail.trim() === '') {
    problems.push('SEED_ADMIN_EMAIL: required in production');
  }
  if (typeof seedPassword !== 'string' || seedPassword.trim() === '') {
    problems.push('SEED_ADMIN_PASSWORD: required in production');
  } else {
    if (isPlaceholder(seedPassword)) {
      problems.push('SEED_ADMIN_PASSWORD: contains a known placeholder or default value');
    }
    const knownDefaults = /^(?:admin123|password|password123|letmein|secret|12345678!?)$/i;
    if (knownDefaults.test(seedPassword)) {
      problems.push('SEED_ADMIN_PASSWORD: default or weak password is not allowed in production');
    }
    if (seedPassword.length < 16) {
      problems.push('SEED_ADMIN_PASSWORD: must be at least 16 characters in production');
    }
  }
}

if (problems.length > 0) {
  console.error('Environment validation failed (no values are shown):');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `Environment OK (${isProduction ? 'production' : 'non-production'}). Required checks passed; no values shown.`,
);
