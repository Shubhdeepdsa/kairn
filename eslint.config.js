import tseslint from "typescript-eslint";
import tsdoc from "eslint-plugin-tsdoc";
import reactHooks from "eslint-plugin-react-hooks";
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { tsdoc },
    rules: { "tsdoc/syntax": "error" },
  },
  {
    files: ["src/frontend/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                "fs",
                "path",
                "sqlite",
                "child_process",
                "**/server/**",
                "**/cli/**",
                "**/viewer/**",
              ],
              message:
                "Browser code imports only safe contracts, never Node adapters.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
      ],
    },
  },
  {
    files: ["src/frontend/**/*.{ts,tsx}"],
    ignores: ["src/frontend/components/ui/Button.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Use the shared Button primitive.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
      ],
    },
  },
  {
    files: ["src/frontend/**/*.{ts,tsx}"],
    ignores: ["src/frontend/icons/registry.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["lucide-react", "lucide-react/*"],
              message: "Use the semantic Icon registry.",
            },
            {
              group: [
                "node:*",
                "fs",
                "path",
                "sqlite",
                "child_process",
                "**/server/**",
                "**/cli/**",
                "**/viewer/**",
              ],
              message: "Browser imports must be safe contracts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
                "**/frontend/**",
              ],
              message: "Core cannot import React or frontend components.",
            },
          ],
        },
      ],
    },
  },
);
