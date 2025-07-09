import React from 'react';
import { AuthContainer } from './AuthContainer';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
  return (
    <AuthContainer title="">
      <GoogleAuthButton mode="login" />
    </AuthContainer>
  );
}
