import { createContext, useContext, type ReactNode } from 'react';

interface CookieConsentContextType {
  hasConsent: boolean;
  showBanner: boolean;
  acceptCookies: () => void;
  declineCookies: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

// No tracking cookies or production preference storage exist in this frontend demo.
export const CookieConsentProvider = ({ children }: { children: ReactNode }) => (
  <CookieConsentContext.Provider value={{
    hasConsent: true,
    showBanner: false,
    acceptCookies: () => undefined,
    declineCookies: () => undefined,
  }}>
    {children}
  </CookieConsentContext.Provider>
);

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  return context;
};
