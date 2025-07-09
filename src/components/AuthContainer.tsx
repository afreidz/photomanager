import React from 'react';
import { Camera } from 'lucide-react';

interface AuthContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  errorMessage?: string;
}

export function AuthContainer({ title, subtitle, children, errorMessage }: AuthContainerProps) {
  return (
    <div className="w-full max-w-md bg-card border border-border rounded-lg p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-lg mb-4">
          <Camera size={24} />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Photography CMS</h1>
        <p className="text-muted-foreground text-sm mb-4">Portfolio Manager</p>
        {title && <h2 className="text-xl font-semibold text-foreground">{title}</h2>}
      </div>

      {errorMessage && (
        <div className="bg-destructive text-destructive-foreground p-3 rounded-md mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {children}
    </div>
  );
}
