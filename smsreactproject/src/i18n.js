import { addLocaleData } from 'react-intl';
import enLocaleData from 'react-intl/locale-data/en';
import kaLocaleData from 'react-intl/locale-data/ka';
import teLocaleData from 'react-intl/locale-data/te';
import hiLocaleData from 'react-intl/locale-data/hi';

import { DEFAULT_LOCALE } from 'Constants';
import enTranslationMessages from './translations/en.json';
import kaTranslationMessages from './translations/ka.json';


export const appLocales = [
  'en',
  'ka',
  'hi',
  'te',
];

addLocaleData(enLocaleData);
addLocaleData(kaLocaleData);
addLocaleData(hiLocaleData);
addLocaleData(teLocaleData);

addLocaleData(kaLocaleData);
export const formatTranslationMessages = (locale, messages) => {
  const defaultFormattedMessages = locale !== DEFAULT_LOCALE
    ? formatTranslationMessages(DEFAULT_LOCALE, enTranslationMessages)
    : {};
  return Object.keys(messages).reduce((formattedMessages, key) => {
    let message = messages[key];
    if (!message && locale !== DEFAULT_LOCALE) {
      message = defaultFormattedMessages[key];
    }
    return Object.assign(formattedMessages, { [key]: message });
  }, {});
};

export const translationMessages = {
  en: formatTranslationMessages('en', enTranslationMessages),
  ka: formatTranslationMessages('ka', kaTranslationMessages),
};
