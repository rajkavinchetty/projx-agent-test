import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titleCase, truncate } from '../src/strings.js';

test('titleCase capitalises each word', () => {
  assert.equal(titleCase('hello   wide WORLD'), 'Hello Wide World');
});

test('truncate leaves short text alone and shortens long text', () => {
  assert.equal(truncate('short', 10), 'short');
  assert.equal(truncate('a long sentence', 6), 'a lon…');
});
