'use client';

interface StepOccasionProps {
  onSelect: (occasion: string) => void;
}

export function StepOccasion({ onSelect }: StepOccasionProps) {
  const occasions = [
    { id: 'corporate', name: 'Corporate Gifts', icon: '🏢', bg: 'bg-em-50' },
    { id: 'employee-recognition', name: 'Employee Recognition', icon: '⭐', bg: 'bg-gold-50' },
    { id: 'client-appreciation', name: 'Client Appreciation', icon: '🤝', bg: 'bg-[#EEF2FF]' },
    { id: 'holiday', name: 'Holiday Gifts', icon: '🎄', bg: 'bg-[#FFF1F2]' },
    { id: 'diwali', name: 'Diwali Special', icon: '🪔', bg: 'bg-[#F0FDFA]' },
    { id: 'team-building', name: 'Team Building', icon: '👥', bg: 'bg-[#F0F9FF]' },
    { id: 'promotional', name: 'Promotional', icon: '📢', bg: 'bg-[#FFF7ED]' },
    { id: 'wedding', name: 'Wedding Favors', icon: '💍', bg: 'bg-[#F5F3FF]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-ink mb-2">
          What's the occasion?
        </h2>
        <p className="text-ink-2">
          Select an occasion to get personalized gift recommendations
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {occasions.map((occasion) => (
          <button
            key={occasion.id}
            onClick={() => onSelect(occasion.id)}
            className={`${occasion.bg} rounded-lg p-6 text-center border-2 border-transparent hover:border-bdr transition group cursor-pointer`}
          >
            <div className="text-4xl mb-2 group-hover:scale-110 transition">{occasion.icon}</div>
            <p className="font-semibold text-sm text-ink group-hover:text-em transition">
              {occasion.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
