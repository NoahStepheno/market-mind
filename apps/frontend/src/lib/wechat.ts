export function isWeChatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}
