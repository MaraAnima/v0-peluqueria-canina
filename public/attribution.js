(function () {
  const key = 'trcorte_origen_reserva';
  const sources = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    google_maps: 'Google Maps',
    google: 'Google (sin especificar)',
    web_turacion: 'Web Tu Racion',
    qr_local: 'QR en local',
  };
  const allowed = new Set([...Object.values(sources), 'Otra fuente etiquetada']);
  let saved = '';
  try { saved = sessionStorage.getItem(key) || ''; } catch (_) {}
  if (!allowed.has(saved)) saved = '';

  const source = new URLSearchParams(window.location.search).get('utm_source');
  if (source) {
    const normalized = source.trim().toLowerCase();
    saved = Object.prototype.hasOwnProperty.call(sources, normalized)
      ? sources[normalized] : 'Otra fuente etiquetada';
  } else if (!saved && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host === 'turacion.com.uy' || host === 'www.turacion.com.uy') saved = 'Web Tu Racion';
      else if (host === 'instagram.com' || host.endsWith('.instagram.com')) saved = 'Instagram';
      else if (host === 'facebook.com' || host.endsWith('.facebook.com')) saved = 'Facebook';
      else if (host === 'google.com' || host === 'www.google.com' || host === 'www.google.com.uy') saved = 'Google (sin especificar)';
    } catch (_) {}
  }
  if (saved) {
    try { sessionStorage.setItem(key, saved); } catch (_) {}
  }
  window.getReservationOrigin = function () { return saved || 'Sin identificar'; };
})();
