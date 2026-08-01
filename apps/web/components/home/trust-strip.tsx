'use client';

export function TrustStrip() {
  const stats = [
    { number: '500+', label: 'Products' },
    { number: '100+', label: 'Orders Delivered' },
    { number: '50+', label: 'Cities Served' },
    { number: '50+', label: 'Companies' },
  ];

  const companies = ['TECHCORP', 'WIPRO', 'INFOSYS', 'ZOMATO', 'RAZORPAY', 'FLIPKART'];

  return (
    <section className="bg-white border-b border-[#E5DFD4] py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-[#222222]">{stat.number}</div>
              <div className="text-sm text-[#8F8A82] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* <div className="border-t border-[#E5DFD4] pt-8">
          <p className="text-center text-sm text-[#8F8A82] italic mb-6">India's first self-serve bulk gifting platform with transparent pricing</p>
          <div className="overflow-hidden">
            <div className="flex gap-16 whitespace-nowrap animate-marquee">
              {companies.map(name => (
                <span key={name} className="text-xs font-bold text-[#D3CBBC]">{name}</span>
              ))}
              {companies.map(name => (
                <span key={`${name}-2`} className="text-xs font-bold text-[#D3CBBC]">{name}</span>
              ))}
            </div>
          </div>
        </div> */}
      </div>
    </section>
  );
}
