import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(js|ts)'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/html-vite',
  core: { disableTelemetry: true },
};

export default config;
