import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../public/js/data-backup.js', import.meta.url), 'utf8');
const storageKeys = [
  'cc-checklist',
  'cc-done',
  'cc-theme',
  'cc-tool:space-planner:v1',
  'cc-tool:cost-planner:v1',
  'cc-tool:measure-book:v1',
  'cc-tool:trousseau:v1'
];

function createHarness(initialValues = {}, failOnceOnKey) {
  const values = new Map(Object.entries(initialValues));
  let shouldFail = Boolean(failOnceOnKey);
  const localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (shouldFail && key === failOnceOnKey) {
        shouldFail = false;
        throw new Error('Storage quota exceeded');
      }
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
  const window = { localStorage };
  const document = {
    readyState: 'loading',
    addEventListener() {}
  };
  runInNewContext(source, { window, document });
  return { api: window.CantinhoDataBackup, values };
}

function makeBackup(storageOverrides = {}) {
  const storage = Object.fromEntries(storageKeys.map((key) => [key, null]));
  Object.assign(storage, storageOverrides);
  return {
    format: 'cantinho-certo-backup',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    storage
  };
}

test('exports a complete snapshot and validates it for restore', () => {
  const { api } = createHarness({ 'cc-theme': 'dark', 'cc-checklist': '{"planejar-orcamento":true}' });
  const exported = api.createBackup();

  assert.equal(exported.ok, true);
  assert.equal(Object.keys(exported.value.storage).length, storageKeys.length);
  assert.equal(exported.value.storage['cc-theme'], 'dark');
  assert.equal(api.parseBackup(JSON.stringify(exported.value)).ok, true);
});

test('rejects unsupported versions, unknown keys, and invalid stored data', () => {
  const { api } = createHarness();

  assert.equal(api.parseBackup(JSON.stringify({ ...makeBackup(), version: 2 })).ok, false);
  assert.equal(api.parseBackup(JSON.stringify(makeBackup({ 'cc-tool:unknown:v1': '{}' }))).ok, false);
  assert.equal(api.parseBackup(JSON.stringify(makeBackup({
    'cc-tool:cost-planner:v1': '{"categories":{"unknown":[]}}'
  }))).ok, false);
});

test('accepts data shaped like the four tools currently save', () => {
  const { api } = createHarness();
  const backup = makeBackup({
    'cc-tool:space-planner:v1': JSON.stringify({
      version: 2,
      activeRoomId: 'sala',
      plans: {
        sala: { room: null, items: [] },
        quarto: { room: { width: 300, depth: 300 }, items: [] },
        cozinha: { room: null, items: [] }
      }
    }),
    'cc-tool:cost-planner:v1': JSON.stringify({
      categories: { aluguel: [{ description: 'Aluguel', value: 1000 }] }
    }),
    'cc-tool:measure-book:v1': JSON.stringify({
      rooms: [{ name: 'Sala', width: 4, length: 5, height: 2.5, openings: [], notes: '' }]
    }),
    'cc-tool:trousseau:v1': JSON.stringify({
      items: [{ name: 'Cama', priority: 'essential', price: 500, bought: false }]
    })
  });

  assert.equal(api.parseBackup(JSON.stringify(backup)).ok, true);
});

test('restoring replaces all app data and clears keys absent from the backup', () => {
  const { api, values } = createHarness({
    'cc-theme': 'light',
    'cc-checklist': '{"planejar-orcamento":true}',
    'cc-tool:trousseau:v1': '{"items":[]}'
  });
  const result = api.restoreBackup(makeBackup({ 'cc-theme': 'dark' }));

  assert.equal(result.ok, true);
  assert.equal(values.get('cc-theme'), 'dark');
  assert.equal(values.has('cc-checklist'), false);
  assert.equal(values.has('cc-tool:trousseau:v1'), false);
});

test('rolls back existing data if a storage write fails', () => {
  const original = {
    'cc-theme': 'light',
    'cc-checklist': '{"planejar-orcamento":true}'
  };
  const { api, values } = createHarness(original, 'cc-theme');
  const result = api.restoreBackup(makeBackup({ 'cc-theme': 'dark' }));

  assert.equal(result.ok, false);
  assert.equal(values.get('cc-theme'), original['cc-theme']);
  assert.equal(values.get('cc-checklist'), original['cc-checklist']);
  assert.equal(values.has('cc-tool:measure-book:v1'), false);
});
