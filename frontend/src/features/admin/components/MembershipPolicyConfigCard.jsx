import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { apiGet, apiPut } from '../../../shared/api/client';
import { useMembershipStore } from '../../../shared/store/membershipStore';
import { useToastStore } from '../../user/store/toastStore';

const REVIEW_PERIOD = {
  key: 'VIP_REVIEW_PERIOD_MONTHS',
  defaultValue: '3',
};

const TIER_FIELDS = [
  {
    tier: 'VIP 1',
    thresholdKey: 'VIP_1_MIN_POINTS',
    thresholdDefault: '2000',
    requiredKey: 'VIP_1_REQUIRED_EARNED_POINTS',
    requiredDefault: '300',
    penaltyKey: 'VIP_1_PENALTY_POINTS',
    penaltyDefault: '600',
    accent: 'border-slate-300 dark:border-slate-400/30 bg-slate-100 dark:bg-slate-400/10 text-slate-700 dark:text-slate-300',
  },
  {
    tier: 'VIP 2',
    thresholdKey: 'VIP_2_MIN_POINTS',
    thresholdDefault: '4000',
    requiredKey: 'VIP_2_REQUIRED_EARNED_POINTS',
    requiredDefault: '500',
    penaltyKey: 'VIP_2_PENALTY_POINTS',
    penaltyDefault: '1000',
    accent: 'border-amber-300 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300',
  },
  {
    tier: 'VIP 3',
    thresholdKey: 'VIP_3_MIN_POINTS',
    thresholdDefault: '8000',
    requiredKey: 'VIP_3_REQUIRED_EARNED_POINTS',
    requiredDefault: '1000',
    penaltyKey: 'VIP_3_PENALTY_POINTS',
    penaltyDefault: '2000',
    accent: 'border-cyan-300 dark:border-cyan-400/30 bg-cyan-100 dark:bg-cyan-400/10 text-cyan-700 dark:text-cyan-300',
  },
];

const DEFAULTS = Object.fromEntries([
  [REVIEW_PERIOD.key, REVIEW_PERIOD.defaultValue],
  ...TIER_FIELDS.flatMap((field) => [
    [field.thresholdKey, field.thresholdDefault],
    [field.requiredKey, field.requiredDefault],
    [field.penaltyKey, field.penaltyDefault],
  ]),
]);

function valuesFromConfigs(configs) {
  return Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, defaultValue]) => [
      key,
      String(configs.find((config) => config.key === key)?.value ?? defaultValue),
    ]),
  );
}

function validatePolicy(values) {
  const fieldErrors = {};
  const parsed = {};

  Object.keys(DEFAULTS).forEach((key) => {
    const rawValue = String(values[key] ?? '').trim();
    const numericValue = Number(rawValue);
    const mustBePositive = key === REVIEW_PERIOD.key || key.endsWith('_MIN_POINTS');

    if (!rawValue || !Number.isInteger(numericValue) || numericValue < (mustBePositive ? 1 : 0)) {
      fieldErrors[key] = mustBePositive
        ? 'Giá trị phải là số nguyên lớn hơn 0.'
        : 'Giá trị phải là số nguyên từ 0 trở lên.';
    } else if (key === REVIEW_PERIOD.key && numericValue > 120) {
      fieldErrors[key] = 'Kỳ xét hạng không được vượt quá 120 tháng.';
    }
    parsed[key] = numericValue;
  });

  const hasValidOrder = (
    parsed.VIP_1_MIN_POINTS < parsed.VIP_2_MIN_POINTS
    && parsed.VIP_2_MIN_POINTS < parsed.VIP_3_MIN_POINTS
  );

  return {
    fieldErrors,
    orderError: Object.keys(fieldErrors).length === 0 && !hasValidOrder
      ? 'Các mốc phải thỏa mãn: VIP 1 < VIP 2 < VIP 3.'
      : '',
  };
}

const DISTRIBUTION_STYLES = [
  {
    level: 3,
    label: 'VIP 3',
    text: 'text-cyan-700 dark:text-cyan-300',
    badge: 'border-cyan-300 dark:border-cyan-400/30 bg-cyan-100 dark:bg-cyan-400/10',
    bar: 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]',
  },
  {
    level: 2,
    label: 'VIP 2',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'border-amber-300 dark:border-amber-400/30 bg-amber-100 dark:bg-amber-400/10',
    bar: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]',
  },
  {
    level: 1,
    label: 'VIP 1',
    text: 'text-slate-700 dark:text-slate-300',
    badge: 'border-slate-300 dark:border-slate-400/30 bg-slate-100 dark:bg-slate-400/10',
    bar: 'bg-slate-500 shadow-[0_0_10px_rgba(148,163,184,0.6)]',
  },
  {
    level: 0,
    label: 'VIP 0',
    text: 'text-gray-500 dark:text-slate-300',
    badge: 'border-gray-300 dark:border-slate-400/20 bg-gray-100 dark:bg-slate-400/10',
    bar: 'bg-gray-400 dark:bg-slate-400',
  },
];

