import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../shared/api/client';

export default function RefundManagementPage() {
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGet('/admin/refunds').then((data) => {
      if (active) setOrders(data);
    }).catch((err) => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function process(order) {
    const key = `${order.kind}-${order.id}`;
    setBusy(key);
    setError('');
    try {
      const result = await apiPost(`/admin/refunds/${order.kind}/${order.id}`, { receipt: receipts[key] || '' });
      if (result.status === 'REFUNDED') {
        setOrders((current) => current.filter((item) => `${item.kind}-${item.id}` !== key));
      } else {
        setError('Stripe đang xử lý khoản hoàn tiền. Giao dịch vẫn chờ đối soát; hãy kiểm tra lại sau.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl">
      <h1 className="text-2xl font-bold">Hoàn tiền</h1>
      <p className="mt-2 text-sm text-slate-300">
        Stripe: gửi yêu cầu hoàn về phương thức thanh toán ban đầu.
        VNPAY hoặc tiền mặt: hoàn tiền cho khách trước, sau đó nhập mã chứng từ để xác nhận.
      </p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-500/15 p-3 text-red-300">{error}</p>}
      {loading ? <p role="status" className="mt-6">Đang tải...</p> : orders.length === 0 ? (
        <p className="mt-6 text-slate-300">Không có giao dịch chờ hoàn tiền.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-white/10 text-slate-400">
              <th className="p-3">Đơn hàng</th><th className="p-3">Khách hàng</th>
              <th className="p-3">Số tiền</th><th className="p-3">Phương thức</th><th className="p-3">Xử lý</th>
            </tr></thead>
            <tbody>{orders.map((order) => {
              const key = `${order.kind}-${order.id}`;
              const stripe = order.method === 'STRIPE';
              return <tr key={key} className="border-b border-white/5">
                <td className="p-3">{order.reference}</td><td className="p-3">{order.customer}</td>
                <td className="p-3 whitespace-nowrap">{Number(order.amount).toLocaleString('vi-VN')} ₫</td>
                <td className="p-3">{order.method || 'Chưa xác định'}</td>
                <td className="p-3">
                  {!stripe && <input aria-label={`Mã chứng từ ${order.reference}`} placeholder="Mã chứng từ đã hoàn tiền"
                    value={receipts[key] || ''} maxLength={255}
                    onChange={(event) => setReceipts((current) => ({ ...current, [key]: event.target.value }))}
                    className="mr-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2" />}
                  <button type="button" disabled={Boolean(busy) || (!stripe && (!order.method || !receipts[key]?.trim()))}
                    onClick={() => process(order)} className="rounded-lg bg-red-600 px-4 py-2 disabled:opacity-40">
                    {busy === key ? 'Đang xử lý...' : stripe ? 'Hoàn qua Stripe' : 'Xác nhận đã hoàn'}
                  </button>
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
