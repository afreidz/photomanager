import React from 'react';
import { AuthContainer } from './AuthContainer';
import { GoogleAuthButton } from './GoogleAuthButton';

interface RegisterFormProps {
  errorMessage?: string;
  registrationAllowed: boolean;
  registrationReason?: string;
  invitation?: {
    id: string;
    email: string | null;
    token: string;
  };
  token?: string | null;
}

export function RegisterForm({ errorMessage, registrationAllowed, registrationReason, invitation, token }: RegisterFormProps) {
  const isFirstUser = registrationReason === 'First user registration';
  const isInvitedUser = invitation && invitation.email;
  
  // Create appropriate title and description based on context
  let title = 'Register';
  let description = '';
  
  if (isFirstUser) {
    title = 'Create Admin Account';
    description = 'Welcome! You are registering as the admin user for this PhotoManager instance.';
  } else if (isInvitedUser) {
    title = 'Complete Registration';
    description = `You have been invited to register for this PhotoManager instance with the email: ${invitation.email}`;
  } else if (registrationAllowed) {
    title = 'Complete Registration';
    description = 'You have been invited to register for this PhotoManager instance.';
  }

  const displayError = errorMessage || (!registrationAllowed ? (registrationReason || 'Registration not allowed.') : '');

  return (
    <AuthContainer title={title} errorMessage={displayError}>
      {registrationAllowed ? (
        <>
          {description && (
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </div>
          )}
          
          <GoogleAuthButton mode="register" />

          {!isFirstUser && (
            <div className="text-center mt-6 pt-6 border-t border-border">
              <a 
                href="/login" 
                className="text-primary hover:text-primary/90 text-sm font-medium hover:underline transition-colors"
              >
                Already have an account? Sign in
              </a>
            </div>
          )}
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
