import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/components/ui/button';
import { Cookie, Shield } from 'lucide-react';

export const CookieConsentBanner = () => {
  const { showBanner, acceptCookies, declineCookies } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-2xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            {/* Icon and Text */}
            <div className="flex gap-4 flex-1">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cookie className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Cookie Notice
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies to enhance your experience and remember your preferences. 
                  By clicking "Accept", you agree to our use of cookies.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                onClick={declineCookies}
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={acceptCookies}
                className="bg-primary hover:bg-primary/90"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
