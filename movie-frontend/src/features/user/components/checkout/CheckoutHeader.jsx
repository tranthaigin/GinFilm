import BrandLogo from '../layout/BrandLogo';

export default function CheckoutHeader() {
  return (
    <header className="w-full px-margin-mobile md:px-margin-desktop py-6 border-b border-surface-alt/30 sticky top-0 bg-background/95 backdrop-blur-md z-40">
      <div className="max-w-container-max mx-auto flex justify-between items-center">
        <BrandLogo className="h-10" />
        <div className="flex items-center gap-2 text-text-muted font-label-caps text-label-caps">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            lock
          </span>
          Secure Checkout
        </div>
      </div>
    </header>
  );
}
