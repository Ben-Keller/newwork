import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  readStorageJson,
  readStorageStringArray,
  readStorageValue,
  removeStorageValue,
  writeStorageJson,
  writeStorageValue,
} from '../../src/lib/browser-storage';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('browser storage', () => {
  it('isolates hosted version storage from V1 and the local preview', async () => {
    vi.stubEnv('BASE_URL', '/newwork/v2/');
    vi.resetModules();
    const storage = memoryStorage();
    storage.setItem('route', 'legacy');
    storage.setItem('/newwork/v1:route', 'v1');
    vi.stubGlobal('window', {localStorage: storage, sessionStorage: storage});
    const scoped = await import('../../src/lib/browser-storage');
    expect(scoped.readStorageValue('session', 'route')).toBeNull();
    expect(scoped.writeStorageValue('session', 'route', 'v2')).toBe(true);
    expect(storage.getItem('/newwork/v2:route')).toBe('v2');
    expect(scoped.removeStorageValue('session', 'route')).toBe(true);
    expect(storage.getItem('route')).toBe('legacy');
    expect(storage.getItem('/newwork/v1:route')).toBe('v1');
  });

  it('reads, writes, and removes values from the requested storage area', () => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    vi.stubGlobal('window', {localStorage, sessionStorage});

    expect(writeStorageValue('session', 'route', 'work')).toBe(true);
    expect(readStorageValue('session', 'route')).toBe('work');
    expect(readStorageValue('local', 'route')).toBeNull();
    expect(removeStorageValue('session', 'route')).toBe(true);
    expect(readStorageValue('session', 'route')).toBeNull();
  });

  it('keeps JSON parsing and string-array validation at the storage boundary', () => {
    const localStorage = memoryStorage();
    vi.stubGlobal('window', {localStorage, sessionStorage: memoryStorage()});

    expect(writeStorageJson('local', 'preferences', {theme: 'dark'})).toBe(true);
    expect(readStorageJson('local', 'preferences')).toEqual({theme: 'dark'});

    localStorage.setItem('order', JSON.stringify(['one', 2, 'three', null]));
    expect(readStorageStringArray('local', 'order')).toEqual(['one', 'three']);

    localStorage.setItem('invalid', '{');
    expect(readStorageJson('local', 'invalid')).toBeUndefined();
  });

  it('fails safely when storage access or serialization is blocked', () => {
    const blockedWindow = {} as Window;
    Object.defineProperty(blockedWindow, 'localStorage', {
      get: () => {
        throw new Error('blocked');
      },
    });
    Object.defineProperty(blockedWindow, 'sessionStorage', {
      get: () => {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal('window', blockedWindow);

    expect(readStorageValue('local', 'key')).toBeNull();
    expect(writeStorageValue('session', 'key', 'value')).toBe(false);
    expect(removeStorageValue('local', 'key')).toBe(false);
    const circular: {self?: unknown} = {};
    circular.self = circular;
    expect(writeStorageJson('session', 'key', circular)).toBe(false);
  });
});
