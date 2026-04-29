import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import pt from './pt';
import en from './en';

const deviceLang = getLocales()[0]?.languageCode ?? 'pt';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: { pt, en },
    lng: deviceLang === 'en' ? 'en' : 'pt',
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
  });

export default i18n;
