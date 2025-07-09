import React from 'react';
import { AuthContainer } from './AuthContainer';
import { GoogleAuthButton } from './GoogleAuthButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function LoginForm() {
  // Check for error parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  
  return (
    <AuthContainer title="">
      {error === 'not_invited' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account is not authorized to access this application. Please contact an administrator for an invitation.
          </AlertDescription>
        </Alert>
      )}
      <GoogleAuthButton mode="login" />
    </AuthContainer>
  );
}
