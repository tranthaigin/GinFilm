import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../../../../shared/api/client';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import DigitalTicket from '../../components/DigitalTicket';

export default function ScanOfflineTicketPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      navigate('/home');
      return;
    }

    // Call API to fetch ticket details for scanning
    apiGet(`/scan/offline/${code}`)
      .then(res => {
        setTicket(res);
      })
      .catch(err => {
        setError(err.message || 'Mã vé không tồn tại hoặc có lỗi xảy ra.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white selection:bg-red-500/30">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#111827] dark:text-white uppercase tracking-widest">Kiểm Tra Vé</h1>
          <p className="text-gray-500 text-sm tracking-wider mt-2">Thông tin vé chiếu rạp</p>
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        ) : (
          <div className="w-full max-w-md">
             <DigitalTicket 
                ticket={{
                  id: ticket.ticketCode,
                  movie: ticket.movieName,
                  date: ticket.date,
                  time: ticket.time,
                  roomName: ticket.roomName,
                  branchName: ticket.branchName,
                  seats: ticket.seats
                }}
                showSuccessMessage={false}
                isOnline={false}
             />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
