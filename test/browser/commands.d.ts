import 'vite-plus/test/browser';

declare module 'vite-plus/test/browser' {
  interface BrowserCommands {
    drag: (x: number, y: number, dx: number, dy: number, steps?: number, delay?: number) => Promise<void>;
  }
}
