export const selectors = {
  auth: {
    googleButton: '[data-testid="login-button"]',
    wechatButton: 'button:has-text("微信")',
  },
  nav: {
    header: '[data-testid="app-header"]',
    mobileNav: '[data-testid="mobile-nav"]',
    homeLink: '[data-testid="nav-home"]',
    alarmsLink: '[data-testid="nav-alarms"]',
    settingsLink: '[data-testid="nav-settings"]',
    logoutButton: '[data-testid="logout-button"]',
  },
  home: {
    title: '[data-testid="home-title"]',
  },
  alarms: {
    page: '[data-testid="alarms-page"]',
    title: '[data-testid="alarms-title"]',
    listItem: '[data-testid="alarm-list-item"]',
    detailPage: '[data-testid="alarm-detail-page"]',
    editButton: '[data-testid="alarm-edit-button"]',
    deleteButton: '[data-testid="alarm-delete-button"]',
    toggle: '[data-testid="alarm-toggle"]',
    saveButton: '[data-testid="alarm-save-button"]',
    emptyState: '[data-testid="alarms-empty-state"]',
  },
  settings: {
    page: '[data-testid="settings-page"]',
    title: '[data-testid="settings-title"]',
  },
  chat: {
    composer: '[data-testid="chat-composer"]',
    sendButton: '[data-testid="chat-send"]',
    draftCard: '[data-testid="alarm-draft-card"]',
    confirmButton: '[data-testid="alarm-confirm-button"]',
    cancelButton: '[data-testid="alarm-cancel-button"]',
    assistantMessage: '[data-testid="chat-message-assistant"]',
    streamingIndicator: '[data-testid="chat-streaming-indicator"]',
    unsupportedExplanation: '[data-testid="chat-unsupported-explanation"]',
    connectionError: '[data-testid="chat-connection-error"]',
  },
} as const;
