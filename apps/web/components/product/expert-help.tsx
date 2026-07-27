'use client';

import { useState } from 'react';
import { MessageCircle, Phone, Mail } from 'lucide-react';
import { EnquiryForm } from './enquiry-form';

interface ExpertHelpProps {
  productName?: string;
  productId?: string;
}

export function ExpertHelp({ productName, productId }: ExpertHelpProps) {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  return (
    <>
      <div className="mt-8 rounded-md border border-bdr bg-white md:p-6 p-3">
        <h3 className="mb-2 text-sm font-semibold text-ink">Need help deciding?</h3>
        <p className="mb-4 text-xs text-ink-2">Our gifting experts are happy to assist.</p>

        <div className="flex flex-wrap gap-2">
          <a
            href="https://wa.me/919876543210?text=Hi%20I%20am%20interested%20in%20GIVOO%20products"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-bdr bg-white px-4 py-2 text-xs font-medium text-ink transition hover:bg-elevated"
          >
            <MessageCircle className="h-4 w-4" style={{ color: '#1A6B4F' }} />
            WhatsApp
          </a>
          <a
            href="tel:+919876543210"
            className="flex items-center gap-2 rounded-full border border-bdr bg-white px-4 py-2 text-xs font-medium text-ink transition hover:bg-elevated"
          >
            <Phone className="h-4 w-4" style={{ color: '#1A6B4F' }} />
            Call
          </a>
          <button
            onClick={() => setIsEnquiryOpen(!isEnquiryOpen)}
            className="flex items-center gap-2 rounded-full border border-bdr bg-white px-4 py-2 text-xs font-medium text-ink transition hover:bg-elevated"
          >
            <Mail className="h-4 w-4" style={{ color: '#1A6B4F' }} />
            Enquiry Form
          </button>
        </div>
      </div>

      {/* Enquiry Form Modal */}
      <EnquiryForm
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
        productName={productName}
        productId={productId}
      />
    </>
  );
}
