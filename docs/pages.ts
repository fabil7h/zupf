import { examplePages, type Page } from './examples';
import { DrawerExamples } from './pages/Drawer';
import { GettingStarted } from './pages/GettingStarted';
import { PullToRefreshPage, pullToRefreshToc } from './pages/PullToRefresh';

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
  {
    slug: 'pull-to-refresh',
    title: 'Pull to Refresh',
    group: 'Usage',
    Component: PullToRefreshPage,
    toc: pullToRefreshToc,
  },
];
