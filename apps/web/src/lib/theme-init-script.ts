/** Minified bootstrap for next/script beforeInteractive — keep in sync with palette seasons */
export const THEME_INIT_SCRIPT = `
(function(){
  var m = new Date().getMonth();
  var s = 'winter';
  if (m >= 2 && m <= 4) s = 'spring';
  else if (m >= 5 && m <= 7) s = 'summer';
  else if (m >= 8 && m <= 10) s = 'autumn';
  var r = document.documentElement;
  r.dataset.season = s;
  var stored = localStorage.getItem('english-platform-theme');
  if (stored === 'dark' || stored === 'light') {
    r.dataset.theme = stored;
  } else {
    r.dataset.theme = 'light';
  }
})();`;
