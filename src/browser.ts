const hasWindow = () => typeof window !== 'undefined' && typeof navigator !== 'undefined';

function testPlatform(re: RegExp): boolean {
  return hasWindow() ? re.test(navigator.platform) : false;
}

export const isMac = (): boolean => testPlatform(/^Mac/);
export const isIPhone = (): boolean => testPlatform(/^iPhone/);
// iPadOS 13+ reports itself as a Mac; distinguish via touch support.
export const isIPad = (): boolean => testPlatform(/^iPad/) || (isMac() && navigator.maxTouchPoints > 1);
export const isIOS = (): boolean => isIPhone() || isIPad();
export const isSafari = (): boolean => hasWindow() && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isMobileFirefox = (): boolean =>
  hasWindow() &&
  ((/Firefox/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent)) || /FxiOS/.test(navigator.userAgent));
