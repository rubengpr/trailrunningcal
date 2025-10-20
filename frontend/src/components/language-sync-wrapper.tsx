import { useRouteLanguageSync } from '../utils/use-route-language-sync';

interface LanguageSyncWrapperProps {
  children: React.ReactNode;
}

export default function LanguageSyncWrapper({
  children,
}: LanguageSyncWrapperProps) {
  useRouteLanguageSync();
  return <>{children}</>;
}
