import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "qa/**",
      "reference/**",
      "source-art/**",
      "OPEN-THIS-GAME.html",
    ],
  },
  js.configs.recommended,
  {
    files: ["app.js", "src/**/*.js", "public/website/**/*.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: [
      "scripts/**/*.mjs",
      "tests/**/*.js",
      "*.config.js",
      "copy-assets.mjs",
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
      "no-eval": "error",
      "no-new-func": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
