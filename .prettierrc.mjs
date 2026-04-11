/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
    plugins: ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],

    // Settings
    tabWidth: 4,
    semi: true,
    singleQuote: false,
};

export default config;
