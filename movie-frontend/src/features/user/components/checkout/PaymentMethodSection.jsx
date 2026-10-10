const PAYMENT_METHODS = [
  { id: 'stripe', title: 'Thẻ tín dụng / Ghi nợ (Stripe)', subtitle: 'Visa, MasterCard, JCB', icon: 'credit_card' }
];

function RadioIndicator({ checked }) {
  return (
    <div
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? 'border-[#FF2E63]' : 'border-[#6E6E6E]'
      }`}
    >
      {checked && <div className="h-2.5 w-2.5 rounded-full bg-[#FF2E63]" />}
    </div>
  );
}

export default function PaymentMethodSection({
  paymentMethod,
  onPaymentMethodChange
}) {
  return (
    <section className="rounded-[28px] border border-white/6 bg-[#18181b] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.32)] md:p-8">
      <div className="flex items-start gap-4 border-b border-white/6 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2E63]/12 text-[#FF7A9D]">
          <span className="material-symbols-outlined text-[24px]">payment</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#777777]">Bước 3 · Thanh toán</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Chọn phương thức thanh toán</h2>
          <p className="mt-2 text-sm leading-6 text-[#A9A9A9]">
            Hệ thống hỗ trợ thanh toán an toàn để bạn hoàn tất vé nhanh chóng.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {PAYMENT_METHODS.map((method) => {
          const checked = paymentMethod === method.id;

          return (
            <div key={method.id}>
              <label
                className={`relative flex cursor-pointer rounded-[24px] border p-4 transition-all ${
                  checked
                    ? 'border-[#FF2E63]/55 bg-[#1C1216] shadow-[0_12px_28px_rgba(255,46,99,0.18)]'
                    : 'border-white/10 bg-black hover:border-[#FF2E63]/30 hover:bg-[#18181b]'
                }`}
              >
                <input
                  className="sr-only"
                  name="paymentMethod"
                  type="radio"
                  value={method.id}
                  checked={checked}
                  onChange={() => onPaymentMethodChange(method.id)}
                />
                <div className="flex w-full items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <RadioIndicator checked={checked} />
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-white">{method.title}</span>
                      <span className="text-sm text-[#A3A3A3]">{method.subtitle}</span>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined ${checked ? 'text-[#FF8FA8]' : 'text-[#8B8B8B]'}`}>
                    {method.icon}
                  </span>
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
