import React, { useState } from 'react';
import POSMovieList from './POSMovieList';
import POSSeatMap from './POSSeatMap';
import POSCombo from './POSCombo';
import POSCheckout from './POSCheckout';
import POSReceiptPrinter from './POSReceiptPrinter';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export default function POSWizard() {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({});

  const nextStep = (data) => {
    setBookingData((prev) => ({ ...prev, ...data }));
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const resetFlow = () => {
    setBookingData({});
    setStep(1);
  };

  const steps = ['Chọn Phim', 'Chọn Ghế', 'Bắp Nước', 'Thanh Toán', 'Hoàn Tất'];

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-black p-4 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0 border-b border-gray-200 dark:border-white/10 pb-2">
        {/* Stepper */}
        <div className="flex gap-2 items-center overflow-x-auto">
          {steps.map((label, index) => {
            const isActive = step === index + 1;
            const isPast = step > index + 1;
            return (
              <React.Fragment key={index}>
                <div 
                  className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors duration-300 ${
                    isActive ? 'bg-[#dc2626] text-white' : 
                    isPast ? 'bg-[#22c55e] text-white' : 
                    'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/50'
                  }`}
                >
                  {index + 1}. {label}
                </div>
                {index < steps.length - 1 && <ChevronRight size={18} className="text-gray-400 dark:text-white/30" />}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Back Button */}
        {step > 1 && (
          <button 
            onClick={step === 5 ? resetFlow : prevStep}
            className="ml-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
          >
            <ArrowLeft size={16} /> {step === 5 ? 'Quay Lại Màn Hình Chính' : 'Quay Lại'}
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border-0 dark:border border-transparent dark:border-white/10 flex flex-col relative shadow-lg dark:shadow-xl min-h-[600px]">
        <div className={step === 1 ? 'flex-1 flex flex-col' : 'hidden'}>
          <POSMovieList onNext={nextStep} />
        </div>
        {step === 2 && <POSSeatMap showtimeData={bookingData} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <POSCombo bookingData={bookingData} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <POSCheckout bookingData={bookingData} onNext={nextStep} onBack={prevStep} />}
        {step === 5 && <POSReceiptPrinter bookingData={bookingData} onReset={resetFlow} />}
      </div>
    </div>
  );
}
