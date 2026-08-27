import studio from '@sanity/eslint-config-studio'

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  URL: 'readonly',
}

export default [
  ...studio,
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {globals: nodeGlobals},
  },
]
