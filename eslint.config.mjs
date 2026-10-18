import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Photography is rendered through short-lived signed URLs, which cannot be
      // safely proxied through the Next.js image optimizer.
      "@next/next/no-img-element": "off",
      // React Compiler lint rules are advisory while the compiler is not enabled.
      // This app intentionally mirrors URL-derived filter values into controlled
      // inputs and uses mount guards for theme/chart hydration, which the rule
      // reports even though the effects are deliberate and idempotent.
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
