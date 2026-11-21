import type { Component } from 'svelte';
import { untrack } from 'svelte';
import { createPullToRefresh, type PullStatus, type PullToRefresh, type PullToRefreshOptions } from '@lzth/zupf';
import { blogData, inboxData, notificationsData, wait, type Blog as BlogState, type Mail, type Note } from './data';
import Blog from './views/Blog.svelte';
import Inbox from './views/Inbox.svelte';
import Notifications from './views/Notifications.svelte';

export interface ContentKind<S> {
  initial: () => S;
  refresh: (state: S) => S;
  View: Component<{ state: S }>;
}

export const inbox: ContentKind<Mail[]> = { ...inboxData, View: Inbox };
export const notifications: ContentKind<Note[]> = { ...notificationsData, View: Notifications };
export const blog: ContentKind<BlogState> = { ...blogData, View: Blog };

/** Content state plus a slow `load` that refreshes it, for `onRefresh`. Call during component init. */
export function useContent<S>(kind: ContentKind<S>, delay = 1200) {
  let state = $state.raw(kind.initial());
  return {
    get state() {
      return state;
    },
    load: async () => {
      await wait(delay);
      state = kind.refresh(state);
    },
  };
}

/**
 * Creates the instance on mount (with `mouse: true` so the demos work on desktop) and destroys it on teardown.
 * Every demo's indicator gets the pull progress as `--progress`, for custom indicators to follow.
 * Options are applied once; demos recreate the instance (`{#key}`) or call setOptions().
 */
export function usePullToRefresh(
  content: () => HTMLElement | undefined,
  options: Omit<PullToRefreshOptions, 'content'>,
) {
  let ptr = $state.raw<PullToRefresh | null>(null);
  let status = $state<PullStatus>('idle');
  $effect(() => {
    const element = content();
    if (!element) return undefined;
    // `let`: onPull can fire while the instance is still being created.
    let instance: PullToRefresh | undefined = undefined;
    instance = untrack(() =>
      createPullToRefresh({
        mouse: true,
        ...options,
        content: element,
        onPull: (offset, progress) => {
          instance?.indicator?.style.setProperty('--progress', String(progress));
          options.onPull?.(offset, progress);
        },
      }),
    );
    const created = instance;
    const unsubscribe = created.subscribe((s) => (status = s.status));
    ptr = created;
    return () => {
      unsubscribe();
      created.destroy();
      ptr = null;
    };
  });
  return {
    get ptr() {
      return ptr;
    },
    get status() {
      return status;
    },
  };
}
