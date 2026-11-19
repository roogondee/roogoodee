(function () {
  var destinations = document.currentScript.dataset.destinations.split(',').filter(Boolean);
  var initialized = false;
  var accepted = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (command, action, settings) {
    if (command === 'event' && !accepted) return;
    if (command === 'consent' && settings) settings.ad_personalization = 'denied';
    window.dataLayer.push(arguments);
  };

  function sync(choice) {
    var next = Boolean(choice && (choice.analytics || choice.marketing));
    var value = next ? 'accepted' : 'declined';
    destinations.forEach(function (id) { window['ga-disable-' + id] = !next; });
    try {
      if (localStorage.getItem('pdpa_consent') !== value) {
        localStorage.setItem('pdpa_consent', value);
        localStorage.setItem('pdpa_consent_at', new Date().toISOString());
      }
    } catch (error) { /* Storage may be unavailable. */ }
    var changed = accepted !== next;
    accepted = next;
    if (next && !initialized) {
      initialized = true;
      window.gtag('js', new Date());
      destinations.forEach(function (id) {
        window.gtag('config', id, {
          page_location: location.origin + location.pathname,
          page_referrer: document.referrer ? new URL(document.referrer).origin : '',
          allow_ad_personalization_signals: false
        });
      });
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(destinations[0]);
      document.head.appendChild(script);
    }
    if (changed) window.dispatchEvent(new CustomEvent('pdpa:consent-change', { detail: value }));
  }

  window.JIA_CONSENT = {
    color: '#c8212d', onColor: '#ffffff', simple: true, compact: true,
    fab: true, fabBottom: 76, bannerBottom: 76, policyUrl: '/privacy'
  };
  window.addEventListener('jia-consent', function (event) { sync(event.detail); });
})();
