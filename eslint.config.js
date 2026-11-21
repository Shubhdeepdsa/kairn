import tseslint from "typescript-eslint";
import tsdoc from "eslint-plugin-tsdoc";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
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
    files: ["src/frontend/**/*.{ts,tsx}"],
    ignores: [
      "src/frontend/components/ui/Button.tsx",
      "src/frontend/components/ui/TextInput.tsx",
      "src/frontend/components/ui/Select.tsx",
      "src/frontend/components/ui/Switch.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Use the shared Button or IconButton primitive.",
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: "Use the adopted TextInput or Switch primitive.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Use the adopted Select primitive.",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message:
            "Multi-line text input must use an adopted design-system primitive.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() in browser code.",
        },
      ],
    },
  },
  {
    files: ["src/frontend/components/ui/Button.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(input|select|textarea)$/]",
          message: "Use adopted shared controls.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() in browser code.",
        },
      ],
    },
  },
  {
    files: ["src/frontend/components/ui/TextInput.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(button|select|textarea)$/]",
          message: "Use adopted shared controls.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() in browser code.",
        },
      ],
    },
  },
  {
    files: ["src/frontend/components/ui/Select.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(button|input|textarea)$/]",
          message: "Use adopted shared controls.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() in browser code.",
        },
      ],
    },
  },
  {
    files: ["src/frontend/components/ui/Switch.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^(button|select|textarea)$/]",
          message: "Use adopted shared controls.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Use shared CSS tokens; inline styles are blocked by CSP.",
        },
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() in browser code.",
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
                "**/server/**",
                "**/cli/**",
                "**/viewer/**",
              ],
              message:
                "Core cannot import React, frontend, server, CLI, or viewer modules.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() from reusable core code.",
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.ts"],
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
                "**/cli/**",
                "**/viewer/**",
              ],
              message:
                "Server cannot import React, frontend, CLI, or viewer modules.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() from server modules.",
        },
      ],
    },
  },
  {
    files: ["src/viewer/**/*.ts"],
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
                "**/cli/**",
              ],
              message: "Viewer cannot import React, frontend, or CLI modules.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message: "Never call process.exit() from viewer modules.",
        },
      ],
    },
  },
  {
    files: ["src/cli/**/*.ts"],
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
              message: "CLI cannot import React or frontend components.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='process'][callee.property.name='exit']",
          message:
            "Never call process.exit() in CLI commands; set process.exitCode.",
        },
      ],
    },
  },
);
