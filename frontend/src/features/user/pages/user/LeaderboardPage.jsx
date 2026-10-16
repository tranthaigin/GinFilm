import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { getLeaderboard } from '../../api/services/leaderboardService';
import { getMembershipTier } from '../../../../shared/constants/membership';
import { useMembershipStore } from '../../../../shared/store/membershipStore';

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const date = new Intl.DateTimeFormat('vi-VN');

const podiumStyles = {
  1: {
    label: 'Hạng nhất',
    icon: 'workspace_premium',
    card: 'border-amber-400 bg-gradient-to-b from-amber-100 via-amber-50 to-white shadow-[0_18px_45px_rgba(217,119,6,0.16)] dark:border-amber-400/50 dark:from-amber-400/15 dark:via-amber-400/[0.05] dark:to-transparent dark:shadow-none',
    badge: 'bg-amber-400 text-black',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  2: {
    label: 'Hạng nhì',
    icon: 'military_tech',
    card: 'border-slate-400 bg-gradient-to-b from-slate-200 via-slate-100 to-white shadow-[0_16px_38px_rgba(71,85,105,0.14)] dark:border-slate-300/40 dark:from-slate-300/10 dark:via-slate-300/[0.04] dark:to-transparent dark:shadow-none',
    badge: 'bg-slate-300 text-black',
    iconColor: 'text-slate-600 dark:text-slate-300',
  },
  3: {
    label: 'Hạng ba',
    icon: 'military_tech',
    card: 'border-orange-500 bg-gradient-to-b from-orange-100 via-orange-50 to-white shadow-[0_16px_38px_rgba(234,88,12,0.14)] dark:border-orange-500/40 dark:from-orange-500/10 dark:via-orange-500/[0.04] dark:to-transparent dark:shadow-none',
    badge: 'bg-orange-500 text-white',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
};

const tierTextClass = (level) =>
  ({
    0: 'text-slate-600 dark:text-[#9ca3af]',
    1: 'text-slate-700 dark:text-[#c0c0dc]',
    2: 'text-amber-700 dark:text-[#f5a623]',
    3: 'text-cyan-700 dark:text-[#60d4f5]',
  })[level] || 'text-slate-600 dark:text-[#9ca3af]';

function Avatar({ entry, size = 'h-14 w-14', showTier = true }) {
  const initial = entry.displayName?.charAt(0)?.toUpperCase() || 'K';
  const membershipTiers = useMembershipStore((state) => state.tiers);
  const tier = getMembershipTier(
    entry.memberPoints,
    membershipTiers,
    entry.membershipTier
  );
  return (
    <span className="relative inline-flex shrink-0 flex-col items-center">
      <span
        className={`${size} relative rounded-full p-[3px]`}
        style={{
          background: `linear-gradient(135deg, ${tier.color}, ${tier.color}55, ${tier.color})`,
          boxShadow: `0 0 24px ${tier.color}55`,
        }}
      >
        <span className="absolute inset-[3px] overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-rose-800">
          <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
            {initial}
          </span>
          {entry.avatar && (
            <img
              src={entry.avatar}
              alt=""
              className="absolute inset-0 z-10 h-full w-full rounded-full object-cover object-center"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
        </span>
      </span>
      {showTier && (
        <span
          className={`-mt-2.5 relative z-10 rounded-full border bg-white px-2.5 py-0.5 text-[9px] font-black tracking-[0.12em] shadow-sm dark:bg-[#111114] ${tierTextClass(tier.level)}`}
          style={{
            borderColor: `${tier.color}99`,
          }}
        >
          {tier.name}
        </span>
      )}
    </span>
  );
}

function PodiumCard({ entry }) {
  const style = podiumStyles[entry.rank];
  const membershipTiers = useMembershipStore((state) => state.tiers);
  const tier = getMembershipTier(
    entry.memberPoints,
    membershipTiers,
    entry.membershipTier
  );
  const isWinner = entry.rank === 1;
  return (
    <article
      className={`relative flex flex-col items-center overflow-hidden rounded-t-[28px] border border-b-0 px-5 pb-6 pt-7 text-center ${style.card} ${
        isWinner ? 'min-h-[355px] md:-mt-12' : 'min-h-[305px]'
      }`}
      style={{ boxShadow: `inset 0 1px 0 ${tier.color}30` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${tier.color}, transparent 48%)`,
        }}
      />
      <span
        className={`absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${style.badge}`}
      >
        {entry.rank}
      </span>
      <span
        className={`material-symbols-outlined relative mb-3 text-[34px] ${style.iconColor}`}
      >
        {style.icon}
      </span>
      <Avatar entry={entry} size={isWinner ? 'h-28 w-28' : 'h-24 w-24'} />
      <p className="mt-4 text-lg font-black text-gray-900 dark:text-white">
        {entry.displayName}
      </p>
      <p
        className={`mt-1 text-xs font-black uppercase tracking-[0.18em] ${tierTextClass(tier.level)}`}
      >
        {tier.name} · {style.label}
      </p>
      <p
        className={`${isWinner ? 'mt-5 text-2xl' : 'mt-4 text-xl'} font-black text-[#e61a27]`}
      >
        {money.format(entry.totalSpent)}
      </p>
      <p className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-400">
        {entry.purchaseCount} giao dịch thành công
      </p>
      <div
        className={`absolute inset-x-0 bottom-0 h-1 ${isWinner ? 'opacity-100' : 'opacity-70'}`}
        style={{
          background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
        }}
      />
    </article>
  );
}

function LoadingRows() {
  return Array.from({ length: 6 }, (_, index) => (
    <div
      key={index}
      className="h-[82px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.06]"
    />
  ));
}

export default function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const membershipTiers = useMembershipStore((state) => state.tiers);

  // Khởi tạo period ('week' hoặc 'month') từ URL param hoặc sessionStorage
  const [period, setPeriodState] = useState(() => {
    const fromUrl = searchParams.get('period');
    if (fromUrl === 'month' || fromUrl === 'week') return fromUrl;
    const fromStorage = sessionStorage.getItem('leaderboard_period');
    if (fromStorage === 'month' || fromStorage === 'week') return fromStorage;
    return 'week';
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const handleSetPeriod = (newPeriod) => {
    sessionStorage.setItem('leaderboard_period', newPeriod);
    setSearchParams({ period: newPeriod }, { replace: true });
    setPeriodState(newPeriod);
  };

  // Lưu vị trí cuộn màn hình khi người dùng scroll
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('leaderboard_scroll_y', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const requestKey201 = JSON.stringify([period, reloadKey]);
  const [previousRequestKey201, setPreviousRequestKey201] = useState(null);
  if (previousRequestKey201 !== requestKey201) {
    setPreviousRequestKey201(requestKey201);
    setLoading(true);
    setError('');
  }

  useEffect(() => {
    let active = true;

    getLeaderboard(period)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((requestError) => {
        if (active)
          setError(requestError.message || 'Không thể tải bảng xếp hạng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, reloadKey]);

  // Tự động khôi phục vị trí cuộn trang (scroll position) sau khi tải xong dữ liệu
  useEffect(() => {
    if (!loading && data) {
      const savedY = sessionStorage.getItem('leaderboard_scroll_y');
      if (savedY) {
        window.scrollTo({ top: parseInt(savedY, 10), behavior: 'instant' });
      }
    }
  }, [loading, data]);

  const entries = data?.entries || [];
  const podium = [entries[1], entries[0], entries[2]].filter(Boolean);
  const remaining = entries.slice(3);

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 dark:bg-[#09090b] dark:text-white">
      <Header />
      <main className="relative overflow-hidden pb-20 pt-12">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-red-600/10 blur-[130px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <section className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#e61a27]">
              <span className="material-symbols-outlined text-[18px]">
                trophy
              </span>
              GinFilm Rewards
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              Bảng xếp hạng khách hàng
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
              Vinh danh những tín đồ điện ảnh có tổng chi tiêu cao nhất từ vé
              tại rạp và vé xem online.
            </p>

            <div className="mx-auto mt-8 inline-flex rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              {[
                ['week', 'Tuần này'],
                ['month', 'Tháng này'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSetPeriod(value)}
                  className={`rounded-xl px-7 py-3 text-sm font-black transition-all ${
                    period === value
                      ? 'bg-[#e61a27] text-white shadow-[0_8px_24px_rgba(230,26,39,0.28)]'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {data?.startDate && (
              <p className="mt-4 text-xs font-semibold text-gray-400">
                {date.format(new Date(`${data.startDate}T00:00:00`))} –{' '}
                {date.format(new Date(`${data.endDate}T00:00:00`))}
              </p>
            )}
          </section>

          {error ? (
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-red-500">
                error
              </span>
              <p className="mt-2 font-bold">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-4 text-sm font-bold text-red-500"
              >
                Thử lại
              </button>
            </div>
          ) : loading ? (
            <div className="mt-12 grid gap-4">
              <LoadingRows />
            </div>
          ) : entries.length === 0 ? (
            <div className="mt-12 rounded-[28px] border border-gray-200 bg-white p-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <span className="material-symbols-outlined text-5xl text-gray-400">
                leaderboard
              </span>
              <h2 className="mt-4 text-xl font-black">
                Chưa có giao dịch trong kỳ này
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Bảng xếp hạng sẽ cập nhật ngay khi có giao dịch thành công.
              </p>
            </div>
          ) : (
            <>
              <section className="mt-24 grid items-end gap-3 md:grid-cols-3 md:gap-0">
                {podium.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`${entry.rank === 1 ? 'order-1 md:order-2 md:col-start-2' : entry.rank === 2 ? 'order-2 md:order-1' : 'order-3'} ${
                      entry.rank === 2
                        ? 'md:mr-1'
                        : entry.rank === 3
                          ? 'md:ml-1'
                          : ''
                    }`}
                  >
                    <PodiumCard entry={entry} />
                    <div
                      className={`relative flex items-center justify-center border-x border-t border-gray-300 bg-gradient-to-b from-gray-100 to-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/10 dark:from-white/[0.08] dark:to-white/[0.02] dark:shadow-none ${
                        entry.rank === 1
                          ? 'h-28'
                          : entry.rank === 2
                            ? 'h-20'
                            : 'h-14'
                      }`}
                    >
                      <span
                        className="text-5xl font-black"
                        style={{
                          color: podiumStyles[entry.rank].badge.includes(
                            'amber'
                          )
                            ? '#fbbf24'
                            : entry.rank === 2
                              ? '#64748b'
                              : '#f97316',
                          textShadow:
                            entry.rank === 1
                              ? '0 0 24px rgba(251,191,36,0.55)'
                              : entry.rank === 2
                                ? '0 0 20px rgba(219,228,240,0.35)'
                                : '0 0 20px rgba(249,115,22,0.45)',
                        }}
                      >
                        {entry.rank}
                      </span>
                    </div>
                  </div>
                ))}
              </section>

              {remaining.length > 0 && (
                <section className="mt-8 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="border-b border-gray-200 px-6 py-5 dark:border-white/10">
                    <h2 className="text-lg font-black">Top 10 khách hàng</h2>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                    {remaining.map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-4 px-5 py-4 sm:px-7 ${entry.currentUser ? 'bg-red-500/[0.08]' : ''}`}
                      >
                        <span className="w-8 text-center text-lg font-black text-gray-400">
                          #{entry.rank}
                        </span>
                        <Avatar entry={entry} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black">
                            {entry.displayName}
                          </p>
                          <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-500">
                            <span
                              className={`font-black ${tierTextClass(getMembershipTier(entry.memberPoints, membershipTiers, entry.membershipTier).level)}`}
                            >
                              {
                                getMembershipTier(
                                  entry.memberPoints,
                                  membershipTiers,
                                  entry.membershipTier
                                ).name
                              }
                            </span>
                            {' · '}
                            {entry.purchaseCount} giao dịch
                          </p>
                        </div>
                        <p className="text-right text-sm font-black text-[#e61a27] sm:text-base">
                          {money.format(entry.totalSpent)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {!loading && data?.currentUser && (
            <aside className="sticky bottom-4 z-20 mt-8 flex items-center gap-4 rounded-2xl border border-red-500/40 bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-[#18181b]/95">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e61a27] text-sm font-black text-white shadow-[0_6px_18px_rgba(230,26,39,0.3)]">
                #{data.currentUser.rank}
              </span>
              <Avatar entry={data.currentUser} size="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-gray-900 dark:text-white">
                  {data.currentUser.displayName}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span
                    className={`font-black ${tierTextClass(getMembershipTier(data.currentUser.memberPoints, membershipTiers, data.currentUser.membershipTier).level)}`}
                  >
                    {
                      getMembershipTier(
                        data.currentUser.memberPoints,
                        membershipTiers,
                        data.currentUser.membershipTier
                      ).name
                    }
                  </span>
                  {' · '}
                  {data.currentUser.purchaseCount} giao dịch trong kỳ
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                  Thứ hạng của bạn
                </p>
                <p className="mt-1 font-black text-[#e61a27]">
                  {money.format(data.currentUser.totalSpent)}
                </p>
              </div>
            </aside>
          )}

          <p className="mt-7 text-center text-xs leading-5 text-gray-400">
            Chỉ tính giao dịch hoàn tất. Đơn đã hủy không được cộng vào bảng xếp
            hạng.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
