export const DEFAULT_MEMBERSHIP_THRESHOLDS = Object.freeze({
  VIP_1_MIN_POINTS: 2000,
  VIP_2_MIN_POINTS: 4000,
  VIP_3_MIN_POINTS: 8000,
});

const TIER_METADATA = [
  {
    level: 0,
    name: 'VIP 0',
    color: '#9ca3af',
    description: 'Tích lũy điểm thưởng đổi vé',
  },
  {
    level: 1,
    name: 'VIP 1',
    color: '#c0c0dc',
    description: 'Tặng combo bắp nước tháng sinh nhật',
  },
  {
    level: 2,
    name: 'VIP 2',
    color: '#f5a623',
    description: 'Ưu tiên mua vé sớm & Quà tặng độc quyền',
  },
  {
    level: 3,
    name: 'VIP 3',
    color: '#60d4f5',
    description: 'Phòng chờ hạng thương gia & Sự kiện Premiere',
  },
];

function isValidThreshold(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function validateMembershipThresholds(thresholds) {
  const vip1 = Number(thresholds?.VIP_1_MIN_POINTS);
  const vip2 = Number(thresholds?.VIP_2_MIN_POINTS);
  const vip3 = Number(thresholds?.VIP_3_MIN_POINTS);

  return (
    isValidThreshold(vip1)
    && isValidThreshold(vip2)
    && isValidThreshold(vip3)
    && vip1 < vip2
    && vip2 < vip3
  );
}

export function createMembershipTiers(thresholds = DEFAULT_MEMBERSHIP_THRESHOLDS) {
  const validatedThresholds = validateMembershipThresholds(thresholds)
    ? thresholds
    : DEFAULT_MEMBERSHIP_THRESHOLDS;
  const vip1 = Number(validatedThresholds.VIP_1_MIN_POINTS);
  const vip2 = Number(validatedThresholds.VIP_2_MIN_POINTS);
  const vip3 = Number(validatedThresholds.VIP_3_MIN_POINTS);
  const ranges = [
    { min: 0, max: vip1 - 1 },
    { min: vip1, max: vip2 - 1 },
    { min: vip2, max: vip3 - 1 },
    { min: vip3, max: Infinity },
  ];

  return TIER_METADATA.map((metadata, index) => ({
    ...metadata,
    ...ranges[index],
  }));
}

export function createMembershipTiersFromConfigs(configs) {
  const configList = Array.isArray(configs)
    ? configs
    : Array.isArray(configs?.data)
      ? configs.data
      : [];
  const configValues = Object.fromEntries(
    configList
      .filter((config) => Object.hasOwn(DEFAULT_MEMBERSHIP_THRESHOLDS, config?.key))
      .map((config) => [config.key, Number(config.value)]),
  );
  const thresholds = {
    ...DEFAULT_MEMBERSHIP_THRESHOLDS,
    ...configValues,
  };

  return createMembershipTiers(thresholds);
}

export const MEMBERSHIP_TIERS = createMembershipTiers();

export function getMembershipTier(memberPoints = 0, tiers = MEMBERSHIP_TIERS, protectedTierLevel) {
  const points = Math.max(0, Number(memberPoints) || 0);
  const availableTiers = Array.isArray(tiers) && tiers.length > 0
    ? tiers
    : MEMBERSHIP_TIERS;
  const normalizedProtectedLevel = Number(protectedTierLevel);

  if (Number.isInteger(normalizedProtectedLevel) && normalizedProtectedLevel >= 0 && normalizedProtectedLevel <= 3) {
    return availableTiers.find((tier) => tier.level === normalizedProtectedLevel)
      || availableTiers[0];
  }

  return availableTiers.find((tier) => points >= tier.min && points <= tier.max)
    || availableTiers[0];
}

export function getMembershipClass(level = 0) {
  const normalizedLevel = Math.min(3, Math.max(0, Number(level) || 0));
  return `membership-tier--vip-${normalizedLevel}`;
}
