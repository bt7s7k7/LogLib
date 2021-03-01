module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: [
        "eslint:recommended",
    ],
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint"
    ],
    parserOptions: {
        ecmaVersion: 2020
    },
    rules: {
        "no-console": "warn",
        "no-debugger": "warn",
        "semi": ["warn", "never"],
        "quotes": ["warn", "double", { "allowTemplateLiterals": true }],
    },
    ignorePatterns: [
        "/node_modules",
        "/build",
        "/dist",
        "/ucpem_ports",
    ]
}
