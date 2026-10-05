const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /node_modules\/.*\/android\/.*\/build\/.*/,
  /node_modules\/.*\/android\/.*\/bin\/.*/,
  /node_modules\/.*\/build\/classes\/.*/,
  /node_modules\/expo-modules-autolinking\/android\/.*/,
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
