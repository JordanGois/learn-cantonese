(function() {
  var saved = localStorage.getItem('cantonese_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }

  function injectToggle() {
    if (document.querySelector('.theme-toggle')) return;
    var div = document.createElement('div');
    div.className = 'theme-toggle';
    div.innerHTML = '<span class="theme-toggle-icon">☀</span>' +
      '<div class="theme-toggle-track" id="themeTrack"></div>' +
      '<span class="theme-toggle-icon">☾</span>';
    document.body.appendChild(div);

    document.getElementById('themeTrack').onclick = function() {
      var current = document.documentElement.getAttribute('data-theme');
      var isDark;
      if (current) {
        isDark = current === 'dark';
      } else {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      var next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cantonese_theme', next);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
})();
