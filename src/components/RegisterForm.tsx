import React from 'react';
import { AuthContainer } from './AuthContainer';
import { GoogleAuthButton } from './GoogleAuthButton';

interface RegisterFormProps {
  errorMessage?: string;
  registrationAllowed: boolean;
  registrationReason?: string;
}

export function RegisterForm({ errorMessage, registrationAllowed, registrationReason }: RegisterFormProps) {
  const displayError = errorMessage || (!registrationAllowed ? (registrationReason || 'Registration not allowed.') : '');

  return (
    <AuthContainer title="Register" errorMessage={displayError}>
      {registrationAllowed ? (
        <>
          <GoogleAuthButton mode="register" />

          <div className="text-center mt-6 pt-6 border-t border-border">
            <a 
              href="/login" 
              className="text-primary hover:text-primary/90 text-sm font-medium hover:underline transition-colors"
            >
              Already have an account? Sign in
            </a>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Registration requires a valid invitation.
          </p>
          <a 
            href="/login" 
            className="text-primary hover:text-primary/90 text-sm font-medium hover:underline transition-colors"
          >
            Back to Sign In
          </a>
        </div>
      )}
    </AuthContainer>
  );
}
