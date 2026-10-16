import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApiConfig } from '../src/shared/config/env.js';

test('local requests use the Vite proxy', () => {
  const env = buildApiConfig({});
  assert.equal(env.apiBaseUrl, '/api');
  assert.equal(env.wsUrl, '/ws');
});
test('deployed backend drives API and WebSocket addresses', () => {
  const env = buildApiConfig({ VITE_API_BASE_URL: 'https://api.example.com' });
  assert.equal(env.apiBaseUrl, 'https://api.example.com/api');
  assert.equal(env.wsUrl, 'https://api.example.com/ws');
});
test('trailing slash does not duplicate api', () => {
  assert.equal(buildApiConfig({ VITE_API_BASE_URL: 'https://api.example.com/api/' }).apiBaseUrl, 'https://api.example.com/api');
  assert.equal(buildApiConfig({ VITE_API_BASE_URL: '/api/' }).apiBaseUrl, '/api');
});
test('new API setting takes precedence over legacy setting', () => {
  assert.equal(buildApiConfig({ VITE_API_BASE_URL: 'https://new.example.com', VITE_API_URL: 'https://old.example.com' }).apiBaseUrl, 'https://new.example.com/api');
});
test('legacy setting is still supported', () => {
  assert.equal(buildApiConfig({ VITE_API_URL: 'http://localhost:8080/api' }).apiBaseUrl, 'http://localhost:8080/api');
});
