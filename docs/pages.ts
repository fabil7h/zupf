import { examplePages, type Page } from './examples';
import { Api } from './pages/Api';
import { GettingStarted } from './pages/GettingStarted';

export const pages: Page[] = [
  { slug: 'getting-started', title: 'Getting Started', group: 'Basics', Component: GettingStarted },
  { slug: 'api', title: 'API', group: 'Basics', Component: Api },
  ...examplePages,
];
