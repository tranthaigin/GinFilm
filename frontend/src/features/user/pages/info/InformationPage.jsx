import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { sendContact } from '../../api/services/contactService';
import { APP_BRAND } from '../../../../shared/constants/brand';

const TABS = [
  { id: 'about', label: 'GIỚI THIỆU' },
  { id: 'contact', label: 'LIÊN HỆ GINFILM' },
  { id: 'terms', label: 'ĐIỀU KHOẢN CHUNG' },
  { id: 'transaction', label: 'ĐIỀU KHOẢN GIAO DỊCH' },
  { id: 'payment', label: 'CHÍNH SÁCH THANH TOÁN' },
  { id: 'privacy', label: 'CHÍNH SÁCH BẢO MẬT' },
  { id: 'faq', label: 'CÂU HỎI THƯỜNG GẶP' },
];

export default function InformationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.id === tabFromUrl)
    ? tabFromUrl
    : 'about';
  const [contactForm, setContactForm] = useState({
    loading: false,
    toast: null,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tabFromUrl]);

  const handleTabClick = (id) => {
    setSearchParams({ tab: id });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactForm({ loading: true, toast: null });
    const payload = {
      name: e.target.name.value.trim(),
      email: e.target.email.value.trim(),
      phone: e.target.phone.value.trim(),
      message: e.target.message.value.trim(),
    };
    try {
      const data = await sendContact(payload);
      setContactForm({
        loading: false,
        toast: { type: 'success', message: data.message || 'Gửi thành công!' },
      });
      e.target.reset();
    } catch (error) {
      setContactForm({
        loading: false,
        toast: {
          type: 'error',
          message: error.message || 'Không thể kết nối đến máy chủ.',
        },
      });
    }
    setTimeout(
      () => setContactForm((prev) => ({ ...prev, toast: null })),
      5000
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'contact':
        return (
          <div className="animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-500 dark:text-[#9D9D9D] w-full">
            <div className="flex flex-col md:flex-row gap-10">
              {/* Left Column - Contact Info */}
              <div className="flex-1 space-y-8">
                <section>
                  <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-2 uppercase border-b border-gray-200 dark:border-[#333] pb-2">
                    TRỤ SỞ CHÍNH
                  </h2>
                  <p>
                    Tầng 2, Rivera Park Saigon - Số 7/28 Thành Thái, phường Diên
                    Hồng, Thành phố Hồ Chí Minh, Việt Nam.
                  </p>
                </section>
                <section>
                  <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-2 uppercase border-b border-gray-200 dark:border-[#333] pb-2">
                    DỊCH VỤ KHÁCH HÀNG
                  </h2>
                  <p>Hotline: 1900 6017</p>
                  <p>Giờ làm việc: 8:00 - 22:00</p>
                  <p>Tất cả các ngày bao gồm cả Lễ Tết</p>
                  <p>
                    {APP_BRAND.contactEmail
                      ? `Email hỗ trợ: ${APP_BRAND.contactEmail}`
                      : 'Gửi yêu cầu hỗ trợ qua biểu mẫu bên cạnh.'}
                  </p>
                </section>
                <section>
                  <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-2 uppercase border-b border-gray-200 dark:border-[#333] pb-2">
                    LIÊN HỆ QUẢNG CÁO
                  </h2>
                  <p>Phòng kinh doanh: +84-28-3636 57 57</p>
                  <p>Ext: 278 (Ms. Huỳnh)</p>
                  <p>Hotline: 0335400414</p>
                  <p>
                    {APP_BRAND.contactEmail
                      ? `Email: ${APP_BRAND.contactEmail}`
                      : 'Gửi yêu cầu quảng cáo qua biểu mẫu bên cạnh.'}
                  </p>
                </section>
              </div>

              {/* Right Column - Form */}
              <div className="flex-1">
                <form className="space-y-4" onSubmit={handleContactSubmit}>
                  <p className="text-[#e61a27] text-[13px] text-right italic font-bold">
                    * Phải nhập thông tin
                  </p>

                  <div className="flex flex-col">
                    <label className="text-[#111827] dark:text-white font-bold mb-1 text-[14px]">
                      Tên <span className="text-[#e61a27]">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] text-[#111827] dark:text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#e61a27]"
                      required
                      disabled={contactForm.loading}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[#111827] dark:text-white font-bold mb-1 text-[14px]">
                      Email <span className="text-[#e61a27]">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] text-[#111827] dark:text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#e61a27]"
                      required
                      disabled={contactForm.loading}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[#111827] dark:text-white font-bold mb-1 text-[14px]">
                      Điện thoại
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] text-[#111827] dark:text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#e61a27]"
                      disabled={contactForm.loading}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[#111827] dark:text-white font-bold mb-1 text-[14px]">
                      Nội dung cần liên hệ{' '}
                      <span className="text-[#e61a27]">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows="4"
                      className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] text-[#111827] dark:text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#e61a27]"
                      required
                      disabled={contactForm.loading}
                    ></textarea>
                  </div>

                  {/* Toast */}
                  {contactForm.toast && (
                    <div
                      className={`flex items-start gap-2 px-4 py-3 rounded-md text-[13px] font-medium ${
                        contactForm.toast.type === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'
                      }`}
                    >
                      <span>
                        {contactForm.toast.type === 'success' ? '✅' : '❌'}
                      </span>
                      <span>{contactForm.toast.message}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={contactForm.loading}
                      className="bg-[#e61a27] text-white font-bold px-6 py-2 rounded-sm hover:bg-[#b80710] transition-colors uppercase shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {contactForm.loading && (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      Gửi Đi
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-700 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              Giới thiệu về GinFilm
            </h1>

            <section>
              <p className="mb-4">
                Được thành lập với khát vọng tái định nghĩa chuẩn mực giải trí
                điện ảnh tại Việt Nam,{' '}
                <strong className="text-gray-900 dark:text-white">
                  GinFilm
                </strong>{' '}
                tự hào là hệ thống rạp chiếu phim tiên phong trong việc tích hợp
                công nghệ trình chiếu tối tân cùng không gian kiến trúc đương
                đại. Chúng tôi không chỉ đơn thuần là một điểm đến để xem phim,
                mà còn là một không gian văn hóa nghệ thuật – nơi những câu
                chuyện được kể lại bằng ngôn ngữ thị giác đầy cảm xúc.
              </p>
              <p>
                Với hệ thống rạp trải dài trên toàn quốc, GinFilm liên tục đầu
                tư mạnh mẽ vào hệ thống âm thanh vòm không gian Dolby Atmos,
                công nghệ hình ảnh IMAX Laser siêu thực cùng hệ thống ghế ngồi
                công thái học cao cấp, đảm bảo mỗi khung hình là một kiệt tác,
                mỗi âm thanh là một trải nghiệm sống động đến nghẹt thở.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                Tầm nhìn
              </h2>
              <p>
                Khẳng định vị thế là tổ hợp giải trí điện ảnh hàng đầu khu vực,
                kiến tạo một cộng đồng yêu điện ảnh văn minh và góp phần thúc
                đẩy sự phát triển của nền công nghiệp điện ảnh nước nhà thông
                qua những trải nghiệm dịch vụ đạt chuẩn quốc tế.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                Sứ mệnh
              </h2>
              <p>
                Sứ mệnh của chúng tôi là xóa nhòa ranh giới giữa màn ảnh và thực
                tại, đưa khán giả bước vào cốt truyện bằng tất cả giác quan.
                GinFilm cam kết mang đến sự phục vụ tận tâm, chu đáo và cá nhân
                hóa, để mỗi lần đến rạp của quý khách đều là một khoảnh khắc
                đáng nhớ.
              </p>
            </section>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-700 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              Điều Khoản Chung
            </h1>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                1. Nguyên tắc chung
              </h2>
              <p>
                Bản Điều khoản chung này ("Điều khoản") là thỏa thuận pháp lý
                ràng buộc giữa quý khách hàng và Công ty Cổ phần Giải trí
                GinFilm ("GinFilm") liên quan đến việc truy cập và sử dụng hệ
                thống nền tảng đặt vé trực tuyến (bao gồm website và ứng dụng di
                động). Việc quý khách thiết lập tài khoản hoặc tiến hành giao
                dịch trên nền tảng của chúng tôi đồng nghĩa với việc quý khách
                đã đọc, hiểu và chấp thuận toàn bộ các quy định được nêu tại
                đây.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                2. Quyền và Trách nhiệm của Chủ tài khoản
              </h2>
              <p className="mb-2">
                Khi đăng ký thành viên tại GinFilm, quý khách có trách nhiệm:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  Cung cấp thông tin cá nhân trung thực, chính xác và cập nhật
                  kịp thời khi có sự thay đổi.
                </li>
                <li>
                  Tự quản lý và bảo mật tuyệt đối thông tin tài khoản, bao gồm
                  tên đăng nhập và mật khẩu. GinFilm miễn trừ trách nhiệm đối
                  với mọi rủi ro, tổn thất phát sinh do sự sơ suất của người
                  dùng dẫn đến việc tài khoản bị truy cập trái phép.
                </li>
                <li>
                  Không sử dụng nền tảng của chúng tôi cho các mục đích vi phạm
                  pháp luật, phát tán mã độc, hoặc can thiệp trái phép vào hệ
                  thống dữ liệu của GinFilm.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                3. Nội quy tại rạp chiếu phim
              </h2>
              <p className="mb-2">
                Để duy trì môi trường thưởng thức nghệ thuật văn minh, quý khách
                vui lòng tuân thủ:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  Chấp hành nghiêm ngặt quy định về phân loại độ tuổi của phim
                  do Cục Điện ảnh ban hành (T13, T16, T18, v.v.). Ban quản lý
                  rạp có quyền yêu cầu xuất trình giấy tờ tùy thân để kiểm tra
                  và từ chối phục vụ nếu quý khách không đáp ứng độ tuổi quy
                  định.
                </li>
                <li>
                  Không mang theo vũ khí, chất gây cháy nổ, đồ uống có cồn, hoặc
                  thức ăn/đồ uống được mua từ bên ngoài vào rạp chiếu.
                </li>
                <li>
                  Giữ gìn trật tự, tắt chuông điện thoại và tuyệt đối không thực
                  hiện các hành vi ghi âm, ghi hình trái phép nội dung phim dưới
                  mọi hình thức. Mọi hành vi vi phạm bản quyền sẽ bị xử lý theo
                  quy định của pháp luật.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                4. Sửa đổi Điều khoản
              </h2>
              <p>
                GinFilm bảo lưu quyền sửa đổi, bổ sung hoặc loại bỏ bất kỳ nội
                dung nào trong Điều khoản này vào từng thời điểm mà không buộc
                phải thông báo trước. Các thay đổi sẽ có hiệu lực ngay khi được
                cập nhật chính thức trên hệ thống website/ứng dụng.
              </p>
            </section>
          </div>
        );
      case 'transaction':
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-700 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              Điều Khoản Giao Dịch
            </h1>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                1. Tính minh bạch của giao dịch
              </h2>
              <p>
                Mọi giao dịch mua vé phim và các sản phẩm bắp nước (F&B) trên hệ
                thống GinFilm đều phải được thực hiện bằng tiền Đồng Việt Nam
                (VNĐ). Khách hàng có trách nhiệm rà soát kỹ lưỡng các thông tin
                chi tiết bao gồm: Tên phim, suất chiếu, cụm rạp, số lượng và vị
                trí ghế ngồi trước khi tiến hành thanh toán cuối cùng.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                2. Chính sách Hủy & Hoàn vé
              </h2>
              <p className="mb-2">
                Dựa trên đặc thù của dịch vụ giải trí trực tiếp, GinFilm áp dụng
                chính sách <strong>Không hỗ trợ hoàn hủy</strong> đối với mọi
                giao dịch đã thanh toán thành công, ngoại trừ các trường hợp bất
                khả kháng sau:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  Sự cố kỹ thuật phát sinh từ phía rạp chiếu (mất điện, lỗi máy
                  chiếu, hệ thống gặp trục trặc) khiến suất chiếu không thể diễn
                  ra.
                </li>
                <li>
                  Lỗi hệ thống thanh toán: Khách hàng đã bị trừ tiền nhưng hệ
                  thống GinFilm không ghi nhận mã đặt vé thành công trong vòng
                  15 phút. Trong trường hợp này, thời gian đối soát và hoàn tiền
                  sẽ dao động từ 3-14 ngày làm việc tùy thuộc vào quy định của
                  ngân hàng phát hành thẻ.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                3. Giá vé & Phụ thu dịch vụ
              </h2>
              <p>
                Giá vé niêm yết trên nền tảng GinFilm đã bao gồm Thuế Giá trị
                gia tăng (VAT). Tùy thuộc vào chiến lược kinh doanh và tính chất
                của từng suất chiếu, giá vé có thể thay đổi và áp dụng các khoản
                phụ thu hợp lý (bao gồm nhưng không giới hạn: Phụ thu Lễ/Tết,
                phụ thu ghế đôi/ghế VIP, phụ thu định dạng phim
                3D/IMAX/ScreenX). Mọi khoản phụ thu đều được hiển thị minh bạch
                tại bước thanh toán.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                4. Quy trình nhận vé
              </h2>
              <p>
                Sau khi thanh toán thành công, mã đặt vé (Booking Code) kèm mã
                QR sẽ được gửi về địa chỉ Email mà quý khách đã đăng ký, đồng
                thời lưu trữ trong mục "Vé của tôi" trên hệ thống. Quý khách chỉ
                cần xuất trình mã QR này tại máy Kiosk tự động hoặc quầy vé trực
                tiếp để nhân viên hỗ trợ in vé cứng trước khi vào rạp.
              </p>
            </section>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-700 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              Chính Sách Thanh Toán
            </h1>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                1. Hình thức thanh toán chấp nhận
              </h2>
              <p className="mb-2">
                Nhằm tối ưu hóa trải nghiệm khách hàng và đẩy nhanh quá trình
                thanh toán, GinFilm đã tích hợp các phương thức thanh toán điện
                tử an toàn và phổ biến nhất hiện nay:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>
                  <strong>Thẻ thanh toán quốc tế:</strong> Visa, Mastercard,
                  JCB, American Express.
                </li>
                <li>
                  <strong>Thẻ thanh toán nội địa (ATM):</strong> Hỗ trợ tất cả
                  các ngân hàng liên minh NAPAS tại Việt Nam.
                </li>
                <li>
                  <strong>Ví điện tử & Cổng thanh toán:</strong> MoMo, ZaloPay,
                  VNPAY, ShopeePay.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                2. Tiêu chuẩn bảo mật thanh toán
              </h2>
              <p>
                Bảo mật tài chính của quý khách là ưu tiên hàng đầu của chúng
                tôi. Toàn bộ quy trình xử lý thanh toán trên hệ thống GinFilm
                đều được thực hiện qua các đối tác cổng thanh toán đã được Ngân
                hàng Nhà nước cấp phép hoạt động. Dữ liệu thẻ của quý khách được
                mã hóa theo tiêu chuẩn bảo mật dữ liệu thẻ thanh toán quốc tế
                (PCI DSS - Payment Card Industry Data Security Standard).
                GinFilm cam kết không lưu trữ bất kỳ thông tin thẻ tín dụng nhạy
                cảm nào của khách hàng trên hệ thống máy chủ của chúng tôi.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                3. Xử lý tranh chấp giao dịch
              </h2>
              <p>
                Trường hợp phát sinh sự cố liên quan đến giao dịch thanh toán
                (như trừ tiền nhiều lần, lỗi đường truyền, v.v.), quý khách vui
                lòng liên hệ ngay với bộ phận Chăm sóc khách hàng của GinFilm
                qua Hotline hoặc Email hỗ trợ. Chúng tôi sẽ phối hợp chặt chẽ
                với các đối tác thanh toán để đối soát và giải quyết thỏa đáng
                quyền lợi của quý khách trong thời gian sớm nhất có thể.
              </p>
            </section>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-700 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              Chính Sách Bảo Mật Thông Tin
            </h1>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                1. Phạm vi thu thập dữ liệu
              </h2>
              <p>
                Để cung cấp dịch vụ một cách tối ưu, GinFilm tiến hành thu thập
                các thông tin cá nhân cần thiết khi quý khách khởi tạo tài khoản
                hoặc thực hiện giao dịch, bao gồm: Họ và tên, số điện thoại, địa
                chỉ thư điện tử (Email), ngày sinh và lịch sử giao dịch. Việc
                cung cấp thông tin là hoàn toàn tự nguyện, tuy nhiên, nếu quý
                khách từ chối cung cấp một số thông tin bắt buộc, chúng tôi có
                thể sẽ không thể hoàn tất việc cung cấp dịch vụ.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                2. Mục đích xử lý thông tin
              </h2>
              <p className="mb-2">
                Dữ liệu cá nhân của quý khách được chúng tôi xử lý minh bạch và
                nghiêm ngặt cho các mục đích cụ thể sau:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  Khởi tạo mã đặt vé, xác thực danh tính và hỗ trợ khách hàng
                  tại rạp.
                </li>
                <li>
                  Giải quyết khiếu nại, xử lý các sự cố phát sinh trong quá
                  trình sử dụng dịch vụ.
                </li>
                <li>
                  Cải thiện trải nghiệm người dùng trên nền tảng (UI/UX) và gửi
                  các thông điệp truyền thông, ưu đãi cá nhân hóa (nếu quý khách
                  đồng ý nhận tin).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                3. Cam kết bảo vệ quyền riêng tư
              </h2>
              <p>
                GinFilm tuân thủ nghiêm ngặt các quy định của pháp luật Việt Nam
                về bảo vệ dữ liệu cá nhân. Chúng tôi cam kết tuyệt đối không mua
                bán, trao đổi hoặc thương mại hóa dữ liệu cá nhân của khách hàng
                dưới bất kỳ hình thức nào. Việc chia sẻ thông tin (nếu có) chỉ
                được giới hạn trong nội bộ các đối tác công nghệ, đối tác thanh
                toán có ký kết cam kết bảo mật (NDA) nhằm mục đích duy nhất là
                duy trì hoạt động cung ứng dịch vụ.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                4. Quyền của chủ thể dữ liệu
              </h2>
              <p>
                Quý khách có toàn quyền yêu cầu truy cập, chỉnh sửa hoặc vô hiệu
                hóa dữ liệu cá nhân của mình khỏi hệ thống cơ sở dữ liệu của
                GinFilm bằng cách sử dụng các tính năng quản lý tài khoản trên
                nền tảng, hoặc gửi yêu cầu trực tiếp đến bộ phận hỗ trợ kỹ thuật
                của chúng tôi.
              </p>
            </section>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-700 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              Câu Hỏi Thường Gặp (FAQ)
            </h1>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                Q: GinFilm có áp dụng chính sách hoàn hoặc đổi vé sau khi đã
                thanh toán không?
              </h2>
              <p>
                <strong>A:</strong> Để đảm bảo tính minh bạch và quyền lợi công
                bằng cho mọi khách hàng, hệ thống của chúng tôi hiện chưa hỗ trợ
                tính năng hoàn tiền hoặc chuyển đổi suất chiếu/chỗ ngồi sau khi
                giao dịch đã được xác nhận thành công. Khách hàng vui lòng rà
                soát cẩn thận các thông tin đặt vé trước khi thực hiện thanh
                toán.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                Q: Có áp dụng chính sách giá vé ưu đãi dành cho trẻ em không?
              </h2>
              <p>
                <strong>A:</strong> GinFilm luôn dành mức giá ưu đãi đặc biệt
                cho trẻ em (có chiều cao dưới 1.3m). Tuy nhiên, khách hàng cần
                lưu ý tuân thủ chặt chẽ các quy định phân loại phim theo độ tuổi
                của Cục Điện Ảnh. Cụ thể, các phim được gắn nhãn T13, T16, T18
                sẽ tuyệt đối không được phép bán vé cho khách hàng dưới độ tuổi
                quy định, bất kể có người giám hộ đi kèm hay không.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-3">
                Q: Việc mua trước các sản phẩm bắp nước (F&B) trực tuyến mang
                lại lợi ích gì?
              </h2>
              <p>
                <strong>A:</strong> Việc đặt trước bắp nước qua hệ thống trực
                tuyến không chỉ giúp quý khách tiết kiệm thời gian xếp hàng chờ
                đợi tại rạp, mà còn mang lại đặc quyền hưởng mức chiết khấu ưu
                đãi dành riêng cho khách hàng online. Quý khách có thể nhận bắp
                nước nhanh chóng tại "Lối đi ưu tiên" (Priority Line) trước khi
                suất chiếu bắt đầu.
              </p>
            </section>
          </div>
        );
      default:
        return (
          <div className="space-y-8 animate-fade-in text-[14px] md:text-[15px] leading-relaxed text-gray-500 dark:text-[#9D9D9D]">
            <h1 className="text-2xl font-bold uppercase text-[#e61a27] mb-6 text-center">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-center">Nội dung đang được cập nhật...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1 py-12 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Sidebar */}
          <div className="w-full md:w-[280px] shrink-0">
            <div className="flex flex-col gap-[2px]">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative px-6 py-4 cursor-pointer text-[13px] font-bold uppercase tracking-wider transition-colors rounded-md ${
                      isActive
                        ? 'bg-[#e61a27] text-white'
                        : 'bg-white dark:bg-[#18181b] text-gray-500 dark:text-[#9D9D9D] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <div className="absolute top-1/2 -right-[12px] -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-[#e61a27] hidden md:block"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white dark:bg-[#111113] rounded-lg p-6 md:p-10 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
            {renderContent()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
