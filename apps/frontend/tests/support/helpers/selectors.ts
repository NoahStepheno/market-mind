export const selectors = {
  auth: {
    emailInput: '[data-testid="auth-email-input"]',
    passwordInput: '[data-testid="auth-password-input"]',
    submitButton: '[data-testid="auth-submit-button"]',
    errorMessage: '[data-testid="auth-error-message"]',
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
