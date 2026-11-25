import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'frontend/**',
      'extracted/**',
      'coverage/**',
      'src/content/pages.ts',
    ],
  },
];

export default config;
