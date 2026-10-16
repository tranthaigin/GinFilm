import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';

const ReviewModal = ({
  isOpen,
  onClose,
  onSubmit,
  isAuthenticated,
  canReview,
}) => {
  const [rate, setRate] = useState(5);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const resetKey1 = JSON.stringify([isOpen]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (!isOpen) {
      setShowEmojiPicker(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    // onSubmit should return { success: boolean, error?: string }
    const result = await onSubmit(rate, text);

    setIsSubmitting(false);
    if (result && result.success) {
      setRate(5);
      setText('');
      setShowEmojiPicker(false);
    } else if (result && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 transition-all duration-300">
      <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-visible">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-[#9D9D9D] dark:hover:text-white transition-all z-10"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>

        <div className="p-10 pb-8">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Đánh giá phim
          </h3>
          <p className="text-[#9D9D9D] text-[15px] text-center mb-10">
            Chia sẻ cảm nhận của bạn về bộ phim nhé!
          </p>

          {!isAuthenticated ? (
            <div className="text-[14px] text-[#9D9D9D] py-10 text-center">
              <Link
                to="/login"
                className="text-yellow-500 hover:text-yellow-400 hover:underline font-bold"
              >
                Đăng nhập
              </Link>{' '}
              để viết đánh giá.
            </div>
          ) : !canReview ? (
            <div className="text-[14px] text-gray-600 dark:text-[#9D9D9D] py-10 text-center bg-gray-100 dark:bg-white/5 rounded-2xl px-4">
              Mỗi vé xem phim chỉ được gửi một lượt đánh giá. Bạn đã sử dụng hết
              lượt đánh giá của mình.
            </div>
          ) : (
            <>
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-10">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRate(star)}
                    className={`transition-all duration-300 hover:scale-110 focus:outline-none ${star <= rate ? 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]' : 'text-gray-600 hover:text-yellow-400/50'}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[64px] ${star <= rate ? 'filled' : ''}`}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="relative mb-8">
                <div className="w-full bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/50 transition-all shadow-inner">
                  <style>
                    {`
                      .review-textarea-no-scrollbar::-webkit-scrollbar {
                        display: none !important;
                      }
                      .EmojiPickerReact *::-webkit-scrollbar {
                        display: none !important;
                      }
                      .EmojiPickerReact * {
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                      }
                    `}
                  </style>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Tuyệt vời! Bạn có nhận xét gì thêm không? (Không bắt buộc)"
                    rows={2}
                    maxLength={10000}
                    spellCheck={false}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    className="w-full bg-transparent p-4 text-[16px] text-gray-900 dark:text-white focus:outline-none resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600 break-all review-textarea-no-scrollbar"
                  />

                  {/* Toolbar inside the wrapper, below textarea */}
                  <div className="flex items-center justify-between px-3 pb-3">
                    <button
                      ref={emojiButtonRef}
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showEmojiPicker ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                      title="Thêm biểu cảm"
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        sentiment_satisfied
                      </span>
                    </button>
                    <span
                      className={`text-[13px] font-medium pr-2 ${text.length >= 10000 ? 'text-red-400' : 'text-gray-600'}`}
                    >
                      {text.length.toLocaleString()}/10,000 ký tự
                    </span>
                  </div>
                </div>

                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute z-[100] mt-2 top-full left-0 w-full shadow-2xl rounded-2xl overflow-hidden border border-white/10 animate-fade-in-up"
                  >
                    <EmojiPicker
                      theme="dark"
                      emojiStyle="apple"
                      height={300}
                      width="100%"
                      searchDisabled={true}
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(emojiObject) => {
                        setText((prev) => prev + emojiObject.emoji);
                      }}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-400 text-center text-[13px] font-medium mb-4">
                  {error}
                </div>
              )}

              {/* Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || rate === 0}
                className="w-full py-4 bg-[#e61a27] hover:bg-red-700 text-white font-black text-[18px] rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(230,26,39,0.4)]"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
