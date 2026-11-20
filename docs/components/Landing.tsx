import { useEffect, useRef } from 'preact/hooks';
import { href } from '../router';
import { ThemeToggle } from './AnimatedIcons';
import { Drawer } from './Drawer';

const features = [
  {
    slug: 'drawer',
    anchor: 'snap',
    title: 'Drawer',
    text: 'Snap points, nested sheets, iOS-style scaled background, any edge.',
  },
  {
    slug: 'pull-to-refresh',
    anchor: 'blog',
    title: 'Pull to refresh',
    text: 'On any scroller, with an indicator you style in plain CSS.',
  },
  {
    slug: 'gestures',
    anchor: 'list',
    title: 'Gestures',
    text: 'Swipe actions, double tap, long press and your own sequences.',
  },
];

export function Landing() {
  const drawerTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = 'zupf';
  }, []);

  return (
    <div data-zupf-wrapper class="app">
      <main class="landing">
        <div class="landing-actions" aria-label="Page actions">
          <ThemeToggle />
        </div>

        <div class="landing-hero">
          <h1>zupf</h1>
          <p class="landing-description">
            Native-feeling bottom sheets, pull-to-refresh and gestures for the web. Any framework, zero dependencies,
            13&nbsp;KB.
          </p>
          <div class="landing-ctas">
            <button class="btn btn-primary landing-primary" ref={drawerTrigger}>
              Open drawer
            </button>
            <a class="btn landing-secondary" href={href('pull-to-refresh')}>
              Try pull-to-refresh
            </a>
          </div>
          <ul class="landing-features">
            {features.map((f) => (
              <li key={f.slug}>
                <a href={href(f.slug, f.anchor)}>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </a>
              </li>
            ))}
          </ul>
          <div class="landing-secondary-ctas">
            <a class="landing-docs" href={href('getting-started')}>
              Documentation
            </a>
            <a class="landing-github" href="https://github.com/fabil7h/zupf">
              Star on GitHub
            </a>
          </div>
        </div>

        <Drawer id="landing-demo" trigger={drawerTrigger}>
          <div class="sheet-body landing-sheet">
            <h2 data-zupf-title>Drag me down.</h2>
            <p data-zupf-description>
              Or flick me, press Esc, tap outside, or Tab through me. Physics, focus trap and iOS quirks are handled.
            </p>
            <a class="btn btn-primary landing-sheet-cta" href={href('getting-started')}>
              Make it yours
            </a>
            <button class="btn landing-sheet-close" data-zupf-close>
              Close
            </button>
          </div>
        </Drawer>
      </main>
    </div>
  );
}
