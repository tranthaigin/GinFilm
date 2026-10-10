import { BadgeCheck } from 'lucide-react';
import MembershipPolicyConfigCard from '../components/MembershipPolicyConfigCard';

export default function MembershipTierConfigPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/30">
          <BadgeCheck size={24} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Hạng Thành Viên
          </h2>
          <p className="mt-0.5 text-xs font-medium text-white/50 sm:text-sm">
            Thiết lập chính sách lên hạng, duy trì và xét lại hạng thành viên VIP
          </p>
        </div>
      </div>

      <MembershipPolicyConfigCard />
    </div>
  );
}
