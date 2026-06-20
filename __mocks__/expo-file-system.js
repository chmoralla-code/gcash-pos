const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  _files: {},
  _dirs: new Set(),

  getInfoAsync: async (path) => {
    const exists = mockFileSystem._dirs.has(path) || path in mockFileSystem._files;
    return {
      exists,
      modificationTime: exists ? 1700000000 : undefined,
      size: exists ? 100 : 0,
    };
  },

  makeDirectoryAsync: async (path, opts) => {
    mockFileSystem._dirs.add(path);
  },

  readDirectoryAsync: async (path) => {
    return Object.keys(mockFileSystem._files)
      .filter(f => f.startsWith(path))
      .map(f => f.replace(path, '').replace(/^\//, ''));
  },

  writeAsStringAsync: async (path, content, opts) => {
    mockFileSystem._files[path] = content;
  },

  readAsStringAsync: async (path) => {
    if (path in mockFileSystem._files) return mockFileSystem._files[path];
    throw new Error('File not found: ' + path);
  },

  EncodingType: { UTF8: 'utf8' },
};

module.exports = mockFileSystem;
