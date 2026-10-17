(() => {
  const messages = {
    en: {
      pageTitle: 'Page not found | KELEDON',
      title: 'Page not found',
      description: 'The page you requested does not exist.',
      home: 'Return home',
    },
    es: {
      pageTitle: 'Página no encontrada | KELEDON',
      title: 'Página no encontrada',
      description: 'La página que solicitaste no existe.',
      home: 'Volver al inicio',
    },
    pt: {
      pageTitle: 'Página não encontrada | KELEDON',
      title: 'Página não encontrada',
      description: 'A página solicitada não existe.',
      home: 'Voltar ao início',
    },
  };

  const normalizeLocale = (value) => value?.split('-')[0].toLowerCase();
  let savedLocale = null;
  try {
    savedLocale = normalizeLocale(localStorage.getItem('keledon-locale'));
  } catch {
    // Browser privacy settings may disable local storage; use the browser locale.
  }
  const browserLocale = normalizeLocale(navigator.language);
  const locale = messages[savedLocale] ? savedLocale : messages[browserLocale] ? browserLocale : 'en';

  document.documentElement.lang = locale;
  document.title = messages[locale].pageTitle;
  document.querySelector('[data-not-found-title]').textContent = messages[locale].title;
  document.querySelector('[data-not-found-description]').textContent = messages[locale].description;
  document.querySelector('[data-not-found-home]').textContent = messages[locale].home;
})();
