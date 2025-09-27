// eslint.config.js
import { defineConfig } from "eslint/config";

import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default defineConfig([
  {
    extends: [eslintConfigPrettier],
    plugins: { prettier: eslintPluginPrettier },
    rules: {
      semi: "error",
      "prefer-const": "error",
    },
  },
]);
