import { type Middleware } from '@reduxjs/toolkit';
import { createStore, Store } from '../app';
import * as user from '../user';
import * as accessTokenStoreModule from '../voice/accessToken';
import * as registrationStoreModule from '../voice/registration';
import * as loginAndRegisterModule from '../loginAndRegister';
import * as auth0 from '../../../__mocks__/react-native-auth0';
import * as voiceSdk from '../../../__mocks__/@twilio/voice-react-native-sdk';
import * as fetchUtil from '../../util/fetch';

let fetchMock: jest.Mock;

jest.mock('../../../src/util/fetch', () => ({
  fetch: (fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('registration', () => {
  let store: Store;
  const dispatchedActions: any[] = [];

  beforeEach(() => {
    dispatchedActions.splice(0);
    const logAction: Middleware = () => (next) => (action) => {
      dispatchedActions.push(action);
      next(action);
    };
    store = createStore(logAction);
    jest.clearAllMocks();
  });

  const matchDispatchedActions = (actions: any[], actionCreators: any[]) => {
    if (actions.length !== actionCreators.length) {
      throw new Error('different lengths of actions and actionCreators');
    }

    for (let idx = 0; idx < actions.length; idx++) {
      const action = actions[idx];
      const creator = actionCreators[idx];

      if (!creator.match(action)) {
        throw new Error('action does not match creator');
      }
    }
  };

  describe('loginAndRegister', () => {
    it('resolves when all sub-actions resolve', async () => {
      const loginAndRegisterResult = await store.dispatch(
        loginAndRegisterModule.loginAndRegister(),
      );
      expect(loginAndRegisterResult.type).toEqual('loginAndRegister/fulfilled');
      expect(loginAndRegisterResult.payload).toEqual(undefined);

      matchDispatchedActions(dispatchedActions, [
        loginAndRegisterModule.loginAndRegister.pending,
        user.login.pending,
        user.login.fulfilled,
        accessTokenStoreModule.getAccessToken.pending,
        accessTokenStoreModule.getAccessToken.fulfilled,
        registrationStoreModule.register.pending,
        registrationStoreModule.register.fulfilled,
        loginAndRegisterModule.loginAndRegister.fulfilled,
      ]);
    });

    describe('handles rejection', () => {
      it('login', async () => {
        jest.spyOn(auth0, 'authorize').mockRejectedValueOnce(undefined);

        const loginAndRegisterResult = await store.dispatch(
          loginAndRegisterModule.loginAndRegister(),
        );
        expect(loginAndRegisterResult.type).toEqual(
          'loginAndRegister/rejected',
        );
        expect(loginAndRegisterResult.payload).toEqual({
          reason: 'LOGIN_REJECTED',
        });

        matchDispatchedActions(dispatchedActions, [
          loginAndRegisterModule.loginAndRegister.pending,
          user.login.pending,
          user.login.rejected,
          loginAndRegisterModule.loginAndRegister.rejected,
        ]);
      });

      it('getAccessToken', async () => {
        fetchMock.mockRejectedValueOnce(undefined);

        const loginAndRegisterResult = await store.dispatch(
          loginAndRegisterModule.loginAndRegister(),
        );
        expect(loginAndRegisterResult.type).toEqual(
          'loginAndRegister/rejected',
        );
        expect(loginAndRegisterResult.payload).toEqual({
          reason: 'GET_ACCESS_TOKEN_REJECTED',
        });

        matchDispatchedActions(dispatchedActions, [
          loginAndRegisterModule.loginAndRegister.pending,
          user.login.pending,
          user.login.fulfilled,
          accessTokenStoreModule.getAccessToken.pending,
          accessTokenStoreModule.getAccessToken.rejected,
          user.logout.pending,
          user.logout.fulfilled,
          loginAndRegisterModule.loginAndRegister.rejected,
        ]);
      });

      it('register', async () => {
        console.log('running test');
        voiceSdk.voiceRegister.mockRejectedValueOnce(undefined);

        const loginAndRegisterResult = await store.dispatch(
          loginAndRegisterModule.loginAndRegister(),
        );
        expect(loginAndRegisterResult.type).toEqual(
          'loginAndRegister/rejected',
        );
        expect(loginAndRegisterResult.payload).toEqual({
          reason: 'REGISTER_REJECTED',
        });

        matchDispatchedActions(dispatchedActions, [
          loginAndRegisterModule.loginAndRegister.pending,
          user.login.pending,
          user.login.fulfilled,
          accessTokenStoreModule.getAccessToken.pending,
          accessTokenStoreModule.getAccessToken.fulfilled,
          registrationStoreModule.register.pending,
          registrationStoreModule.register.rejected,
          loginAndRegisterModule.loginAndRegister.rejected,
        ]);
      });

      it('handles "ACCESS_TOKEN_NOT_FULFILLED"', async () => {
        const register = await store.dispatch(
          registrationStoreModule.register(),
        );
        expect(register.payload).toEqual({
          reason: 'ACCESS_TOKEN_NOT_FULFILLED',
        });
      });

      it('handles "NO_ACCESS_TOKEN"', async () => {
        jest.spyOn(fetchUtil, 'fetch').mockImplementation(
          jest.fn().mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue(''),
          }),
        );
        await store.dispatch(loginAndRegisterModule.loginAndRegister());
        const register = await store.dispatch(
          registrationStoreModule.register(),
        );
        expect(register.payload).toEqual({
          reason: 'NO_ACCESS_TOKEN',
        });
      });
    });
  });
});
