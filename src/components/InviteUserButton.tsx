import { useState } from 'react';
import { actions } from 'astro:actions';
import { Button } from '@/components/ui/button';
import { InvitationModal } from './InvitationModal';

interface InviteUserButtonProps {
  isCurrentUserAdmin: boolean;
}

export function InviteUserButton({ isCurrentUserAdmin }: InviteUserButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInvitationSubmit = async (email: string | undefined, expiresInDays: number) => {
    try {
      const result = await actions.invitations.create({
        email,
        expiresInDays,
      });

      if (result.data?.success) {
        // Refresh the page to show updated invitations
        window.location.reload();
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  };

  if (!isCurrentUserAdmin) {
    return null;
  }

  return (
    <>
      <div className="space-x-4 mb-4">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          Invite User
        </Button>
      </div>
      
      <InvitationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleInvitationSubmit}
      />
    </>
  );
}
