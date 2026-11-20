import { useEffect, useRef } from 'preact/hooks';
import { href } from '../router';
import { isDark, theme } from '../theme';
import { Drawer } from './Drawer';
import { Icon } from './Icon';

export function Landing() {
  const drawerTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = 'zupf';
  }, []);

  return (
    <div data-zupf-wrapper class="app">
      <main class="landing">
        <div class="landing-actions" aria-label="Page actions">
          <button
            class="icon-btn"
            aria-label="Toggle theme"
            onClick={() => (theme.value = isDark() ? 'light' : 'dark')}
          >
            <Icon name={isDark() ? 'sun' : 'moon'} />
          </button>
        </div>

        <div class="landing-hero">
          <h1>zupf</h1>
          <p class="landing-description">
            Tiny, accessible drawer and pull-to-refresh with native-feeling gestures and physics. No framework required.
          </p>
          <div class="landing-ctas">
            <button class="btn btn-primary landing-primary" ref={drawerTrigger}>
              Open drawer
            </button>
            <a class="btn landing-secondary" href={href('pull-to-refresh')}>
              Try pull-to-refresh
            </a>
          </div>
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
            <h2 data-zupf-title>A drawer for the web.</h2>
            <p data-zupf-description>
              Drag it down, swipe it, resize it, or focus it with the keyboard. zupf handles the difficult parts.
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
