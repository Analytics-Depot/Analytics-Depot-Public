import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),

  {
    rules: {
      // 🚫 Disallow using variables before they're defined
      "no-use-before-define": ["error", { functions: false, classes: true }],

      // 🚫 Force variables to be initialized when declared
      "init-declarations": ["error", "always"],

      // 🚫 Disallow use of undeclared variables
      "no-undef": "error",

      // ⚠️ Warn if variables are declared but never used
      "no-unused-vars": ["warn", { vars: "all", args: "after-used" }],

      // 🚫 Prevent assigning to const
      "no-const-assign": "error",

      // 🚫 Prevent function declarations inside loops
      "no-loop-func": "error",
      "import/no-unresolved": "error",
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;


