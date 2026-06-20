(function() {
  function initScrollAnimations() {
    var targets = document.querySelectorAll('h2, .word-card, .key-phrase, .tone-piano, .ear-trainer, .exercise, .quiz, .practice-box, .dialogue, .flashcard-container');
    targets.forEach(function(el) {
      if (!el.classList.contains('fade-in')) el.classList.add('fade-in');
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.fade-in').forEach(function(el) {
        observer.observe(el);
      });
    } else {
      document.querySelectorAll('.fade-in').forEach(function(el) {
        el.classList.add('visible');
      });
    }
  }

  function showConfetti() {
    var container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    var colors = ['#a00', '#27ae60', '#2980b9', '#d4a017', '#8e44ad', '#e67e22'];
    for (var i = 0; i < 30; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.top = '-10px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      piece.style.animationDuration = (1 + Math.random() * 1.5) + 's';
      piece.style.width = (5 + Math.random() * 6) + 'px';
      piece.style.height = (5 + Math.random() * 6) + 'px';
      if (Math.random() > 0.5) piece.style.borderRadius = '50%';
      container.appendChild(piece);
    }

    setTimeout(function() { container.remove(); }, 2500);
  }

  function showCompletionBanner(score, total) {
    var existing = document.querySelector('.completion-banner');
    if (existing) return;

    var btn = document.getElementById('completeBtn');
    if (!btn) return;

    var banner = document.createElement('div');
    banner.className = 'completion-banner';
    banner.innerHTML = '<span class="check-icon">✓</span>' +
      '<div class="congrats-text">Lesson complete!</div>' +
      '<div class="score-text">' + score + ' / ' + total + ' correct</div>';
    btn.parentNode.insertBefore(banner, btn.nextSibling);

    showConfetti();
  }

  window._courseAnimations = {
    initScrollAnimations: initScrollAnimations,
    showConfetti: showConfetti,
    showCompletionBanner: showCompletionBanner
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }
})();
