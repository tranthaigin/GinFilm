
import POSWizard from './POSWizard';

export default function StaffPOSPage() {
  return (
    <div className="w-full bg-gray-100 dark:bg-[#0b0a0a] text-gray-900 dark:text-white p-4 min-h-[calc(100vh-64px)] flex flex-col transition-colors duration-300">
      <div className="flex-1 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-white/10 relative shadow-lg flex flex-col overflow-hidden">
        <POSWizard />
      </div>
    </div>
  );
}
