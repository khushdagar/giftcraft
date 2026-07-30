'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProposalForm } from '@/components/admin/proposals/proposal-form';

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: { email: string; name: string; company: string };
  onSent: () => void;
}

/** Popup to create & send a proposal straight from an enquiry row. */
export function ProposalDialog({ open, onOpenChange, prefill, onSent }: ProposalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Send proposal{prefill.name ? ` to ${prefill.name}` : ''}
          </DialogTitle>
        </DialogHeader>
        {/* key resets the form when a different lead is picked */}
        {open && <ProposalForm key={prefill.email} prefill={prefill} onSent={onSent} />}
      </DialogContent>
    </Dialog>
  );
}
