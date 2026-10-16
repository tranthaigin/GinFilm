export default function ContactDetailsForm({ contact, onChange }) {
  const handleChange = (field) => (e) => {
    onChange({ ...contact, [field]: e.target.value });
  };

  const inputClassName =
    'w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[#666666] focus:border-[#FF2E63]/60 focus:bg-[#181818]';

  return (
    <section className="rounded-[28px] border border-white/6 bg-[#18181b] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.32)] md:p-8">
      <div className="flex items-start gap-4 border-b border-white/6 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2E63]/12 text-[#FF7A9D]">
          <span className="material-symbols-outlined text-[24px]">person</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#777777]">Bước 2 · Thông tin liên hệ</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Xác nhận thông tin nhận vé</h2>
          <p className="mt-2 text-sm leading-6 text-[#A9A9A9]">
            Vé điện tử và thông báo thanh toán sẽ được gửi về email và số điện thoại bạn nhập tại đây.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]" htmlFor="firstName">
            Tên
          </label>
          <input
            className={inputClassName}
            id="firstName"
            placeholder="Nhập tên"
            required
            type="text"
            value={contact.firstName}
            onChange={handleChange('firstName')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]" htmlFor="lastName">
            Họ
          </label>
          <input
            className={inputClassName}
            id="lastName"
            placeholder="Nhập họ"
            required
            type="text"
            value={contact.lastName}
            onChange={handleChange('lastName')}
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]" htmlFor="email">
            Email nhận vé
          </label>
          <input
            className={inputClassName}
            id="email"
            placeholder="ban@ginfilm.example"
            required
            type="email"
            value={contact.email}
            onChange={handleChange('email')}
          />
          <p className="mt-1 text-sm text-[#8F8F8F]">Mã vé, hóa đơn và thông báo lịch chiếu sẽ được gửi về email này.</p>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]" htmlFor="phone">
            Số điện thoại
          </label>
          <input
            className={inputClassName}
            id="phone"
            placeholder="0xxx xxx xxx"
            required
            type="tel"
            value={contact.phone}
            onChange={handleChange('phone')}
          />
        </div>
      </div>
    </section>
  );
}
