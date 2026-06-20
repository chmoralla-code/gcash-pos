const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-router needs .expo file extension to be resolvable by Metro
config.resolver.sourceExts.push('expo');

module.exports = config;