function createTierDistribution(customers, policyValues) {
  const counts = [0, 0, 0, 0];
  const thresholds = [
    Number(policyValues.VIP_1_MIN_POINTS),
    Number(policyValues.VIP_2_MIN_POINTS),
    Number(policyValues.VIP_3_MIN_POINTS),
  ];

  customers.forEach((customer) => {
    const storedTier = Number(customer.membershipTier);
    let tier = Number.isInteger(storedTier) && storedTier >= 0 && storedTier <= 3
      ? storedTier
      : 0;

    if (customer.membershipTier === undefined || customer.membershipTier === null) {
      const points = Math.max(0, Number(customer.memberPoints) || 0);
      tier = points >= thresholds[2] ? 3 : points >= thresholds[1] ? 2 : points >= thresholds[0] ? 1 : 0;
    }
    counts[tier] += 1;
  });

  const total = customers.length;
  return DISTRIBUTION_STYLES.map((item) => ({
    ...item,
    percentage: total > 0 ? (counts[item.level] / total) * 100 : 0,
  }));
}

export default function MembershipPolicyConfigCard() {
  const [savedValues, setSavedValues] = useState(() => valuesFromConfigs([]));
  const [values, setValues] = useState(() => valuesFromConfigs([]));
  const [loading, setLoading] = useState(true);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tierDistribution, setTierDistribution] = useState(() => (
    createTierDistribution([], valuesFromConfigs([]))
  ));
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    let active = true;

    Promise.all([
      apiGet('/system-configs'),
      apiGet('/admin/customers'),
    ])
      .then(([configs, customers]) => {
        if (!active) return;
        const loadedValues = valuesFromConfigs(configs);
        setSavedValues(loadedValues);
        setValues(loadedValues);
        setTierDistribution(createTierDistribution(Array.isArray(customers) ? customers : [], loadedValues));
      })
      .catch((error) => {
        console.error(error);
        if (active) showToast('Lỗi khi tải chính sách hạng thành viên', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  const validation = validatePolicy(values);
  const valid = Object.keys(validation.fieldErrors).length === 0 && !validation.orderError;
  const dirty = Object.keys(DEFAULTS).some((key) => String(values[key]) !== String(savedValues[key]));

  const changeValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setValues(savedValues);
    setSaveAttempted(false);
  };

  const save = async () => {
    setSaveAttempted(true);
    if (!valid) {
      showToast(validation.orderError || 'Vui lòng kiểm tra lại chính sách VIP', 'error');
      return;
    }

    setSaving(true);
    try {
      const savedConfigs = await apiPut(
        '/system-configs/membership-policy',
        Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, String(values[key])])),
      );
      const nextValues = valuesFromConfigs(savedConfigs);
      setSavedValues(nextValues);
      setValues(nextValues);
      await useMembershipStore.getState().loadMembershipTiers({ force: true });
      const customers = await apiGet('/admin/customers');
      setTierDistribution(createTierDistribution(Array.isArray(customers) ? customers : [], nextValues));
      setSaveAttempted(false);
      showToast('Đã cập nhật chính sách hạng thành viên VIP', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Lỗi khi cập nhật chính sách hạng VIP', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-[20px] border border-white/10 bg-[#141414] py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-4 border-b border-gray-200 dark:border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Chính sách hạng thành viên VIP</h3>
        </div>

        <div className="flex flex-wrap items-end justify-end gap-3 self-stretch sm:self-auto">
          <div>
            <label htmlFor={REVIEW_PERIOD.key} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-white/45">
              Chu kỳ xét hạng
            </label>
            <div className="w-[138px]">
              <PolicyInput
                fieldKey={REVIEW_PERIOD.key}
                value={values[REVIEW_PERIOD.key]}
                unit="tháng"
                min={1}
                max={120}
                error={saveAttempted ? validation.fieldErrors[REVIEW_PERIOD.key] : ''}
                onChange={changeValue}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={!dirty || saving}
              className="h-11 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 text-xs font-bold text-gray-700 dark:text-white/70 transition hover:bg-gray-50 dark:hover:border-white/20 dark:hover:bg-white/10 disabled:bg-gray-200 disabled:text-gray-400 disabled:border-transparent dark:disabled:bg-white/5 dark:disabled:text-white/30 dark:disabled:border-white/5 disabled:cursor-not-allowed"
            >
              Hoàn tác
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 px-4 text-xs font-extrabold text-white shadow-lg shadow-red-900/25 transition hover:from-red-500 hover:to-rose-400 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none dark:disabled:from-white/10 dark:disabled:to-white/10 dark:disabled:text-white/40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Đang lưu
                </>
              ) : (
                <>
                  <Check size={15} />
                  Lưu chính sách
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {saveAttempted && validation.fieldErrors[REVIEW_PERIOD.key] && (
        <div className="border-b border-red-500/15 bg-red-500/[0.06] px-5 py-2 text-right text-[10px] text-red-400 sm:px-6">
          {validation.fieldErrors[REVIEW_PERIOD.key]}
        </div>
      )}

      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-5">
          <h4 className="mb-4 text-sm font-extrabold text-gray-900 dark:text-white">Phân bổ hạng hiện tại</h4>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tierDistribution.map((item) => (
              <div
                key={item.level}
                className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-black/20 px-3.5 py-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.1em] ${item.badge} ${item.text}`}>
                    {item.label}
                  </span>
                  <span className={`text-sm font-black tabular-nums ${item.text}`}>
                    {item.percentage.toLocaleString('vi-VN', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${item.bar}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3 sm:p-6">
        {TIER_FIELDS.map((field) => (
          <div
            key={field.tier}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/25 p-4 transition focus-within:border-red-500/40 focus-within:bg-gray-50 dark:focus-within:bg-black/35 shadow-sm dark:shadow-none"
          >
            <span className={`mb-4 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.12em] ${field.accent}`}>
              {field.tier}
            </span>

            <div className="space-y-4">
              <PolicyField
                fieldKey={field.thresholdKey}
                label={`Mốc lên hạng ${field.tier}`}
                min={1}
                value={values[field.thresholdKey]}
                error={saveAttempted ? validation.fieldErrors[field.thresholdKey] : ''}
                onChange={changeValue}
              />
              <PolicyField
                fieldKey={field.requiredKey}
                label="Điểm cần phát sinh trong kỳ"
                min={0}
                value={values[field.requiredKey]}
                error={saveAttempted ? validation.fieldErrors[field.requiredKey] : ''}
                onChange={changeValue}
              />
              <PolicyField
                fieldKey={field.penaltyKey}
                label="Điểm bị trừ khi không đạt"
                min={0}
                value={values[field.penaltyKey]}
                error={saveAttempted ? validation.fieldErrors[field.penaltyKey] : ''}
                onChange={changeValue}
              />
            </div>
          </div>
        ))}
      </div>

      {saveAttempted && validation.orderError && (
        <div className="mx-5 mb-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 sm:mx-6 sm:mb-6">
          {validation.orderError}
        </div>
      )}

      {dirty && !saveAttempted && (
        <div className="mx-5 mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-xs text-amber-200/80 sm:mx-6 sm:mb-6">
          Bạn có thay đổi chưa lưu. Chính sách mới chỉ có hiệu lực sau khi bấm “Lưu chính sách”.
        </div>
      )}
    </section>
  );
}

function PolicyField({ fieldKey, label, min, value, error, onChange }) {
  return (
    <div>
      <label htmlFor={fieldKey} className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-white/80">
        {label}
      </label>
      <PolicyInput
        fieldKey={fieldKey}
        value={value}
        unit="điểm"
        min={min}
        error={error}
        onChange={onChange}
      />
      {error && <p className="mt-1.5 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

function PolicyInput({ fieldKey, value, unit, min, max, error, onChange }) {
  return (
    <div className="relative">
      <input
        id={fieldKey}
        type="number"
        min={min}
        max={max}
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(fieldKey, event.target.value)}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-xl border bg-white dark:bg-[#090909] px-3.5 pr-16 text-base font-extrabold text-gray-900 dark:text-white outline-none transition focus:ring-2 ${
          error
            ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/15'
            : 'border-gray-300 dark:border-white/10 focus:border-red-500/60 focus:ring-red-500/15'
        }`}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-gray-400 dark:text-white/35">
        {unit}
      </span>
    </div>
  );
}
