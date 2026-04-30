export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthExchangeResponse = AuthTokens & {
  user: User;
};

export type ApiErrorResponse = {
  code: number;
  message: string;
};
