export const selectors = {
  auth: {
    googleButton: 'button:has-text("Google")',
    wechatButton: 'button:has-text("微信")',
  },
  nav: {
    header: '[data-testid="app-header"]',
    homeLink: '[data-testid="nav-home"]',
    alarmsLink: '[data-testid="nav-alarms"]',
    settingsLink: '[data-testid="nav-settings"]',
  },
  home: {
    title: '[data-testid="home-title"]',
  },
} as const;
