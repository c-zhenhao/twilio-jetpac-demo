import axios, { type AxiosError } from 'axios';

export type AuthError = {
  cause?: Error;
  code?: string;
  message: string;
  name: string;
  status?: number;
};

export type UserInfo = {
  email: string;
  email_verified: string;
  name: string;
  nickname: string;
  picture: string;
  sub: string;
  updated_at: string;
};

export type UserInfoResponse =
  | {
      success: true;
      userInfo: UserInfo;
    }
  | {
      success: false;
      reason: 'AUTH_ERROR';
      error: AuthError;
    };

export async function getUserInfo(
  auth0Url: string,
  auth0Token: string,
): Promise<UserInfoResponse> {
  console.log('🔥 auth0Url', auth0Url);
  console.log('🔥 auth0Token', auth0Token);

  const userInfoUrl = `${auth0Url}/userinfo`;
  const headers = { Authorization: `Bearer ${auth0Token}` };
  const response = await axios
    .get(userInfoUrl, { headers })
    .then((value) => ({ success: true as const, value }))
    .catch((error) => ({ success: false as const, error }));
  console.log('🔥 response', response);
  
  if (!response.success) {
    const error: AxiosError = response.error;
    return {
      success: false,
      reason: 'AUTH_ERROR',
      error: {
        cause: error.cause,
        code: error.code,
        message: error.message,
        name: error.name,
        status: error.status,
      },
    };
  }

  return {
    success: true,
    userInfo: response.value.data,
  };
}

export const verifyEmail = (email: string, regex: RegExp): boolean =>
  regex.test(email);
