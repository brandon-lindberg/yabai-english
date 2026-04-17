/** Minified bootstrap for next/script beforeInteractive — sets light/dark only */
export const THEME_INIT_SCRIPT = `
(function(){
  var r = document.documentElement;
  var stored = localStorage.getItem('english-platform-theme');
  if (stored === 'dark' || stored === 'light') {
    r.dataset.theme = stored;
  } else {
    r.dataset.theme = 'light';
  }
})();`;
