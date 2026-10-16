import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuthStore } from '../../store/authStore';
import {
  logout,
  refreshUserProfile,
  uploadAvatar,
  updateProfile,
} from '../../api/services/authService';
import { apiPost } from '../../../../shared/api/client';
import {
  getMembershipClass,
  getMembershipTier,
} from '../../../../shared/constants/membership';
import { useMembershipStore } from '../../../../shared/store/membershipStore';
import { LOGO_URL as Logo } from '../../../../shared/constants/brand';
import TicketBg from '../../../../assets/images/ginfilm-ticket.svg';
import UserActivityLogTab from './UserActivityLogTab';

function getInitials(fullName) {
  if (!fullName) return 'U';
  return (
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

function formatDob(value) {
  if (!value) return '—';
  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  const parts = String(value).split('/');
  if (parts.length === 3) return `${parts[0]}-${parts[1]}-${parts[2]}`;
  return String(value);
}

function formatDateTime(value) {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MembershipCard({
  tier,
  tiers,
  spending,
  points,
  memberPoints,
  className = '',
}) {
  const nextTier = tiers[tiers.indexOf(tier) + 1];
  const progress = nextTier
    ? Math.max(
        0,
        Math.min(
          100,
          ((memberPoints - tier.min) / (nextTier.min - tier.min)) * 100
        )
      )
    : 100;
  const tierClass = getMembershipClass(tier.level);

  return (
    <div
      className={`membership-profile-summary ${tierClass} rounded-[24px] border border-gray-200 dark:border-white/10 bg-white dark:bg-black shadow-sm dark:shadow-none p-5 flex flex-col justify-center ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="membership-tier-chip rounded-full border px-3 py-1 text-[11px] font-black tracking-wider">
              {tier.name}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {tier.description}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9D9D9D]">
            {nextTier
              ? `Còn thiếu ${(nextTier.min - memberPoints).toLocaleString('vi-VN')} điểm để lên ${nextTier.name}`
              : 'Bạn đã ở hạng cao nhất'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="membership-summary-stat rounded-2xl bg-gray-100 dark:bg-black border border-transparent dark:border-white/10 px-4 py-3">
          <p className="membership-summary-stat-label text-[11px] uppercase tracking-wide text-gray-500">
            Điểm GinFilm
          </p>
          <p className="membership-summary-stat-value mt-1 text-lg font-semibold text-[#111827] dark:text-white">
            {points?.toLocaleString('vi-VN') ?? '0'}
          </p>
        </div>
        <div className="membership-summary-stat rounded-2xl bg-gray-100 dark:bg-black border border-transparent dark:border-white/10 px-4 py-3">
          <p className="membership-summary-stat-label text-[11px] uppercase tracking-wide text-gray-500">
            Điểm tích lũy
          </p>
          <p className="membership-summary-stat-value mt-1 text-lg font-semibold text-[#111827] dark:text-white">
            {memberPoints?.toLocaleString('vi-VN') ?? '0'}
          </p>
        </div>
        <div className="membership-summary-stat rounded-2xl bg-gray-100 dark:bg-black border border-transparent dark:border-white/10 px-4 py-3">
          <p className="membership-summary-stat-label text-[11px] uppercase tracking-wide text-gray-500">
            Chi tiêu
          </p>
          <p className="membership-summary-stat-value mt-1 text-lg font-semibold text-[#111827] dark:text-white">
            {spending.toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>

      {nextTier && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>{tier.name}</span>
            <span>{nextTier.name}</span>
          </div>
          <div className="membership-profile-progress-track h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/8">
            <div
              className="membership-profile-progress-fill h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function maskEmail(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 3) return `${name}***@${domain}`;
  return `${name.slice(0, 5)}******@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  if (phone.length < 10) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

function maskUsername(username) {
  if (!username) return '';
  if (username.length <= 3) return `@${username}***`;
  return `@${username.slice(0, 3)}**********${username.slice(-3)}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const membershipTiers = useMembershipStore((state) => state.tiers);

  const [profileUser, setProfileUser] = useState(() => user || {});

  // --- PIN RECOVERY STATES ---
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [recoverStep, setRecoverStep] = useState(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState(['', '', '', '', '', '']);
  const [newPinDigits, setNewPinDigits] = useState(['', '', '', '', '', '']);
  const [confirmPinDigits, setConfirmPinDigits] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const [recoveryError, setRecoveryError] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [successToast, setSuccessToast] = useState(() =>
    sessionStorage.getItem('pin-recovery-success') === 'true'
      ? 'Lấy lại mã PIN thành công!'
      : ''
  );
  const [otpTimer, setOtpTimer] = useState(0);

  const otpInputsRef = useRef([]);
  const recoverPinInputsRef = useRef([]);
  const confirmPinInputsRef = useRef([]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const intervalId = setInterval(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [otpTimer]);

  const resetKey1 = JSON.stringify([user]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (user?.email) {
      setRecoveryEmail(user.email);
    }
  }

  useEffect(() => {
    refreshUserProfile();
  }, []);

  const resetKey2 = JSON.stringify([user]);
  const [previousResetKey2, setPreviousResetKey2] = useState(null);
  if (previousResetKey2 !== resetKey2) {
    setPreviousResetKey2(resetKey2);
    if (user) {
      setProfileUser(user);
    }
  }

  const displayName =
    profileUser?.fullName ||
    profileUser?.name ||
    (profileUser?.firstName && profileUser?.lastName
      ? `${profileUser.firstName} ${profileUser.lastName}`
      : null) ||
    profileUser?.firstName ||
    profileUser?.username ||
    'Người dùng';

  const displayUsername = (profileUser?.username || '').split('@')[0];
  const displayEmail = profileUser?.email || '';
  const displayPhone =
    profileUser?.phone || profileUser?.phoneNumber || profileUser?.mobile || '';
  const rawDob =
    profileUser?.dateOfBirth ||
    profileUser?.dob ||
    profileUser?.birthDate ||
    '';
  const displayDob = formatDob(rawDob);
  const displayPoints = profileUser?.rewardPoints ?? 0;
  const displayMemberPoints = profileUser?.memberPoints ?? 0;
  const displaySpending = displayMemberPoints * 1000;
  const hasPasswordAuth =
    !profileUser?.picture &&
    !profileUser?.avatarUrl &&
    !profileUser?.avatar &&
    Boolean(profileUser.username);
  const rawLastLogin =
    profileUser.lastLoginAt ||
    profileUser.lastLogin ||
    profileUser.lastSignIn ||
    profileUser.lastSignInAt ||
    profileUser.loginAt ||
    profileUser.loginDate ||
    profileUser.loggedInAt ||
    '';
  formatDateTime(rawLastLogin);

  const tier = getMembershipTier(
    displayMemberPoints,
    membershipTiers,
    profileUser?.membershipTier
  );

  const googleAvatar =
    profileUser?.picture || profileUser?.avatarUrl || profileUser?.avatar || '';
  const avatarIdentity = profileUser?.id || profileUser?.username || 'profile';
  const [avatarOverride, setAvatarOverride] = useState({
    identity: '',
    url: '',
  });
  const currentAvatar =
    avatarOverride.identity === avatarIdentity
      ? avatarOverride.url
      : googleAvatar;

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection =
    searchParams.get('tab') || location.state?.activeTab || 'profile';
  const activeSection =
    requestedSection === 'membership' ? 'profile' : requestedSection;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'membership') {
      setSearchParams({ tab: 'profile' }, { replace: true });
      return;
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (location.state?.activeTab) {
      const nextSection =
        location.state.activeTab === 'membership'
          ? 'profile'
          : location.state.activeTab;
      setSearchParams({ tab: nextSection }, { replace: true });
    }
  }, [location.state, setSearchParams]);

  useEffect(() => {
    if (sessionStorage.getItem('pin-recovery-success') === 'true') {
      sessionStorage.removeItem('pin-recovery-success');
      setTimeout(() => setSuccessToast(''), 4000);
    }
  }, [activeSection]);

  const resetKey3 = JSON.stringify([activeSection]);
  const [previousResetKey3, setPreviousResetKey3] = useState(null);
  if (previousResetKey3 !== resetKey3) {
    setPreviousResetKey3(resetKey3);
    if (activeSection === 'recover-pin') {
      setRecoverStep(1);
      setRecoveryOtp(['', '', '', '', '', '']);
      setNewPinDigits(['', '', '', '', '', '']);
      setConfirmPinDigits(['', '', '', '', '', '']);
      setRecoveryError('');
      setOtpTimer(0);
    }
  }
  const [isAddInfoModalOpen, setIsAddInfoModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('addInfo'); // 'edit' or 'addInfo'
  const [activePinFocus, setActivePinFocus] = useState(null); // format: 'key-idx' e.g. 'newPin-0'
  const [revealedPin, setRevealedPin] = useState(null); // stores temporarily revealed pin due to typing

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [visibleFields, setVisibleFields] = useState({});

  const updatePhoneRequested = searchParams.get('updatePhone') === 'true';
  const [previousPhoneRequest, setPreviousPhoneRequest] = useState(false);
  if (previousPhoneRequest !== updatePhoneRequested) {
    setPreviousPhoneRequest(updatePhoneRequested);
    if (updatePhoneRequested) {
      setModalMode('addInfo');
      setIsAddInfoModalOpen(true);
    }
  }

  useEffect(() => {
    const updatePhone = searchParams.get('updatePhone');
    if (updatePhone === 'true') {
      // Remove query param to prevent modal from reopening on every refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('updatePhone');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const mockHistory = [];

  const allProfileFields = [
    {
      id: 'fullName',
      dataKey: 'fullName',
      label: 'Họ và tên',
      type: 'text',
      icon: 'person',
      value: displayName,
      displayValue: displayName,
      visible: Boolean(displayName),
    },
    {
      id: 'email',
      dataKey: 'email',
      label: 'Email',
      type: 'email',
      icon: 'mail',
      value: displayEmail,
      displayValue: displayEmail,
      maskedValue: maskEmail(displayEmail),
      isMaskable: true,
      visible: Boolean(displayEmail),
      readOnly: true,
    },
    {
      id: 'phone',
      dataKey: 'phone',
      label: 'Số điện thoại',
      type: 'text',
      icon: 'call',
      value: displayPhone,
      displayValue: displayPhone,
      maskedValue: maskPhone(displayPhone),
      isMaskable: true,
      visible: Boolean(displayPhone),
    },
    {
      id: 'dob',
      dataKey: 'dob',
      label: 'Ngày sinh',
      type: 'date',
      icon: 'calendar_month',
      value: rawDob,
      displayValue: displayDob,
      visible: Boolean(rawDob),
    },
    {
      id: 'username',
      dataKey: 'username',
      label: 'Tên đăng nhập',
      type: 'text',
      icon: 'badge',
      value: displayUsername,
      displayValue: displayUsername ? `@${displayUsername}` : '',
      maskedValue: maskUsername(displayUsername),
      isMaskable: true,
      visible: Boolean(displayUsername) && hasPasswordAuth,
      readOnly: true,
      forceHide: !hasPasswordAuth,
    },
    {
      id: 'password',
      label: 'Mật khẩu',
      type: 'password',
      icon: 'lock',
      value: '',
      displayValue: '••••••••••',
      isPassword: true,
      visible: hasPasswordAuth,
    },
  ];

  const profileFields = allProfileFields.filter((field) => field.visible);

  const [tempProfileData, setTempProfileData] = useState({});
  const [profileErrors, setProfileErrors] = useState({});

  const resetKey4 = JSON.stringify([
    isAddInfoModalOpen,
    displayName,
    displayEmail,
    displayPhone,
    rawDob,
    displayUsername,
  ]);
  const [previousResetKey4, setPreviousResetKey4] = useState(null);
  if (previousResetKey4 !== resetKey4) {
    setPreviousResetKey4(resetKey4);
    if (isAddInfoModalOpen) {
      setTempProfileData({
        fullName: displayName,
        email: displayEmail,
        phone: displayPhone,
        dob: rawDob,
        username: displayUsername,
      });
    }
  }

  const validateField = (key, value) => {
    const valStr = value || '';
    if (key === 'fullName') {
      const trimmedFullName = valStr.trim();
      if (!trimmedFullName) return 'Vui lòng nhập họ và tên.';
      if (trimmedFullName.length < 2 || trimmedFullName.length > 50)
        return 'Họ và tên phải từ 2-50 ký tự.';

      const numMatch = valStr.match(/\d/);
      if (numMatch) return `Họ tên không chứa số '${numMatch[0]}'.`;

      const specialMatch = valStr.match(/[^a-zA-Z\sÀ-ỹ]/);
      if (specialMatch) return `Họ tên không chứa ký tự '${specialMatch[0]}'.`;
    }
    if (key === 'email') {
      const trimmedEmail = valStr.trim();
      if (!trimmedEmail) return 'Vui lòng nhập email.';
      if (/\s/.test(valStr)) return 'Email không chứa khoảng trắng.';
      if (!/@/.test(valStr)) return "Email phải chứa ký tự '@'.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr))
        return 'Email không đúng định dạng (VD: example@gmail.com).';
    }
    if (key === 'phone') {
      if (!valStr) return 'Vui lòng nhập số điện thoại.';
      if (/\s/.test(valStr)) return 'Số điện thoại không có khoảng trắng.';

      const letterMatch = valStr.match(/[a-zA-ZÀ-ỹ]/);
      if (letterMatch) return `Số ĐT không chứa chữ cái '${letterMatch[0]}'.`;

      const specialMatch = valStr.match(/[^0-9a-zA-ZÀ-ỹ]/);
      if (specialMatch) return `Số ĐT không chứa ký tự '${specialMatch[0]}'.`;

      if (valStr.length !== 10) return 'Số ĐT phải gồm đúng 10 chữ số.';
      if (!/^(03|05|07|08|09)/.test(valStr))
        return 'Số ĐT bắt đầu bằng 03,05,07,08,09.';
    }
    if (key === 'dob' && value) {
      const dobDate = new Date(value);
      const today = new Date();
      const age =
        today.getFullYear() -
        dobDate.getFullYear() -
        (today <
        new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate())
          ? 1
          : 0);
      if (age < 13) return 'Bạn phải từ 13 tuổi trở lên để sử dụng dịch vụ.';
    }
    return '';
  };

  const validateProfile = () => {
    const errs = {};
    const activeFields =
      modalMode === 'edit' ? profileFields : allProfileFields;
    const hasField = (key) => activeFields.some((f) => f.dataKey === key);

    ['fullName', 'email', 'phone', 'dob'].forEach((key) => {
      if (hasField(key)) {
        const err = validateField(key, tempProfileData[key]);
        if (err) errs[key] = err;
      }
    });

    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Chuyển đổi ngày sinh: DD-MM-YYYY hoặc YYYY-MM-DD → LocalDate (YYYY-MM-DD) cho backend
  const toIsoDate = (value) => {
    if (!value) return null;
    // Nếu đã là dạng YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // Nếu dạng DD-MM-YYYY (input type=date trả về YYYY-MM-DD, nhưng rawDob có thể khác)
    const dmyMatch = String(value).match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    // Thử parse ISO string có timestamp
    const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    return null;
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileStatus, setSaveProfileStatus] = useState(null); // null | 'success' | 'error'
  const [saveProfileError, setSaveProfileError] = useState('');

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    setSaveProfileStatus(null);
    setSaveProfileError('');
    setIsSavingProfile(true);

    try {
      const payload = {
        fullName: tempProfileData.fullName?.trim(),
        phoneNumber: tempProfileData.phone?.trim() || undefined,
        dateOfBirth: toIsoDate(tempProfileData.dob) || undefined,
      };

      const updatedUser = await updateProfile(payload);

      // Cập nhật local state từ server response
      setProfileUser((prev) => ({
        ...prev,
        fullName: updatedUser.fullName ?? prev.fullName,
        phoneNumber: updatedUser.phoneNumber ?? prev.phoneNumber,
        phone: updatedUser.phoneNumber ?? prev.phone,
        dateOfBirth: updatedUser.dateOfBirth ?? prev.dateOfBirth,
      }));

      setProfileErrors({});
      setIsAddInfoModalOpen(false);
      setSuccessToast('Cập nhật hồ sơ thành công!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Cập nhật thất bại. Vui lòng thử lại.';
      setSaveProfileError(msg);
      setSaveProfileStatus('error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);

  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  useState(false);
  const [changePinForm, setChangePinForm] = useState({
    otp: ['', '', '', '', '', ''],
    currentPin: ['', '', '', '', '', ''],
    newPin: ['', '', '', '', '', ''],
    confirmNewPin: ['', '', '', '', '', ''],
  });
  const [changePinError, setChangePinError] = useState('');
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  useRef([]);
  const currentPinRefs = useRef([]);
  const newPinRefs = useRef([]);
  const confirmNewPinRefs = useRef([]);

  useState(false);

  const handleCPinChange = (field, idx, val, refs) => {
    if (!/^[0-9]?$/.test(val)) return;
    setChangePinForm((prev) => {
      const nextArr = [...prev[field]];
      nextArr[idx] = val;
      const newState = { ...prev, [field]: nextArr };
      if (field === 'newPin' || field === 'confirmNewPin') {
        const np = newState.newPin.join('');
        const cnp = newState.confirmNewPin.join('');
        if (np.length === 6 && cnp.length === 6 && np !== cnp) {
          setTimeout(
            () => setChangePinError('Xác nhận mã PIN mới không khớp'),
            0
          );
        } else {
          setTimeout(() => setChangePinError(''), 0);
        }
      } else if (field === 'otp' && newState.otp.join('').length === 6) {
        setTimeout(() => {
          apiPost('/users/pin/verify-otp', { otp: newState.otp.join('') })
            .then(() => setChangePinError(''))
            .catch((err) =>
              setChangePinError(err.message || 'Mã OTP không chính xác')
            );
        }, 0);
      } else {
        setTimeout(() => setChangePinError(''), 0);
      }
      return newState;
    });
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleCPinKeyDown = (field, idx, e, refs) => {
    if (e.key === 'Backspace' && !changePinForm[field][idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleCPinPaste = (field, e, refs) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      const chars = text.split('');
      const nextArr = Array(6).fill('');
      chars.forEach((c, i) => {
        if (i < 6) nextArr[i] = c;
      });
      setChangePinForm((prev) => ({ ...prev, [field]: nextArr }));
      refs.current[Math.min(chars.length - 1, 5)]?.focus();
    }
    e.preventDefault();
  };

  const submitChangePin = async () => {
    const cp = changePinForm.currentPin.join('');
    const np = changePinForm.newPin.join('');
    const cnp = changePinForm.confirmNewPin.join('');

    if (cp.length < 6) {
      setChangePinError('Vui lòng nhập đủ 6 số cho mã PIN hiện tại');
      return;
    }
    if (np.length < 6) {
      setChangePinError('Vui lòng nhập đủ 6 số cho mã PIN mới');
      return;
    }
    if (np !== cnp) {
      setChangePinError('Xác nhận mã PIN mới không khớp');
      return;
    }

    try {
      setIsSubmittingPinChange(true);
      await apiPost('/users/pin/change', {
        oldPin: cp,
        newPin: np,
        confirmPin: cnp,
      });
      localStorage.setItem('user-pin', np);
      setChangePinError('');
      setIsChangePinModalOpen(false);
      setChangePinForm({
        otp: ['', '', '', '', '', ''],
        currentPin: ['', '', '', '', '', ''],
        newPin: ['', '', '', '', '', ''],
        confirmNewPin: ['', '', '', '', '', ''],
      });
      setSuccessToast('Đặt lại mã PIN thành công!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (error) {
      setChangePinError(error.message || 'Lỗi khi đổi mã PIN.');
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  const handleChangePassword = async () => {
    const cp = passwordForm.currentPassword || '';
    const np = passwordForm.newPassword || '';
    const cnp = passwordForm.confirmNewPassword || '';

    if (!cp) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (/^\s/.test(cp)) {
      setPasswordError('Mật khẩu không được chứa khoảng trắng ở đầu.');
      return;
    }
    if (/\s$/.test(cp)) {
      setPasswordError('Mật khẩu không được chứa khoảng trắng ở cuối.');
      return;
    }

    if (!np) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (/^\s/.test(np)) {
      setPasswordError('Mật khẩu không được chứa khoảng trắng ở đầu.');
      return;
    }
    if (/\s$/.test(np)) {
      setPasswordError('Mật khẩu không được chứa khoảng trắng ở cuối.');
      return;
    }
    if (np.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (!/[A-Z]/.test(np)) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 chữ hoa.');
      return;
    }
    if (!/[a-z]/.test(np)) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 chữ thường.');
      return;
    }
    if (!/[0-9]/.test(np)) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 chữ số.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(np)) {
      setPasswordError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.');
      return;
    }

    if (!cnp) {
      setPasswordError('Vui lòng nhập lại mật khẩu mới.');
      return;
    }
    if (np !== cnp) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    try {
      await apiPost('/users/change-password', {
        oldPassword: cp,
        newPassword: np,
        confirmPassword: cnp,
      });
      setPasswordError('');
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setSuccessToast('Đổi mật khẩu thành công!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      const rawMsg = err?.response?.data?.message || err?.message || '';
      let msg = 'Lỗi khi đổi mật khẩu.';
      if (
        rawMsg.toLowerCase().includes('old') ||
        rawMsg.toLowerCase().includes('cũ') ||
        rawMsg.toLowerCase().includes('incorrect')
      ) {
        msg = 'Mật khẩu cũ không chính xác.';
      } else if (rawMsg) {
        msg = rawMsg;
      }
      setPasswordError(msg);
    }
  };

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadAvatarError, setUploadAvatarError] = useState('');
  const fileInputRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/home');
  };

  const menuItems = [
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'person' },
    { id: 'security-activities', label: 'Lịch sử hoạt động', icon: 'history' },
    { id: 'change-pin', label: 'Đặt lại mã PIN', icon: 'pin' },
  ];

  return (
    <div
      className={`membership-profile-page membership-profile-page--vip-${tier.level} ${getMembershipClass(tier.level)} flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black antialiased text-[#111827] dark:text-white font-sans relative`}
    >
      {successToast && (
        <div className="fixed top-6 right-6 z-[9999] bg-green-500 text-[#111827] dark:text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-green-400/30 font-semibold text-[14px] animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined">check_circle</span>
          {successToast}
        </div>
      )}
      <Header />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-8 pb-16 md:px-8 xl:px-12">
          {/* Page Title */}
          <div className="membership-profile-heading flex items-center justify-between mb-8 border-b border-gray-200 dark:border-white/10 pb-4">
            <h1 className="membership-profile-page-title text-2xl md:text-[28px] font-black uppercase tracking-wider text-[#111827] dark:text-white">
              TÀI KHOẢN THÀNH VIÊN
            </h1>
            <button
              onClick={() => navigate('/home')}
              className="membership-profile-home-button flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-[14px] whitespace-nowrap bg-white dark:bg-transparent"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Trang chủ
            </button>
          </div>

          {/* ===== MAIN LAYOUT: Flattened Grid ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-stretch">
            {/* ROW 1, COL 1: Avatar box */}
            <div className="membership-profile-identity-panel rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden h-full flex flex-col justify-center">
              <div className="flex flex-col items-center p-6">
                <div
                  className="relative cursor-pointer group mb-4"
                  onClick={() => {
                    setTempAvatar(currentAvatar);
                    setIsAvatarModalOpen(true);
                  }}
                >
                  <div
                    className={`membership-profile-avatar-frame ${getMembershipClass(tier.level)} relative h-[96px] w-[96px] rounded-full overflow-hidden border-2`}
                  >
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover transition duration-300 group-hover:brightness-50"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`${currentAvatar ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gray-100 dark:bg-[#18181b] text-3xl font-black text-gray-700 dark:text-white`}
                    >
                      {getInitials(displayName)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                      <span className="material-symbols-outlined text-white text-[28px]">
                        photo_camera
                      </span>
                    </div>
                  </div>
                </div>

                <h2 className="membership-profile-user-name text-[17px] font-black text-[#111827] dark:text-white text-center leading-tight">
                  {displayName}
                </h2>
                <span
                  className={`membership-tier-chip ${getMembershipClass(tier.level)} mt-2 rounded-full border px-3 py-1 text-[10px] font-black tracking-wider`}
                >
                  {tier.name}
                </span>
              </div>
            </div>

            {/* ROW 1, COL 2: Membership Banner */}
            <MembershipCard
              tier={tier}
              tiers={membershipTiers}
              spending={displaySpending}
              points={displayPoints}
              memberPoints={displayMemberPoints}
              className="h-full"
            />

            {/* ROW 2, COL 1: NAVIGATION MENU */}
            <div className="membership-profile-nav-panel rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden flex flex-col h-full lg:col-start-1">
              <div className="px-5 py-5 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1 whitespace-nowrap truncate">
                      Hạng thành viên
                    </p>
                    <p
                      className={`membership-tier-value ${getMembershipClass(tier.level)} text-[15px] font-black whitespace-nowrap truncate`}
                    >
                      {tier.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600 mb-1 whitespace-nowrap">
                      Điểm tích lũy
                    </p>
                    <p
                      className={`membership-tier-value ${getMembershipClass(tier.level)} text-[18px] font-black whitespace-nowrap`}
                    >
                      {displayMemberPoints.toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
              <nav className="p-2 flex flex-col flex-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'change-pin') {
                        setChangePinForm({
                          otp: ['', '', '', '', '', ''],
                          currentPin: ['', '', '', '', '', ''],
                          newPin: ['', '', '', '', '', ''],
                          confirmNewPin: ['', '', '', '', '', ''],
                        });
                        setChangePinError('');
                        setIsChangePinModalOpen(true);
                      } else {
                        setSearchParams({ tab: item.id });
                      }
                    }}
                    className={`membership-profile-nav-item ${(item.id === 'change-pin' ? isChangePinModalOpen : activeSection === item.id) ? 'is-active' : ''} w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                      (
                        item.id === 'change-pin'
                          ? isChangePinModalOpen
                          : activeSection === item.id
                      )
                        ? 'bg-[#e61a27]/15 text-[#e61a27] border border-[#e61a27]/20'
                        : 'text-gray-600 dark:text-[#9D9D9D] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#111827] dark:hover:text-white'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${(item.id === 'change-pin' ? isChangePinModalOpen : activeSection === item.id) ? 'text-[#e61a27]' : 'text-[#52525b]'}`}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}

                {hasPasswordAuth && (
                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-gray-600 dark:text-[#9D9D9D] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#111827] dark:hover:text-[#111827] dark:text-white transition-all duration-200 mt-2"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#52525b]">
                      lock_reset
                    </span>
                    Đổi mật khẩu
                  </button>
                )}

                <div className="mx-3 my-2 h-px bg-gray-200 dark:bg-white/[0.05] mt-auto" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-[#ff5757] hover:bg-[#ff5757]/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    logout
                  </span>
                  Đăng xuất
                </button>
              </nav>
            </div>

            {/* ROW 2, COL 2: Profile / History / Rewards Detail */}
            <div className="w-full flex flex-col gap-6 h-full lg:col-start-2">
              {activeSection === 'profile' && (
                <div className="membership-profile-content-panel rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none flex-1">
                  {/* Section Header */}
                  <div className="membership-profile-content-header flex items-center gap-3 px-7 py-5 border-b border-gray-200 dark:border-white/10">
                    <span className="membership-profile-section-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[#e61a27]/15">
                      <span className="material-symbols-outlined text-[18px] text-[#e61a27]">
                        assignment_ind
                      </span>
                    </span>
                    <h2 className="text-[15px] font-black uppercase tracking-wider text-[#111827] dark:text-white">
                      Chi Tiết Cá Nhân
                    </h2>

                    <button
                      onClick={() => {
                        setModalMode('addInfo');
                        setIsAddInfoModalOpen(true);
                      }}
                      className="membership-profile-edit-button ml-auto flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-bold text-[#e61a27] border border-[#e61a27]/20 hover:bg-[#e61a27]/10 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        add_circle
                      </span>
                      BỔ SUNG THÔNG TIN
                    </button>
                  </div>

                  {/* ---- VIEW MODE ---- */}
                  <div className="p-7 flex flex-col gap-6">
                    {(() => {
                      const row1Fields = ['fullName', 'dob', 'phone']
                        .map((id) => profileFields.find((f) => f.id === id))
                        .filter(Boolean);
                      if (row1Fields.length === 0) return null;
                      const gridColsClass =
                        row1Fields.length === 3
                          ? 'md:grid-cols-3'
                          : 'md:grid-cols-2';
                      return (
                        <div
                          className={`grid grid-cols-1 ${gridColsClass} gap-x-10 gap-y-6`}
                        >
                          {row1Fields.map((field) => {
                            const {
                              id,
                              label,
                              displayValue,
                              maskedValue,
                              isMaskable,
                              isPassword,
                            } = field;
                            return (
                              <div
                                key={id}
                                className="membership-profile-field border-b border-gray-200 dark:border-white/10 pb-4"
                              >
                                <p className="membership-profile-field-label mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                                  {label}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`membership-profile-field-value text-[15px] font-semibold break-words ${isPassword ? 'text-[#111827] dark:text-[#9D9D9D] tracking-widest' : 'text-[#111827] dark:text-white'}`}
                                  >
                                    {isMaskable
                                      ? visibleFields[id]
                                        ? displayValue
                                        : maskedValue
                                      : displayValue}
                                  </p>
                                  {isMaskable && (
                                    <button
                                      onClick={() =>
                                        setVisibleFields((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        }))
                                      }
                                      className="text-[#111827] dark:text-[#9D9D9D] hover:text-[#111827] dark:hover:text-[#111827] dark:text-white transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        {visibleFields[id]
                                          ? 'visibility_off'
                                          : 'visibility'}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {(() => {
                      const row2Fields = ['username', 'email']
                        .map((id) => profileFields.find((f) => f.id === id))
                        .filter(Boolean);
                      if (row2Fields.length === 0) return null;
                      const gridColsClass =
                        row2Fields.length === 3
                          ? 'md:grid-cols-3'
                          : 'md:grid-cols-2';
                      return (
                        <div
                          className={`grid grid-cols-1 ${gridColsClass} gap-x-10 gap-y-6`}
                        >
                          {row2Fields.map((field) => {
                            const {
                              id,
                              label,
                              displayValue,
                              maskedValue,
                              isMaskable,
                              isPassword,
                            } = field;
                            return (
                              <div
                                key={id}
                                className="membership-profile-field border-b border-gray-200 dark:border-white/10 pb-4"
                              >
                                <p className="membership-profile-field-label mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                                  {label}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`membership-profile-field-value text-[15px] font-semibold break-words ${isPassword ? 'text-[#111827] dark:text-[#9D9D9D] tracking-widest' : 'text-[#111827] dark:text-white'}`}
                                  >
                                    {isMaskable
                                      ? visibleFields[id]
                                        ? displayValue
                                        : maskedValue
                                      : displayValue}
                                  </p>
                                  {isMaskable && (
                                    <button
                                      onClick={() =>
                                        setVisibleFields((prev) => ({
                                          ...prev,
                                          [id]: !prev[id],
                                        }))
                                      }
                                      className="text-[#111827] dark:text-[#9D9D9D] hover:text-[#111827] dark:hover:text-[#111827] dark:text-white transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        {visibleFields[id]
                                          ? 'visibility_off'
                                          : 'visibility'}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Other sections placeholder */}
              {activeSection === 'history' && (
                <div className="membership-profile-content-panel rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none flex-1">
                  <div className="flex items-center gap-3 px-7 py-5 border-b border-gray-200 dark:border-white/10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e61a27]/15">
                      <span className="material-symbols-outlined text-[18px] text-[#e61a27]">
                        confirmation_number
                      </span>
                    </span>
                    <h2 className="text-[15px] font-black uppercase tracking-wider text-[#111827] dark:text-white">
                      Lịch Sử Giao Dịch
                    </h2>
                  </div>
                  <div className="p-7">
                    <div className="flex flex-col gap-4">
                      {mockHistory.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedTicket(item)}
                          className="cursor-pointer group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20 transition-all hover:bg-gray-100 dark:hover:bg-[#222]"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === 'web' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}
                            >
                              <span className="material-symbols-outlined">
                                {item.type === 'web' ? 'play_circle' : 'movie'}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-[15px] font-bold text-[#111827] dark:text-white group-hover:text-[#dc2626] transition-colors">
                                {item.movie}
                              </h3>
                              <p className="text-[13px] text-[#111827] dark:text-[#9D9D9D] mt-1">
                                {item.date} • {item.time} | {item.cinema}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="text-[15px] font-bold text-[#111827] dark:text-white">
                                {item.total.toLocaleString('vi-VN')}đ
                              </p>
                              <p className="text-[11px] text-[#111827] dark:text-[#9D9D9D] font-medium tracking-wide uppercase mt-1">
                                Mã: {item.id}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-[#111827] dark:text-[#9D9D9D] group-hover:text-[#111827] dark:group-hover:text-[#111827] dark:text-white transition-colors">
                              chevron_right
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security-activities' && (
                <div className="membership-profile-content-panel rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 flex-1 p-7">
                  <UserActivityLogTab />
                </div>
              )}

              {/* Removed rewards section */}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ===== AVATAR MODAL ===== */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[480px] rounded-[28px] bg-white dark:bg-[#18181b] p-8 shadow-2xl dark:shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10">
            <h2 className="text-[20px] font-black uppercase text-[#111827] dark:text-white tracking-wide text-center">
              Cập nhật ảnh đại diện
            </h2>
            <p className="mt-1 text-[12px] text-[#111827] dark:text-[#9D9D9D] text-center">
              Tải ảnh từ máy tính
            </p>

            {/* Preview */}
            <div className="mt-6 flex justify-center">
              <div className="relative group">
                <div className="h-[110px] w-[110px] rounded-full overflow-hidden border-4 border-gray-200 dark:border-white/10 shadow-[0_0_24px_rgba(215,117,103,0.15)]">
                  {previewUrl || tempAvatar ? (
                    <img
                      src={previewUrl || tempAvatar}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-[#18181b] text-3xl font-black text-gray-400 dark:text-white">
                      {getInitials(displayName)}
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                      <div className="h-8 w-8 rounded-full border-2 border-gray-200 dark:border-white/20 border-t-[#d77567] animate-spin" />
                    </div>
                  )}
                </div>
                {/* Upload badge */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#d77567] border-2 border-[#1e1e20] shadow-md hover:bg-[#c4685a] transition disabled:opacity-50"
                  title="Chọn ảnh từ máy"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#111827] dark:text-white">
                    upload
                  </span>
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Validate client-side
                if (!file.type.startsWith('image/')) {
                  setUploadAvatarError(
                    'Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP)'
                  );
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  setUploadAvatarError('Ảnh không được vượt quá 5MB');
                  return;
                }
                setUploadAvatarError('');
                setSelectedFile(file);
                // Preview local
                const objectUrl = URL.createObjectURL(file);
                setPreviewUrl(objectUrl);
                setTempAvatar(''); // xoá URL text khi đã chọn file
              }}
            />

            <div className="mt-6 space-y-4">
              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[14px] font-semibold text-[#111827] dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-[#d77567]/50 transition disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px] text-[#d77567]">
                  upload_file
                </span>
                {selectedFile ? (
                  <span className="truncate max-w-[220px] text-[#d77567]">
                    {selectedFile.name}
                  </span>
                ) : (
                  'Tải ảnh từ máy tính'
                )}
              </button>
            </div>

            {/* Error message */}
            {uploadAvatarError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <span className="material-symbols-outlined text-[16px] text-red-400 flex-shrink-0">
                  error
                </span>
                <p className="text-[13px] text-red-400 font-medium">
                  {uploadAvatarError}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setIsAvatarModalOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl('');
                  setUploadAvatarError('');
                }}
                disabled={isUploadingAvatar}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[14px] font-bold text-[#111827] dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                disabled={isUploadingAvatar}
                onClick={async () => {
                  setUploadAvatarError('');
                  if (selectedFile) {
                    // Upload file lên server
                    setIsUploadingAvatar(true);
                    try {
                      const newUrl = await uploadAvatar(selectedFile);
                      setAvatarOverride({
                        identity: avatarIdentity,
                        url: newUrl,
                      });
                      setSelectedFile(null);
                      setPreviewUrl('');
                      setIsAvatarModalOpen(false);
                    } catch (err) {
                      setUploadAvatarError(
                        err.message || 'Upload thất bại. Vui lòng thử lại.'
                      );
                    } finally {
                      setIsUploadingAvatar(false);
                    }
                  } else {
                    // Chỉ dùng URL (hành vi cũ)
                    setAvatarOverride({
                      identity: avatarIdentity,
                      url: tempAvatar,
                    });
                    setIsAvatarModalOpen(false);
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] border border-red-500/30 text-[14px] font-bold text-[#111827] dark:text-white shadow-[0_8px_20px_rgba(127,29,29,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {isUploadingAvatar ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 dark:border-white/20 border-t-white animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  'Xác nhận'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD INFO MODAL ===== */}
      {isAddInfoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[500px] rounded-[28px] bg-white dark:bg-[#18181b] p-8 shadow-2xl dark:shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h2 className="text-[20px] font-black uppercase text-[#111827] dark:text-white tracking-wide text-center">
              Cập nhật hồ sơ
            </h2>
            <p className="mt-2 text-[13px] text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] text-center">
              Chỉnh sửa hoặc bổ sung thông tin cá nhân của bạn
            </p>
            <div className="mt-7 space-y-5">
              {(modalMode === 'edit' ? profileFields : allProfileFields)
                .filter((f) => !f.isPassword && !f.forceHide)
                .map(({ id, dataKey, label, type, icon, readOnly }) => (
                  <div key={id}>
                    <label className="block text-[11px] font-bold text-[#8a8a8e] uppercase tracking-widest mb-2">
                      {label}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#111827] dark:text-[#9D9D9D] text-[20px]">
                        {icon}
                      </span>
                      <input
                        type={type}
                        value={tempProfileData[dataKey] || ''}
                        onChange={(e) => {
                          if (readOnly) return;
                          const val = e.target.value;
                          setTempProfileData({
                            ...tempProfileData,
                            [dataKey]: val,
                          });

                          // Validate ngay lập tức khi đang gõ
                          const err = validateField(dataKey, val);
                          setProfileErrors((prev) => ({
                            ...prev,
                            [dataKey]: err,
                          }));

                          if (saveProfileStatus) setSaveProfileStatus(null);
                        }}
                        onBlur={(e) => {
                          if (readOnly) return;
                          const val = e.target.value;
                          const err = validateField(dataKey, val);
                          setProfileErrors((prev) => ({
                            ...prev,
                            [dataKey]: err,
                          }));
                        }}
                        readOnly={readOnly || isSavingProfile}
                        className={`w-full rounded-2xl bg-gray-50 dark:bg-black border py-3.5 pl-12 pr-4 text-[15px] text-[#111827] dark:text-white font-medium focus:outline-none transition ${type === 'date' ? '[color-scheme:light] dark:[color-scheme:dark]' : ''} ${profileErrors[dataKey] ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-white/10 focus:border-[#d77567]'} ${readOnly || isSavingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {profileErrors[dataKey] && (
                      <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-400">
                        <span className="material-symbols-outlined text-[13px]">
                          error
                        </span>
                        {profileErrors[dataKey]}
                      </span>
                    )}
                  </div>
                ))}
            </div>

            {/* Feedback messages */}
            {saveProfileStatus === 'error' && saveProfileError && (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <span className="material-symbols-outlined text-[16px] text-red-400 flex-shrink-0">
                  error
                </span>
                <p className="text-[13px] text-red-400 font-medium">
                  {saveProfileError}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                disabled={isSavingProfile}
                onClick={() => {
                  setIsAddInfoModalOpen(false);
                  setProfileErrors({});
                  setSaveProfileStatus(null);
                  setSaveProfileError('');
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[14px] font-bold text-[#111827] dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                disabled={isSavingProfile || saveProfileStatus === 'success'}
                onClick={handleSaveProfile}
                className="flex-1 py-3.5 rounded-2xl bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] border border-red-500/30 text-[14px] font-bold text-[#111827] dark:text-white shadow-[0_8px_20px_rgba(127,29,29,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSavingProfile ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 dark:border-white/20 border-t-white animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Xác nhận'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PASSWORD MODAL ===== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[400px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#dc2626] to-transparent"></div>

            <div className="w-12 h-12 rounded-full bg-[#e61a27]/10 border border-[#e61a27]/30 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px] text-[#e61a27]">
                password
              </span>
            </div>

            <h2 className="text-[20px] font-bold text-[#111827] dark:text-white uppercase tracking-wider text-center mb-1">
              Đổi Mật Khẩu
            </h2>
            <p className="text-[#111827] dark:text-[#9D9D9D] text-[10px] uppercase tracking-widest text-center mb-4">
              Nhập mật khẩu hiện tại và mật khẩu mới
            </p>
            <div className="mt-4 space-y-3">
              {[
                {
                  key: 'currentPassword',
                  label: 'Mật khẩu hiện tại',
                  show: showCurrentPassword,
                  setShow: setShowCurrentPassword,
                },
                {
                  key: 'newPassword',
                  label: 'Mật khẩu mới',
                  show: showNewPassword,
                  setShow: setShowNewPassword,
                },
                {
                  key: 'confirmNewPassword',
                  label: 'Xác nhận mật khẩu mới',
                  show: showConfirmPassword,
                  setShow: setShowConfirmPassword,
                },
              ].map(({ key, label, show, setShow }) => (
                <div key={key}>
                  <label className="block text-[10px] text-[#111827] dark:text-[#9D9D9D] uppercase tracking-widest mb-2 px-1">
                    {label}
                  </label>
                  <div className="relative">
                    <span
                      className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] ${
                        passwordError &&
                        ((key === 'currentPassword' &&
                          (passwordError.toLowerCase().includes('hiện tại') ||
                            passwordError.toLowerCase().includes('cũ'))) ||
                          ((key === 'newPassword' ||
                            key === 'confirmNewPassword') &&
                            passwordError.toLowerCase().includes('khớp')) ||
                          (key === 'newPassword' &&
                            passwordError.toLowerCase().includes('mới') &&
                            !passwordError.toLowerCase().includes('khớp')) ||
                          (key === 'confirmNewPassword' &&
                            passwordError.toLowerCase().includes('xác nhận')) ||
                          (!passwordError.toLowerCase().includes('hiện tại') &&
                            !passwordError.toLowerCase().includes('cũ') &&
                            !passwordError.toLowerCase().includes('khớp') &&
                            !passwordError.toLowerCase().includes('mới') &&
                            !passwordError.toLowerCase().includes('xác nhận')))
                          ? 'text-red-500'
                          : 'text-[#111827] dark:text-[#9D9D9D]'
                      }`}
                    >
                      lock
                    </span>
                    <input
                      type={show ? 'text' : 'password'}
                      name={key}
                      value={passwordForm[key]}
                      onFocus={() =>
                        key === 'newPassword' && setIsNewPasswordFocused(true)
                      }
                      onBlur={() =>
                        key === 'newPassword' && setIsNewPasswordFocused(false)
                      }
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      className={`w-full rounded-xl bg-gray-50 dark:bg-[#0d0d0d] border py-3.5 pl-12 pr-12 text-[15px] text-[#111827] dark:text-white font-medium transition-colors focus:outline-none focus:ring-1 ${
                        passwordError &&
                        ((key === 'currentPassword' &&
                          (passwordError.toLowerCase().includes('hiện tại') ||
                            passwordError.toLowerCase().includes('cũ'))) ||
                          ((key === 'newPassword' ||
                            key === 'confirmNewPassword') &&
                            passwordError.toLowerCase().includes('khớp')) ||
                          (key === 'newPassword' &&
                            passwordError.toLowerCase().includes('mới') &&
                            !passwordError.toLowerCase().includes('khớp')) ||
                          (key === 'confirmNewPassword' &&
                            passwordError.toLowerCase().includes('xác nhận')) ||
                          (!passwordError.toLowerCase().includes('hiện tại') &&
                            !passwordError.toLowerCase().includes('cũ') &&
                            !passwordError.toLowerCase().includes('khớp') &&
                            !passwordError.toLowerCase().includes('mới') &&
                            !passwordError.toLowerCase().includes('xác nhận')))
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-200 dark:border-white/10 focus:border-[#e61a27] focus:ring-[#e61a27]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111827] dark:text-[#9D9D9D] hover:text-[#111827] dark:hover:text-[#111827] dark:text-white transition"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {show ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {key === 'newPassword' &&
                    (isNewPasswordFocused ||
                      passwordForm.newPassword.length > 0) && (
                      <div className="mt-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3">
                        <ul className="space-y-1.5 text-[11px] font-medium">
                          <li
                            className={`flex items-center gap-2 ${passwordForm.newPassword.length >= 8 ? 'text-green-500' : 'text-[#111827] dark:text-[#9D9D9D]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>{' '}
                            Ít nhất 8 ký tự
                          </li>
                          <li
                            className={`flex items-center gap-2 ${/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-500' : 'text-[#111827] dark:text-[#9D9D9D]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>{' '}
                            Có chữ hoa
                          </li>
                          <li
                            className={`flex items-center gap-2 ${/[a-z]/.test(passwordForm.newPassword) ? 'text-green-500' : 'text-[#111827] dark:text-[#9D9D9D]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>{' '}
                            Có chữ thường
                          </li>
                          <li
                            className={`flex items-center gap-2 ${/[0-9]/.test(passwordForm.newPassword) ? 'text-green-500' : 'text-[#111827] dark:text-[#9D9D9D]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>{' '}
                            Có số
                          </li>
                          <li
                            className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? 'text-green-500' : 'text-[#111827] dark:text-[#9D9D9D]'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>{' '}
                            Có ký tự đặc biệt
                          </li>
                        </ul>
                      </div>
                    )}
                </div>
              ))}
            </div>

            {passwordError && (
              <p className="mt-3 text-[11px] text-[#ff5757] font-semibold text-center">
                {passwordError}
              </p>
            )}

            <div className="mt-3 flex justify-end items-center px-2">
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  navigate('/login/forgot-password');
                }}
                className="text-[10px] font-bold text-[#e61a27] hover:text-[#ff4d5a] transition uppercase tracking-widest"
              >
                Quên mật khẩu?
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={handleChangePassword}
                className="w-full bg-[#e61a27] hover:bg-[#ff1a27] text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 uppercase tracking-widest shadow-[0_10px_20px_rgba(230,26,39,0.3)] hover:shadow-[0_15px_30px_rgba(230,26,39,0.5)] transition-all text-sm"
              >
                Đổi mật khẩu{' '}
                <span className="material-symbols-outlined text-[18px]">
                  key
                </span>
              </button>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                  });
                  setPasswordError('');
                }}
                className="text-[#111827] dark:text-[#9D9D9D] text-xs uppercase tracking-widest hover:text-[#111827] dark:hover:text-[#111827] dark:text-white transition-colors text-center"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHANGE PIN MODAL ===== */}
      {isChangePinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[400px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#dc2626] to-transparent"></div>

            <div className="w-12 h-12 rounded-full bg-[#e61a27]/10 border border-[#e61a27]/30 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px] text-[#e61a27]">
                lock_reset
              </span>
            </div>

            <h2 className="text-[20px] font-bold text-gray-900 dark:text-white uppercase tracking-wider text-center mb-1">
              Đổi Mã PIN
            </h2>
            <p className="text-gray-500 dark:text-[#9D9D9D] text-[10px] uppercase tracking-widest text-center mb-4">
              Nhập mã PIN hiện tại và mã PIN mới
            </p>
            <div className="mt-4 space-y-3">
              {[
                {
                  key: 'currentPin',
                  label: 'Mã PIN hiện tại',
                  refs: currentPinRefs,
                },
                { key: 'newPin', label: 'Mã PIN mới', refs: newPinRefs },
                {
                  key: 'confirmNewPin',
                  label: 'Xác nhận mã PIN mới',
                  refs: confirmNewPinRefs,
                },
              ].map(({ key, label, refs, action }) => (
                <div key={key}>
                  <div className="flex justify-between items-end mb-2 px-1">
                    <label className="block text-[10px] text-gray-600 dark:text-[#9D9D9D] uppercase tracking-widest">
                      {label}
                    </label>
                    {action && action}
                  </div>
                  <div
                    className="flex justify-center gap-3"
                    onPaste={(e) => handleCPinPaste(key, e, refs)}
                  >
                    {changePinForm[key].map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (refs.current[idx] = el)}
                        type={key === 'otp' ? 'text' : 'password'}
                        autoComplete="new-password"
                        name={`pin-${key}-${idx}`}
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          handleCPinChange(key, idx, e.target.value, refs);
                        }}
                        onKeyDown={(e) => handleCPinKeyDown(key, idx, e, refs)}
                        className={`w-9 h-11 sm:w-11 sm:h-12 bg-gray-50 dark:bg-[#0d0d0d] rounded-lg text-center text-xl font-bold outline-none transition-all duration-200 border uppercase
                          ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'}
                          ${
                            changePinError &&
                            ((key === 'currentPin' &&
                              (changePinError
                                .toLowerCase()
                                .includes('hiện tại') ||
                                changePinError.toLowerCase().includes('cũ'))) ||
                              (key === 'otp' &&
                                changePinError.toLowerCase().includes('otp')) ||
                              ((key === 'newPin' || key === 'confirmNewPin') &&
                                changePinError
                                  .toLowerCase()
                                  .includes('khớp')) ||
                              (key === 'newPin' &&
                                changePinError.toLowerCase().includes('mới') &&
                                !changePinError
                                  .toLowerCase()
                                  .includes('khớp')) ||
                              (key === 'confirmNewPin' &&
                                changePinError
                                  .toLowerCase()
                                  .includes('xác nhận')) ||
                              (!changePinError
                                .toLowerCase()
                                .includes('hiện tại') &&
                                !changePinError.toLowerCase().includes('cũ') &&
                                !changePinError.toLowerCase().includes('otp') &&
                                !changePinError
                                  .toLowerCase()
                                  .includes('khớp') &&
                                !changePinError.toLowerCase().includes('mới') &&
                                !changePinError
                                  .toLowerCase()
                                  .includes('xác nhận')))
                              ? '!border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.2)] ring-1 ring-red-500/50'
                              : ''
                          }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {changePinError && (
              <p className="mt-3 text-[11px] text-[#ff5757] font-semibold text-center">
                {changePinError}
              </p>
            )}

            <div className="mt-3 flex justify-end items-center px-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangePinModalOpen(false);
                  navigate('/login/forgot-pin');
                }}
                className="text-[10px] font-bold text-[#e61a27] hover:text-[#ff4d5a] transition uppercase tracking-widest"
              >
                Quên mã PIN?
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={submitChangePin}
                disabled={isSubmittingPinChange}
                className="w-full bg-[#e61a27] hover:bg-[#ff1a27] text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 uppercase tracking-widest shadow-[0_10px_20px_rgba(230,26,39,0.3)] hover:shadow-[0_15px_30px_rgba(230,26,39,0.5)] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingPinChange ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đổi mã PIN{' '}
                    <span className="material-symbols-outlined text-[18px]">
                      lock_reset
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsChangePinModalOpen(false);
                  setChangePinForm({
                    otp: ['', '', '', '', '', ''],
                    currentPin: ['', '', '', '', '', ''],
                    newPin: ['', '', '', '', '', ''],
                    confirmNewPin: ['', '', '', '', '', ''],
                  });
                  setChangePinError('');
                }}
                className="text-gray-600 dark:text-[#9D9D9D] text-xs uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-colors text-center"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRANSACTION PIN MODAL ===== */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[480px] rounded-[28px] bg-white dark:bg-[#18181b] p-8 shadow-2xl dark:shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10 relative">
            {/* Title & Close header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[20px] font-black uppercase text-[#111827] dark:text-white tracking-wide text-center w-full">
                Lấy Lại Mã PIN
              </h2>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="absolute right-6 top-6 text-[#111827] dark:text-[#9D9D9D] hover:text-[#dc2626] dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
            <p className="mb-6 text-[13px] text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] text-center">
              Xác thực tài khoản và thiết lập mã PIN giao dịch mới
            </p>

            {/* Stepper Indicators */}
            <div className="flex justify-between items-center mb-8 relative px-4">
              <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-gray-200 dark:bg-white/10 -translate-y-1/2 z-0"></div>
              <div
                className="absolute left-6 top-1/2 h-0.5 bg-[#e61a27] -translate-y-1/2 z-0 transition-all duration-300"
                style={{ width: `${(recoverStep - 1) * 41}%` }}
              ></div>

              {[
                { step: 1, label: 'Gửi Email' },
                { step: 2, label: 'Nhập OTP' },
                { step: 3, label: 'Đặt mã PIN' },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center z-10 relative"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                      recoverStep >= item.step
                        ? 'bg-[#e61a27] border-[#e61a27] text-white shadow-[0_0_10px_rgba(230,26,39,0.4)]'
                        : 'bg-gray-50 dark:bg-[#18181b] border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#9D9D9D]'
                    }`}
                  >
                    {item.step}
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider mt-2 transition-colors ${recoverStep >= item.step ? 'text-[#111827] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D]'}`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Send Verification Email */}
            {recoverStep === 1 && (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] text-center leading-relaxed">
                  Hệ thống sẽ gửi một mã xác nhận OTP tới địa chỉ email đăng ký
                  của bạn để xác thực tài khoản.
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#9D9D9D] mb-2">
                    Email Đăng Ký
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    disabled={true}
                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 disabled:opacity-60 rounded-2xl px-4 py-3.5 text-[15px] text-[#111827] dark:text-white focus:outline-none focus:border-[#d77567]"
                  />
                </div>
                {recoveryError && (
                  <p className="text-xs text-[#ff5757] font-semibold text-center">
                    {recoveryError}
                  </p>
                )}

                <button
                  onClick={async () => {
                    if (!recoveryEmail) {
                      setRecoveryError('Không tìm thấy email của bạn.');
                      return;
                    }
                    setEmailSending(true);
                    setRecoveryError('');
                    try {
                      await apiPost('/users/pin/forgot', {
                        email: recoveryEmail,
                      });
                      setEmailSending(false);
                      setOtpTimer(60);
                      setRecoverStep(2);
                    } catch (error) {
                      setEmailSending(false);
                      setRecoveryError(
                        error.message || 'Lỗi khi gửi email OTP.'
                      );
                    }
                  }}
                  disabled={emailSending}
                  className="w-full bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] border border-red-500/30 text-[14px] font-bold py-3.5 rounded-2xl transition-all shadow-[0_8px_20px_rgba(127,29,29,0.4)] hover:-translate-y-0.5 text-[#111827] dark:text-white flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-200 dark:border-white/20 border-t-white animate-spin" />
                      Đang gửi email...
                    </>
                  ) : (
                    'Gửi email xác nhận'
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Enter OTP */}
            {recoverStep === 2 && (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] text-center leading-relaxed">
                  Vui lòng nhập mã xác thực OTP đã được gửi đến email đăng ký
                  của bạn.
                </p>

                <div className="flex flex-col items-center">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#9D9D9D] mb-4">
                    Nhập mã OTP
                  </label>
                  <div className="flex justify-center gap-2 md:gap-3">
                    {recoveryOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!/^\d*$/.test(value)) return;
                          const newOtp = [...recoveryOtp];
                          newOtp[idx] = value.slice(-1);
                          setRecoveryOtp(newOtp);
                          setRecoveryError('');
                          if (value && idx < 5)
                            otpInputsRef.current[idx + 1]?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            if (!recoveryOtp[idx] && idx > 0) {
                              otpInputsRef.current[idx - 1]?.focus();
                            } else {
                              const newOtp = [...recoveryOtp];
                              newOtp[idx] = '';
                              setRecoveryOtp(newOtp);
                            }
                          } else if (e.key === 'ArrowLeft' && idx > 0) {
                            otpInputsRef.current[idx - 1]?.focus();
                          } else if (e.key === 'ArrowRight' && idx < 5) {
                            otpInputsRef.current[idx + 1]?.focus();
                          }
                        }}
                        className="w-10 h-12 text-center text-xl font-bold bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg text-[#111827] dark:text-white focus:outline-none focus:border-[#d77567] focus:ring-1 focus:ring-[#d77567] transition-all"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                </div>
                {recoveryError && (
                  <p className="text-xs text-[#ff5757] font-semibold text-center">
                    {recoveryError}
                  </p>
                )}

                <div className="flex justify-center mt-2">
                  {otpTimer > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#111827] dark:text-[#9D9D9D] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full font-medium">
                      <span className="material-symbols-outlined text-[15px] animate-pulse">
                        schedule
                      </span>
                      Gửi lại sau{' '}
                      <span className="text-[#e61a27] font-bold">
                        {otpTimer}s
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setRecoveryOtp(['', '', '', '', '', '']);
                        setRecoveryError('');
                        setEmailSending(true);
                        try {
                          await apiPost('/users/pin/forgot', {
                            email: recoveryEmail,
                          });
                          setEmailSending(false);
                          setOtpTimer(60);
                        } catch (error) {
                          setEmailSending(false);
                          setRecoveryError(
                            error.message || 'Lỗi khi gửi lại email OTP.'
                          );
                        }
                      }}
                      disabled={emailSending}
                      className="flex items-center gap-1.5 text-xs text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] hover:text-[#111827] dark:hover:text-white bg-[#e61a27]/10 hover:bg-[#e61a27]/20 border border-[#e61a27]/30 px-4 py-2 rounded-full transition-all font-semibold"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        refresh
                      </span>
                      GỬI LẠI MÃ OTP
                    </button>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setRecoverStep(1);
                      setRecoveryError('');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_back
                    </span>
                    Quay lại
                  </button>

                  <button
                    onClick={() => {
                      const enteredOtp = recoveryOtp.join('');
                      if (enteredOtp.length < 6) {
                        setRecoveryError('Vui lòng nhập đủ 6 số mã OTP.');
                        return;
                      }
                      setRecoverStep(3);
                      setRecoveryError('');
                      setNewPinDigits(['', '', '', '', '', '']);
                      setConfirmPinDigits(['', '', '', '', '', '']);
                    }}
                    className="flex-1 bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] border border-red-500/30 text-[14px] font-bold py-3.5 rounded-2xl transition-all shadow-[0_8px_20px_rgba(127,29,29,0.4)] text-[#111827] dark:text-white uppercase tracking-wider text-xs"
                  >
                    Tiếp theo
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Set New PIN */}
            {recoverStep === 3 && (
              <div className="flex flex-col gap-6">
                <p className="text-sm text-gray-500 dark:text-[#9D9D9D] text-center leading-relaxed">
                  Đặt mã PIN giao dịch mới của bạn (gồm 6 chữ số).
                </p>

                <div className="flex flex-col gap-5">
                  {/* New PIN Input Row */}
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Nhập mã PIN mới
                    </label>
                    <div className="flex justify-center gap-2 md:gap-3">
                      {newPinDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (recoverPinInputsRef.current[idx] = el)}
                          type={
                            activePinFocus === `recoverPin-${idx}` ||
                            revealedPin === `recoverPin-${idx}`
                              ? 'text'
                              : 'password'
                          }
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onFocus={() => setActivePinFocus(`recoverPin-${idx}`)}
                          onBlur={() => setActivePinFocus(null)}
                          onChange={(e) => {
                            setRevealedPin(`recoverPin-${idx}`);
                            if (window.revealTimeout)
                              clearTimeout(window.revealTimeout);
                            window.revealTimeout = setTimeout(
                              () => setRevealedPin(null),
                              400
                            );
                            const value = e.target.value;
                            if (!/^\d*$/.test(value)) return;
                            const newDigits = [...newPinDigits];
                            newDigits[idx] = value.slice(-1);
                            setNewPinDigits(newDigits);
                            setRecoveryError('');
                            if (value && idx < 5)
                              recoverPinInputsRef.current[idx + 1]?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (!newPinDigits[idx] && idx > 0) {
                                recoverPinInputsRef.current[idx - 1]?.focus();
                              } else {
                                const newDigits = [...newPinDigits];
                                newDigits[idx] = '';
                                setNewPinDigits(newDigits);
                              }
                            } else if (e.key === 'ArrowLeft' && idx > 0) {
                              recoverPinInputsRef.current[idx - 1]?.focus();
                            } else if (e.key === 'ArrowRight' && idx < 5) {
                              recoverPinInputsRef.current[idx + 1]?.focus();
                            }
                          }}
                          className="w-9 h-11 text-center text-lg font-bold bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg text-[#111827] dark:text-white focus:outline-none focus:border-[#d77567] focus:ring-1 focus:ring-[#d77567] transition-all"
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Confirm PIN Input Row */}
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Nhập lại mã PIN
                    </label>
                    <div className="flex justify-center gap-2 md:gap-3">
                      {confirmPinDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (confirmPinInputsRef.current[idx] = el)}
                          type={
                            activePinFocus === `confirmRecoverPin-${idx}` ||
                            revealedPin === `confirmRecoverPin-${idx}`
                              ? 'text'
                              : 'password'
                          }
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onFocus={() =>
                            setActivePinFocus(`confirmRecoverPin-${idx}`)
                          }
                          onBlur={() => setActivePinFocus(null)}
                          onChange={(e) => {
                            setRevealedPin(`confirmRecoverPin-${idx}`);
                            if (window.revealTimeout)
                              clearTimeout(window.revealTimeout);
                            window.revealTimeout = setTimeout(
                              () => setRevealedPin(null),
                              400
                            );
                            const value = e.target.value;
                            if (!/^\d*$/.test(value)) return;
                            const newDigits = [...confirmPinDigits];
                            newDigits[idx] = value.slice(-1);
                            setConfirmPinDigits(newDigits);
                            setRecoveryError('');
                            if (value && idx < 5)
                              confirmPinInputsRef.current[idx + 1]?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (!confirmPinDigits[idx] && idx > 0) {
                                confirmPinInputsRef.current[idx - 1]?.focus();
                              } else {
                                const newDigits = [...confirmPinDigits];
                                newDigits[idx] = '';
                                confirmPinInputsRef.current[idx]?.focus();
                              }
                            } else if (e.key === 'ArrowLeft' && idx > 0) {
                              confirmPinInputsRef.current[idx - 1]?.focus();
                            } else if (e.key === 'ArrowRight' && idx < 5) {
                              confirmPinInputsRef.current[idx + 1]?.focus();
                            }
                          }}
                          className="w-9 h-11 text-center text-lg font-bold bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg text-[#111827] dark:text-white focus:outline-none focus:border-[#d77567] focus:ring-1 focus:ring-[#d77567] transition-all"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {recoveryError && (
                  <p className="text-xs text-[#ff5757] font-semibold text-center">
                    {recoveryError}
                  </p>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setRecoverStep(2);
                      setRecoveryError('');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_back
                    </span>
                    Quay lại
                  </button>

                  <button
                    onClick={async () => {
                      const pin1 = newPinDigits.join('');
                      const pin2 = confirmPinDigits.join('');
                      if (pin1.length < 6 || pin2.length < 6) {
                        setRecoveryError('Vui lòng nhập đủ 6 số cho cả hai ô.');
                        return;
                      }
                      if (pin1 !== pin2) {
                        setRecoveryError(
                          'Mã PIN xác nhận không khớp. Vui lòng nhập lại.'
                        );
                        setConfirmPinDigits(['', '', '', '', '', '']);
                        setTimeout(
                          () => confirmPinInputsRef.current[0]?.focus(),
                          10
                        );
                        return;
                      }

                      try {
                        const enteredOtp = recoveryOtp.join('');
                        await apiPost('/users/pin/reset', {
                          email: recoveryEmail,
                          otp: enteredOtp,
                          newPin: pin1,
                          confirmPin: pin2,
                        });

                        localStorage.setItem('user-pin', pin1);
                        setSuccessToast('Đổi mã PIN giao dịch thành công!');
                        setTimeout(() => setSuccessToast(''), 4000);
                        setIsPinModalOpen(false);
                      } catch (error) {
                        setRecoveryError(
                          error.message || 'Lỗi khi đổi mã PIN.'
                        );
                      }
                    }}
                    className="flex-1 bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] border border-red-500/30 text-[14px] font-bold py-3.5 rounded-2xl transition-all shadow-[0_8px_20px_rgba(127,29,29,0.4)] text-[#111827] dark:text-white uppercase tracking-wider text-xs"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-black/85 px-4 backdrop-blur-sm">
          {/* Close button */}
          <button
            onClick={() => setSelectedTicket(null)}
            className="fixed top-4 right-4 md:top-8 md:right-8 w-11 h-11 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-white transition-colors z-[110] backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>

          {/* Ticket Container */}
          <div className="w-full max-w-[360px] mx-auto bg-white dark:bg-black rounded-[32px] border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-[0_32px_80px_rgba(0,0,0,0.9)] overflow-hidden relative">
            <div className="relative px-6 pt-12 pb-8 flex flex-col items-center">
              {/* Poster Background */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.35]"
                style={{ backgroundImage: `url(${TicketBg})` }}
              ></div>
              {/* Glow Overlay */}
              <div
                className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,${selectedTicket.type === 'web' ? 'rgba(37,99,235,0.4)' : 'rgba(220,38,38,0.4)'},transparent_80%)]`}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/70 to-[#0a0a0a]"></div>

              {/* Header */}
              <div className="relative z-10 w-full flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <img
                    src={Logo}
                    alt="Logo"
                    className="w-[26px] h-[26px] object-contain"
                    height="192"
                    width="192"
                  />
                  <span className="font-black tracking-[0.2em] text-[13px]">
                    <span className="text-[#e61a27]">GIN</span>
                    <span className="text-[#111827] dark:text-white">FILM</span>
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest ${selectedTicket.type === 'web' ? 'border-blue-500/40 text-blue-500 bg-blue-500/10' : 'border-[#e61a27]/40 text-[#e61a27] bg-[#e61a27]/10'}`}
                >
                  {selectedTicket.type === 'web' ? 'TRỰC TUYẾN' : 'STANDARD'}
                </div>
              </div>

              {/* Badge */}
              <div className="relative z-10 px-4 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-[#9D9D9D] uppercase mb-5 backdrop-blur-sm">
                VÉ XEM PHIM
              </div>

              {/* Title */}
              <h3 className="relative z-10 w-full text-[22px] font-black text-[#111827] dark:text-white text-center leading-[1.3] uppercase drop-shadow-md mb-4 px-0">
                {selectedTicket.movie.replace(/^GIN\s*FILM\s*[-|:]?\s*/i, '')}
              </h3>

              {/* Meta info */}
              <div className="relative z-10 flex items-center justify-center gap-3 text-[11px] font-medium text-gray-500 dark:text-[#9D9D9D]">
                <span className="flex items-center gap-1">
                  <span
                    className={`material-symbols-outlined text-[14px] ${selectedTicket.type === 'web' ? 'text-blue-500' : 'text-[#e61a27]'}`}
                  >
                    schedule
                  </span>{' '}
                  120 Phút
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                <span className="flex items-center gap-1">
                  <span
                    className={`material-symbols-outlined text-[14px] ${selectedTicket.type === 'web' ? 'text-blue-500' : 'text-[#e61a27]'}`}
                  >
                    subtitles
                  </span>{' '}
                  Phụ Đề VN
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${selectedTicket.type === 'web' ? 'border-blue-500/50 text-blue-500' : 'border-[#e61a27]/50 text-[#e61a27]'}`}
                >
                  {selectedTicket.type === 'web' ? '4K' : '2D'}
                </span>
              </div>

              {/* Info Card */}
              <div className="relative z-10 w-full mt-8 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-[20px] p-5 backdrop-blur-sm">
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5 w-[60%]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Ngày Chiếu
                      </span>
                      <span className="text-[15px] text-[#111827] dark:text-white font-black leading-tight">
                        {selectedTicket.date}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end text-right w-[40%]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Giờ Chiếu
                      </span>
                      <span
                        className={`text-[15px] font-black leading-tight ${selectedTicket.type === 'web' ? 'text-blue-500' : 'text-[#e61a27]'}`}
                      >
                        {selectedTicket.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5 w-[60%]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Rạp / Screen
                      </span>
                      <span className="text-[14px] text-[#111827] dark:text-white font-black leading-tight">
                        {selectedTicket.cinema.replace(
                          /^GIN\s*FILM\s*\|\s*/i,
                          ''
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end text-right w-[40%]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        {selectedTicket.type === 'web' ? 'Loại Vé' : 'Ghế Ngồi'}
                      </span>
                      <span
                        className={`text-[15px] font-black leading-tight ${selectedTicket.type === 'web' ? 'text-blue-500' : 'text-[#e61a27]'}`}
                      >
                        {selectedTicket.type === 'web'
                          ? 'VIP'
                          : selectedTicket.seats.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="relative h-8 w-full bg-white dark:bg-black">
              <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-black/80 rounded-full border-r border-gray-200 dark:border-white/10 shadow-inner"></div>
              <div className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-black/80 rounded-full border-l border-gray-200 dark:border-white/10 shadow-inner"></div>
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t-[2px] border-dashed border-gray-200 dark:border-white/10"></div>
            </div>

            {/* BOTTOM SECTION */}
            <div className="px-6 pb-8 pt-4 bg-white dark:bg-black flex flex-col items-center">
              {selectedTicket.type === 'web' ? (
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    navigate(`/watch-online?movieId=${selectedTicket.movieId}`);
                  }}
                  className="w-full py-4 rounded-xl bg-[linear-gradient(to_bottom,rgba(30,58,138,0.5),rgba(23,37,84,0.5))] border border-blue-500/20 text-[13px] font-bold text-blue-400 hover:text-[#111827] dark:text-white hover:bg-blue-900/50 transition-all flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    play_circle
                  </span>
                  Xem Phim Ngay
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    navigate(`/watch-online?movieId=${selectedTicket.movieId}`);
                  }}
                  className="w-full py-4 rounded-xl bg-[linear-gradient(to_bottom,rgba(69,10,10,0.5),rgba(39,9,9,0.5))] border border-[#e61a27]/20 text-[13px] font-bold text-[#e61a27] hover:text-white hover:bg-[#e61a27]/20 transition-all flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    play_circle
                  </span>
                  Xem Phim Ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
