import eslint from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            ".svelte-kit/**",
            ".vercel/**",
            ".wrangler/**",
            "build/**",
            "node_modules/**",
            "public/workbox-*.js"
        ]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...svelte.configs["flat/recommended"],
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser
            }
        }
    },
    {
        files: ["**/*.{js,ts,svelte}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            "no-console": "warn"
        }
    }
);
