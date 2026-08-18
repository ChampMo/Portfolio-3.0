import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Next 16 removed the `next lint` command; ESLint is driven by its own CLI
 * against this flat config. eslint-config-next 16 ships native flat configs,
 * so no FlatCompat shim is needed (and FlatCompat in fact crashes on
 * ESLint 9.39 with a circular-structure error).
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "scripts/**"],
  },
];

export default eslintConfig;
