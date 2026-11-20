// How you'd wrap zupf in Preact (or React, with minor changes): render the markup,
// create the sheet in a layout effect, destroy it on unmount.
import { createContext, createPortal, type ComponentChildren, type RefObject } from 'preact';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createSheet, type Sheet, type SheetOptions, type SheetState } from '../../src';

/** The sheet a component is rendered inside of; used to wire up nested sheets. */
export const SheetContext = createContext<Sheet | null>(null);

export interface DrawerProps {
  id: string;
  options?: Omit<SheetOptions, 'content' | 'overlay' | 'trigger' | 'parent'>;
  /** Element (ref) or selector that toggles the sheet. */
  trigger?: RefObject<HTMLElement | null> | string;
  /** Nest inside the sheet from context. */
  nested?: boolean;
  noHandle?: boolean;
  onReady?: (sheet: Sheet) => void;
  children?: ComponentChildren;
}

export function Drawer({ id, options, trigger, nested, noHandle, onReady, children }: DrawerProps) {
  const parent = useContext(SheetContext);
  const content = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const waitingForParent = nested && !parent;
  // Portals need `document.body`: render nothing on the server and on the first client render (hydration).
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!mounted || waitingForParent) return undefined;
    const s = createSheet({
      ...options,
      content: content.current!,
      overlay: overlay.current,
      trigger: typeof trigger === 'string' ? trigger : trigger?.current,
      parent: nested ? parent : null,
    });
    setSheet(s);
    onReady?.(s);
    return () => s.destroy();
    // Options are applied once; use sheet.setOptions() for runtime changes.
  }, [mounted, waitingForParent]);

  if (!mounted || waitingForParent) return null;

  return createPortal(
    <SheetContext.Provider value={sheet}>
      <div ref={overlay} id={`${id}-overlay`} />
      <div ref={content} id={`${id}-sheet`} hidden>
        {/* The handle sits on the edge facing the page: below the content for top sheets. */}
        {!noHandle && options?.direction !== 'top' && <div data-zupf-handle />}
        {children}
        {!noHandle && options?.direction === 'top' && <div data-zupf-handle />}
      </div>
    </SheetContext.Provider>,
    document.body,
  );
}

/** Subscribe to a sheet's state. */
export function useSheetState(sheet: Sheet | null): SheetState | undefined {
  const [state, setState] = useState(sheet?.getState());
  useEffect(() => {
    if (!sheet) return undefined;
    const unsubscribe = sheet.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, [sheet]);
  return state;
}
