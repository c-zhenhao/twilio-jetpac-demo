import {
  createSlice,
  miniSerializeError,
  type SerializedError,
} from '@reduxjs/toolkit';
import { match } from 'ts-pattern';
import { getAccessToken } from './accessToken';
import { type AsyncStoreSlice } from '../app';
import { createTypedAsyncThunk, generateThunkActionTypes } from '../common';
import { login, logout } from '../user';
import { settlePromise } from '../../util/settlePromise';
import { voice } from '../../util/voice';

export type RegisterRejectValue =
  | {
      reason: 'ACCESS_TOKEN_NOT_FULFILLED';
    }
  | {
      reason: 'NO_ACCESS_TOKEN';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };

export const register = createTypedAsyncThunk<
  void,
  void,
  {
    rejectValue: RegisterRejectValue;
  }
>('registration/register', async (_, { getState, rejectWithValue }) => {
  const { accessToken } = getState().voice;

  if (accessToken?.status !== 'fulfilled') {
    return rejectWithValue({ reason: 'ACCESS_TOKEN_NOT_FULFILLED' });
  }

  if (accessToken.value === '') {
    return rejectWithValue({ reason: 'NO_ACCESS_TOKEN' });
  }

  const voiceRegisterResult = await settlePromise(
    voice.register(accessToken.value),
  );
  console.log('🔥 voice register result: ', voiceRegisterResult);
  // {"reason": [Error: Failed to register: Error Domain=com.twilio.voice.error Code=31301 "Registration failed" UserInfo={NSLocalizedDescription=Registration failed, NSLocalizedFailureReason=NSURLErrorDomain(-1200) - An SSL error has occurred and a secure connection to the server cannot be made.}], "status": "rejected"}
  if (voiceRegisterResult.status === 'rejected') {
    return rejectWithValue({
      reason: 'NATIVE_MODULE_REJECTED',
      error: miniSerializeError(voiceRegisterResult.reason),
    });
  }
});

type UnregisterRejectValue =
  | {
      reason: 'ACCESS_TOKEN_NOT_FULFILLED';
    }
  | {
      reason: 'NO_ACCESS_TOKEN';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };
const unregisterActionTypes = generateThunkActionTypes(
  'registration/unregister',
);
export const unregister = createTypedAsyncThunk<
  void,
  void,
  { rejectValue: UnregisterRejectValue }
>(unregisterActionTypes.prefix, async (_, { getState, rejectWithValue }) => {
  const { accessToken } = getState().voice;

  if (accessToken?.status !== 'fulfilled') {
    return rejectWithValue({ reason: 'ACCESS_TOKEN_NOT_FULFILLED' });
  }

  if (accessToken.value === '') {
    return rejectWithValue({ reason: 'NO_ACCESS_TOKEN' });
  }

  const voiceUnregisterResult = await settlePromise(
    voice.unregister(accessToken.value),
  );
  if (voiceUnregisterResult.status === 'rejected') {
    return rejectWithValue({
      reason: 'NATIVE_MODULE_REJECTED',
      error: miniSerializeError(voiceUnregisterResult.reason),
    });
  }
});

export type LoginAndRegisterRejectValue =
  | {
      reason: 'LOGIN_REJECTED';
    }
  | {
      reason: 'GET_ACCESS_TOKEN_REJECTED';
    }
  | {
      reason: 'REGISTER_REJECTED';
    };

export const loginAndRegister = createTypedAsyncThunk<
  void,
  void,
  {
    rejectValue: LoginAndRegisterRejectValue;
  }
>('registration/loginAndRegister', async (_, { dispatch, rejectWithValue }) => {
  const loginActionResult = await dispatch(login());
  if (login.rejected.match(loginActionResult)) {
    return rejectWithValue({ reason: 'LOGIN_REJECTED' });
  }

  const getAccessTokenResult = await dispatch(getAccessToken());
  if (getAccessToken.rejected.match(getAccessTokenResult)) {
    await dispatch(logout());
    return rejectWithValue({
      reason: 'GET_ACCESS_TOKEN_REJECTED',
    });
  }

  const registerActionResult = await dispatch(register());
  if (register.rejected.match(registerActionResult)) {
    return rejectWithValue({ reason: 'REGISTER_REJECTED' });
  }
});

export type RegistrationSlice = AsyncStoreSlice<
  {},
  RegisterRejectValue | { error: SerializedError }
>;

export const registrationSlice = createSlice({
  name: 'registration',
  initialState: { status: 'idle' } as RegistrationSlice,
  reducers: {},
  extraReducers(builder) {
    /**
     * Register reducers.
     */
    builder.addCase(register.pending, () => ({ status: 'pending' }));

    builder.addCase(register.fulfilled, () => ({ status: 'fulfilled' }));

    builder.addCase(register.rejected, (_, action) => {
      const { requestStatus } = action.meta;

      return match(action.payload)
        .with({ reason: 'NATIVE_MODULE_REJECTED' }, ({ reason, error }) => ({
          status: requestStatus,
          reason,
          error,
        }))
        .with(
          { reason: 'ACCESS_TOKEN_NOT_FULFILLED' },
          { reason: 'NO_ACCESS_TOKEN' },
          ({ reason }) => ({
            status: requestStatus,
            reason,
          }),
        )
        .with(undefined, () => ({
          status: requestStatus,
          error: action.error,
        }))
        .exhaustive();
    });

    /**
     * Unregister reducers.
     */
    builder.addCase(unregister.pending, () => ({ status: 'pending' }));

    builder.addCase(unregister.fulfilled, () => ({ status: 'idle' }));

    builder.addCase(unregister.rejected, () => {
      // TODO(mhuynh): how should we handle unregistration failures?
    });
  },
});
