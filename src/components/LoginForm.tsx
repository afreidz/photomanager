import React from 'react';
import { AuthContainer } from './AuthContainer';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
  return (
    <AuthContainer title="">
      <GoogleAuthButton mode="login" />

      <div className="text-center mt-6 pt-6 border-t border-border">
        <a 
          href="/register" 
          className="text-primary hover:text-primary/90 text-sm font-medium hover:underline transition-colors"
        >
          Don't have an account? Register
        </a>
      </div>
    </AuthContainer>
  );
}
