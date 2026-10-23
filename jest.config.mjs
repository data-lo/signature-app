import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  // `e2e/` es de Playwright, no de jest (ver e2e/README.md). La convención de nombrarlas
  // `*.e2e.ts` ya las deja fuera del testMatch por defecto, pero basta con que alguien copie una
  // prueba como `*.spec.ts` ahí para que `npm test` la intente correr con el runner equivocado y
  // falle con un críptico "Class extends value undefined" — ya pasó una vez. Ignorar la carpeta
  // entera cierra esa puerta sin depender de recordar la convención.
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default createJestConfig(customJestConfig);
