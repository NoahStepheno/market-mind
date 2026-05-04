import { Page } from "@playwright/test";

export async function waitForApi(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === "string") {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}

export async function waitForNavigation(page: Page, path: string) {
  return page.waitForURL(`**${path}`);
}
