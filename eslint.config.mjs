import tseslint from "typescript-eslint";
import pluginImport from "eslint-plugin-import";
import pluginSimpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-config-prettier";

export default [
  ...tseslint.config(
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          project: "./tsconfig.eslint.json",
          ecmaVersion: "latest",
          sourceType: "module",
        },
      },
      plugins: {
        "@typescript-eslint": tseslint.plugin,
        import: pluginImport,
        "simple-import-sort": pluginSimpleImportSort,
      },
      settings: {
        "import/resolver": {
          typescript: {
            project: "./tsconfig.eslint.json",
          },
        },
      },
      rules: {
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
      },
    },
    prettier,
  ),
  {
    ignores: ["dist", "node_modules", "coverage"],
  },
];
