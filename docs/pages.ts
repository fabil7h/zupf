import { examplePages, type Page } from './examples';
import { DrawerExamples } from './pages/Drawer';
import { GettingStarted } from './pages/GettingStarted';

const allExamples = examplePages.flatMap((section) => section.examples ?? []);

export const pages: Page[] = [
  { slug: 'getting-started', title: 'Getting Started', group: 'Usage', Component: GettingStarted },
  {
    slug: 'drawer',
    title: 'Drawer',
    group: 'Usage',
    Component: DrawerExamples,
    examples: allExamples,
  },
];
