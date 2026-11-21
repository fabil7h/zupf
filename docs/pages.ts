import { lazy } from 'preact-iso';
import { examplePages, type Page } from './examples';

export const Landing = lazy(() => import('./components/Landing').then((module) => module.Landing));
const GettingStarted = lazy(() => import('./pages/GettingStarted').then((module) => module.GettingStarted));
const DrawerExamples = lazy(() => import('./pages/Drawer').then((module) => module.DrawerExamples));
const PullToRefreshPage = lazy(() => import('./pages/PullToRefresh').then((module) => module.PullToRefreshPage));
const GesturesPage = lazy(() => import('./pages/Gestures').then((module) => module.GesturesPage));

/** Source module behind each route's lazy chunk; prerender adds `<link rel="modulepreload">` for it. */
export const routeModules: Record<string, string> = {
  '/': 'components/Landing.tsx',
  '/getting-started/': 'pages/GettingStarted.tsx',
  '/drawer/': 'pages/Drawer.tsx',
  '/pull-to-refresh/': 'pages/PullToRefresh.tsx',
  '/gestures/': 'pages/Gestures.tsx',
};

export const pages: Page[] = [
  { slug: 'getting-started', title: 'Getting Started', group: 'Usage', Component: GettingStarted },
  {
    slug: 'drawer',
    title: 'Drawer',
    group: 'Usage',
    Component: DrawerExamples,
    toc: examplePages.flatMap((section) => section.examples ?? []).map(({ id, title }) => ({ id, title })),
  },
  {
    slug: 'pull-to-refresh',
    title: 'Pull to Refresh',
    group: 'Usage',
    Component: PullToRefreshPage,
    toc: [
      { id: 'basic', title: 'Basic' },
      { id: 'blog', title: 'Indicator styles' },
      { id: 'drawer', title: 'In a drawer' },
      { id: 'dashboard', title: 'Dashboard' },
      { id: 'widgets', title: 'Small containers' },
      { id: 'nested', title: 'Nested content' },
      { id: 'tuning', title: 'Threshold and feel' },
      { id: 'api', title: 'Controlling it' },
      { id: 'options', title: 'Options' },
    ],
  },
  {
    slug: 'gestures',
    title: 'Gestures',
    group: 'Usage',
    Component: GesturesPage,
    toc: [
      { id: 'taps', title: 'Taps and long press' },
      { id: 'list', title: 'Swipe actions in a list' },
      { id: 'custom', title: 'Custom flows' },
      { id: 'swipes', title: 'Swipes' },
      { id: 'patterns', title: 'Patterns' },
      { id: 'options', title: 'Options' },
    ],
  },
];
