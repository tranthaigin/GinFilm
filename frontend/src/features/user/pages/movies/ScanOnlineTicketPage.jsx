import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ScanOnlineTicketPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      navigate(`/enter-ticket-code?ticket=${code}`, { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
    </div>
  );
}
