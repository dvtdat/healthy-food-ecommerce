// @ts-check

/**
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Type enforcement
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Changes that do not affect the meaning of the code
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvements
        'test', // Adding missing tests
        'chore', // Changes to the build process or auxiliary tools
        'ci', // Changes to CI configuration files and scripts
        'build', // Changes that affect the build system or external dependencies
        'revert', // Reverts a previous commit
      ],
    ],

    // Subject rules
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 100],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],

    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // Footer rules
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],

    // Header rules
    'header-max-length': [2, 'always', 100],
    'header-min-length': [2, 'always', 10],

    // Type rules
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Scope rules (optional but consistent when used)
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [0, 'never'], // Allow empty scope
  },

  // Custom parser options
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },

  // Ignore patterns
  ignores: [
    (commit) => commit.includes('WIP'),
    (commit) => commit.includes('[skip ci]'),
    (commit) => commit.includes('[ci skip]'),
  ],

  // Default ignore rules
  defaultIgnores: true,

  // Help URL
  helpUrl:
    'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};
