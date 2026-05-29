export type AuthUser = {
  email: string;
  name: string;
  picture?: string | null;
};

export type GoogleAuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};
