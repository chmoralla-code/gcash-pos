const state = {
  _files: {},
  _dirs: new Set(),
};

const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',

  get _files() { return state._files; },
  set _files(v) { state._files = v; },
  get _dirs() { return state._dirs; },
  set _dirs(v) { state._dirs = v; },

  __reset() {
    state._files = {};
    state._dirs = new Set();
  },

  getInfoAsync: async (path) => {
    const exists = state._dirs.has(path) || path in state._files;
    return {
      exists,
      modificationTime: exists ? 1700000000 : undefined,
      size: exists ? 100 : 0,
    };
  },

  makeDirectoryAsync: async (path, opts) => {
    state._dirs.add(path);
  },

  readDirectoryAsync: async (path) => {
    return Object.keys(state._files)
      .filter(f => f.startsWith(path))
      .map(f => f.replace(path, '').replace(/^\//, ''));
  },

  writeAsStringAsync: async (path, content, opts) => {
    state._files[path] = content;
  },

  readAsStringAsync: async (path) => {
    if (path in state._files) return state._files[path];
    throw new Error('File not found: ' + path);
  },

  EncodingType: { UTF8: 'utf8' },
};

module.exports = mockFileSystem;
