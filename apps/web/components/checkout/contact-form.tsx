'use client';

import { useState } from 'react';
import { FieldError } from '@/components/ui/field-error';
import { validateEmail, validateName, validatePhone } from '@/lib/validation';

export interface ContactFormData {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

interface ContactFormProps {
  data: ContactFormData;
  onChange: (data: ContactFormData) => void;
}

export function ContactForm({ data, onChange }: ContactFormProps) {
  // Errors only appear once a field has been visited, so the form doesn't shout
  // at the customer before they've typed anything.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {
    name: touched.name ? validateName(data.name, 'Full name') : null,
    email: touched.email ? validateEmail(data.email) : null,
    phone: touched.phone ? validatePhone(data.phone) : null,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7 mb-4">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">
        👤 Contact Person
      </h3>

      <div className="frow fr2 mb-4">
        <div className="form-group">
          <label className="form-label">
            Full Name <span className="text-[#C4402A]">*</span>
          </label>
          <input
            type="text"
            maxLength={100}
            className={`form-input ${errors.name ? 'border-red-400' : ''}`}
            placeholder="Priya Sharma"
            value={data.name}
            aria-invalid={!!errors.name}
            onBlur={() => touch('name')}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
          <FieldError message={errors.name ?? undefined} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Designation <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Head of HR"
            value={data.designation}
            onChange={(e) => onChange({ ...data, designation: e.target.value })}
          />
        </div>
      </div>

      <div className="frow fr2">
        <div className="form-group">
          <label className="form-label">
            Email <span className="text-[#C4402A]">*</span>
          </label>
          <input
            type="email"
            className={`form-input ${errors.email ? 'border-red-400' : ''}`}
            placeholder="priya@techcorp.com"
            value={data.email}
            aria-invalid={!!errors.email}
            onBlur={() => touch('email')}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
          />
          <FieldError message={errors.email ?? undefined} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Phone <span className="text-[#C4402A]">*</span>
          </label>
          <input
            type="tel"
            inputMode="tel"
            maxLength={14}
            className={`form-input ${errors.phone ? 'border-red-400' : ''}`}
            placeholder="+91 98765 43210"
            value={data.phone}
            aria-invalid={!!errors.phone}
            onBlur={() => touch('phone')}
            onChange={(e) =>
              onChange({ ...data, phone: e.target.value.replace(/[^\d+\s-]/g, '') })
            }
          />
          <FieldError message={errors.phone ?? undefined} />
        </div>
      </div>
    </div>
  );
}
