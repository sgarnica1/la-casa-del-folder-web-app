export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafariDesktop = /^((?!chrome|android).)*safari/.test(userAgent);

  return isIOS || isSafariDesktop;
}