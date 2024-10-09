import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: { globals: globals.browser },
    rules: {
      "semi": ["error", "always"], // Enforce semicolons
      "quotes": ["error", "double"], // Enforce double quotes
      "no-console": "warn", // Warn on console.log()
    },
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.recommended,
  }
];