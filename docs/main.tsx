import hydrate from 'preact-iso/hydrate';
import { App } from './app';
import { hydrated } from './theme';

if (import.meta.env.DEV) await import('preact/debug');

// Hydrates the prerendered HTML (and just renders in `vp dev`, where there is none).
hydrate(<App />, document.getElementById('app')!);
hydrated.value = true;
