'use client';

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
            className="form-input"
            placeholder="Priya Sharma"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
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
            className="form-input"
            placeholder="priya@techcorp.com"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Phone <span className="text-[#C4402A]">*</span>
          </label>
          <input
            type="tel"
            className="form-input"
            placeholder="+91 98765 43210"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
