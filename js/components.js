function QuizComponent(container, questions) {
  var totalCorrect = 0;
  var totalAnswered = 0;

  function render() {
    totalCorrect = 0;
    totalAnswered = 0;
    container.innerHTML = '';

    questions.forEach(function(q, qi) {
      var div = document.createElement('div');
      div.className = 'question';
      var p = document.createElement('p');
      p.textContent = (qi + 1) + '. ' + q.question;
      div.appendChild(p);

      q.options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.textContent = opt.text;
        btn.onclick = function() {
          var buttons = div.querySelectorAll('button');
          buttons.forEach(function(b) { b.disabled = true; b.classList.remove('correct', 'wrong'); });
          totalAnswered++;
          if (opt.correct) {
            btn.classList.add('correct');
            totalCorrect++;
          } else {
            btn.classList.add('wrong');
            buttons.forEach(function(b) {
              if (b._isCorrect) b.classList.add('correct');
            });
          }
          if (totalAnswered === questions.length) {
            showRetry();
            if (container._onComplete) {
              container._onComplete(totalCorrect, questions.length);
            }
          }
        };
        btn._isCorrect = opt.correct;
        div.appendChild(btn);
      });
      container.appendChild(div);
    });
  }

  function showRetry() {
    if (container.querySelector('.quiz-retry')) return;
    var row = document.createElement('div');
    row.style.cssText = 'text-align:center;margin-top:1rem;';
    var retryBtn = document.createElement('button');
    retryBtn.className = 'reset-btn quiz-retry';
    retryBtn.textContent = 'Retry Quiz';
    retryBtn.onclick = function() {
      render();
    };
    row.appendChild(retryBtn);
    container.appendChild(row);
  }

  render();

  container.getScore = function() { return { correct: totalCorrect, total: questions.length }; };
  container.isComplete = function() { return totalAnswered === questions.length; };
}

function EarTrainerComponent(container, tones, targetStreak) {
  targetStreak = targetStreak || 5;
  var currentTone = null;
  var correct = 0;
  var total = 0;
  var streak = 0;

  var html = '<h3>A tone will play. Which one is it?</h3>' +
    '<p>Click "Play tone" to hear a random tone, then guess. Try to get ' + targetStreak + ' in a row.</p>' +
    '<div class="ear-controls">' +
    '<button class="ear-play" id="earPlayBtn">&#9654; Play tone</button>';

  tones.forEach(function(t) {
    html += '<button class="guess-btn" data-guess="' + t.key + '">' + t.label + '</button>';
  });

  html += '<button class="hear-btn" id="replayBtn" style="display:none;">&#128257; Replay</button></div>' +
    '<div class="ear-score">Score: <span id="earCorrect">0</span> / <span id="earTotal">0</span>' +
    ' &nbsp; Streak: <span class="streak" id="earStreak">0</span></div>';

  container.innerHTML = html;

  container.querySelector('#earPlayBtn').onclick = function() {
    var idx = Math.floor(Math.random() * tones.length);
    currentTone = tones[idx];
    playToneByNumber(currentTone.toneNum, null, 0.8);
    container.querySelectorAll('.guess-btn').forEach(function(b) {
      b.disabled = false;
      b.classList.remove('correct-guess', 'wrong-guess');
    });
    container.querySelector('#replayBtn').style.display = 'inline-block';
  };

  container.querySelector('#replayBtn').onclick = function() {
    if (currentTone) playToneByNumber(currentTone.toneNum, null, 0.8);
  };

  container.querySelectorAll('.guess-btn').forEach(function(btn) {
    btn.onclick = function() {
      if (!currentTone) return;
      total++;
      container.querySelectorAll('.guess-btn').forEach(function(b) { b.disabled = true; });

      if (btn.dataset.guess === currentTone.key) {
        btn.classList.add('correct-guess');
        correct++;
        streak++;
      } else {
        btn.classList.add('wrong-guess');
        container.querySelectorAll('.guess-btn').forEach(function(b) {
          if (b.dataset.guess === currentTone.key) b.classList.add('correct-guess');
        });
        streak = 0;
      }

      container.querySelector('#earCorrect').textContent = correct;
      container.querySelector('#earTotal').textContent = total;
      container.querySelector('#earStreak').textContent = streak;

      if (streak >= targetStreak) {
        var scoreEl = container.querySelector('.ear-score');
        if (!scoreEl.querySelector('.success-msg')) {
          var msg = document.createElement('strong');
          msg.className = 'success-msg';
          msg.style.color = '#27ae60';
          msg.innerHTML = ' &nbsp; &#10003; ' + targetStreak + ' in a row! Well done.';
          scoreEl.appendChild(msg);
        }
      }
    };
  });
}

function WordSortComponent(container, words, categories) {
  var selectedEl = null;
  var placements = {};

  var bankHtml = '<div class="word-bank" id="sortBank">';
  words.forEach(function(w) {
    bankHtml += '<span class="drag-word" data-tone="' + w.correctCategory + '" data-word="' + w.id + '" data-hz="' + (w.hz || '') + '">' + w.label + '</span>';
  });
  bankHtml += '</div><div class="sort-zone">';

  categories.forEach(function(c) {
    bankHtml += '<div class="drop-shelf ' + (c.className || '') + '" data-target="' + c.id + '">' +
      '<div class="zone-label">' + c.label + '</div>' +
      '<div class="placed-words" id="placed_' + c.id + '"></div></div>';
  });

  bankHtml += '</div><button class="check-btn" id="sortCheck">Check</button>' +
    '<button class="reset-btn" id="sortReset">Reset</button>' +
    '<div class="score-display" id="sortScore"></div>';

  container.innerHTML = bankHtml;

  container.querySelectorAll('.drag-word').forEach(function(el) {
    el.onclick = function() {
      if (el.classList.contains('placed')) return;
      container.querySelectorAll('.drag-word').forEach(function(w) { w.classList.remove('selected-word'); });
      el.classList.add('selected-word');
      selectedEl = el;
      if (el.dataset.hz) playTone(parseInt(el.dataset.hz), null, 0.4);
      else if (el.dataset.tone) playToneByNumber(parseInt(el.dataset.tone), null, 0.4);
    };
  });

  container.querySelectorAll('.drop-shelf').forEach(function(shelf) {
    shelf.onclick = function() {
      if (!selectedEl) return;
      var target = shelf.dataset.target;
      var word = selectedEl.dataset.word;
      var tone = selectedEl.dataset.tone;
      var text = selectedEl.textContent;
      var placedContainer = shelf.querySelector('.placed-words');
      var span = document.createElement('span');
      span.className = 'placed-word';
      span.textContent = text;
      span.dataset.tone = tone;
      span.dataset.target = target;
      span.onclick = function() {
        span.remove();
        var orig = container.querySelector('.drag-word[data-word="' + word + '"]');
        if (orig) { orig.classList.remove('placed', 'selected-word'); }
        delete placements[word];
      };
      placedContainer.appendChild(span);
      placements[word] = { tone: tone, target: target };
      selectedEl.classList.add('placed');
      selectedEl.classList.remove('selected-word');
      selectedEl = null;
    };
  });

  container.querySelector('#sortCheck').onclick = function() {
    var correctCount = 0, totalCount = 0;
    container.querySelectorAll('.placed-word').forEach(function(pw) {
      totalCount++;
      if (pw.dataset.tone === pw.dataset.target) {
        pw.classList.add('correct-placed');
        pw.classList.remove('wrong-placed');
        correctCount++;
      } else {
        pw.classList.add('wrong-placed');
        pw.classList.remove('correct-placed');
      }
    });
    var unplaced = container.querySelectorAll('.drag-word:not(.placed)').length;
    var scoreEl = container.querySelector('#sortScore');
    if (unplaced > 0) {
      scoreEl.textContent = unplaced + ' word(s) still need placing!';
    } else {
      scoreEl.textContent = correctCount === totalCount
        ? correctCount + '/' + totalCount + ' correct!'
        : correctCount + '/' + totalCount + ' correct. Click wrong ones to move them.';
    }
  };

  container.querySelector('#sortReset').onclick = function() {
    container.querySelectorAll('.placed-word').forEach(function(pw) { pw.remove(); });
    container.querySelectorAll('.drag-word').forEach(function(w) { w.classList.remove('placed', 'selected-word'); });
    placements = {};
    selectedEl = null;
    container.querySelector('#sortScore').textContent = '';
  };
}

function MatchingComponent(container, pairs, leftLabel, rightLabel) {
  leftLabel = leftLabel || 'Cantonese';
  rightLabel = rightLabel || 'English';
  var shuffledLeft = pairs.map(function(p, i) { return { text: p.left, idx: i }; });
  var shuffledRight = pairs.map(function(p, i) { return { text: p.right, idx: i }; });
  shuffledLeft.sort(function() { return Math.random() - 0.5; });
  shuffledRight.sort(function() { return Math.random() - 0.5; });

  var selectedSide = null;
  var selectedIdx = null;
  var matched = 0;

  var html = '<div class="matching-header"><span>' + leftLabel + '</span><span>' + rightLabel + '</span></div>';
  html += '<div class="matching-grid">';
  shuffledLeft.forEach(function(item) {
    html += '<div class="match-item" data-side="left" data-idx="' + item.idx + '">' + item.text + '</div>';
    var rightItem = shuffledRight.shift() || { text: '', idx: -1 };
    html += '<div class="match-item" data-side="right" data-idx="' + rightItem.idx + '">' + rightItem.text + '</div>';
  });
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.match-item').forEach(function(el) {
    el.onclick = function() {
      if (el.classList.contains('matched')) return;

      if (selectedSide === null) {
        el.classList.add('selected');
        selectedSide = el.dataset.side;
        selectedIdx = parseInt(el.dataset.idx);
      } else if (el.dataset.side === selectedSide) {
        container.querySelectorAll('.match-item.selected').forEach(function(s) { s.classList.remove('selected'); });
        el.classList.add('selected');
        selectedIdx = parseInt(el.dataset.idx);
      } else {
        var clickedIdx = parseInt(el.dataset.idx);
        if (clickedIdx === selectedIdx) {
          el.classList.add('matched');
          el.classList.remove('selected');
          container.querySelector('.match-item.selected').classList.add('matched');
          container.querySelector('.match-item.selected').classList.remove('selected');
          matched++;
        } else {
          el.classList.add('wrong-match');
          setTimeout(function() {
            el.classList.remove('wrong-match');
            container.querySelectorAll('.match-item.selected').forEach(function(s) { s.classList.remove('selected'); });
          }, 600);
        }
        selectedSide = null;
        selectedIdx = null;
      }
    };
  });
}

function SentenceBuilderComponent(container, words, correctOrder, onCheck) {
  var slots = [];

  var html = '<div class="sentence-slots" id="sentenceSlots"></div>' +
    '<div class="word-bank" id="sentenceBank">';
  var shuffled = words.slice().sort(function() { return Math.random() - 0.5; });
  shuffled.forEach(function(w) {
    html += '<span class="drag-word" data-word="' + w + '">' + w + '</span>';
  });
  html += '</div>' +
    '<button class="check-btn" id="sentenceCheck">Check</button>' +
    '<button class="reset-btn" id="sentenceReset">Reset</button>' +
    '<div class="score-display" id="sentenceScore"></div>';

  container.innerHTML = html;

  container.querySelectorAll('#sentenceBank .drag-word').forEach(function(el) {
    el.onclick = function() {
      if (el.classList.contains('placed')) return;
      var slotsDiv = container.querySelector('#sentenceSlots');
      var span = document.createElement('span');
      span.className = 'sentence-slot-item';
      span.textContent = el.dataset.word;
      span.dataset.word = el.dataset.word;
      span.onclick = function() {
        span.remove();
        el.classList.remove('placed');
        slots = slots.filter(function(s) { return s !== span; });
      };
      slotsDiv.appendChild(span);
      slots.push(span);
      el.classList.add('placed');
    };
  });

  container.querySelector('#sentenceCheck').onclick = function() {
    var built = slots.map(function(s) { return s.dataset.word; });
    var isCorrect = built.join(' ') === correctOrder.join(' ');
    var scoreEl = container.querySelector('#sentenceScore');
    if (built.length < words.length) {
      scoreEl.textContent = 'Place all words first!';
    } else if (isCorrect) {
      scoreEl.innerHTML = '<strong style="color:#27ae60;">&#10003; Correct!</strong>';
      if (onCheck) onCheck(true);
    } else {
      scoreEl.innerHTML = '<span style="color:#dc3545;">Not quite. Try rearranging.</span>';
      if (onCheck) onCheck(false);
    }
  };

  container.querySelector('#sentenceReset').onclick = function() {
    container.querySelector('#sentenceSlots').innerHTML = '';
    container.querySelectorAll('#sentenceBank .drag-word').forEach(function(w) { w.classList.remove('placed'); });
    slots = [];
    container.querySelector('#sentenceScore').textContent = '';
  };
}

function FlashcardComponent(container, cards) {
  var idx = 0;
  var flipped = false;

  function render() {
    var card = cards[idx];
    container.innerHTML =
      '<div class="flashcard-container"><div class="flashcard" id="flashcardInner">' +
      '<div class="flashcard-front">' +
      '<div class="flashcard-jyutping">' + card.jyutping + '</div>' +
      (card.characters ? '<div class="flashcard-chars">' + card.characters + '</div>' : '') +
      '<div style="margin-top:0.5rem;"><button class="hear-btn" id="fcAudio">&#128264; Hear it</button></div>' +
      '</div>' +
      '<div class="flashcard-back">' +
      '<div class="flashcard-english">' + card.english + '</div>' +
      (card.note ? '<div style="font-size:0.85rem;color:var(--muted);margin-top:0.5rem;">' + card.note + '</div>' : '') +
      '</div></div></div>' +
      '<div class="flashcard-counter">' + (idx + 1) + ' / ' + cards.length + '</div>' +
      '<div class="flashcard-controls">' +
      '<button class="flashcard-nav" id="fcPrev">&larr; Prev</button>' +
      '<button class="flashcard-nav" id="fcFlip">Flip</button>' +
      '<button class="flashcard-nav" id="fcNext">Next &rarr;</button>' +
      '</div>';

    flipped = false;

    container.querySelector('#flashcardInner').onclick = function() {
      flipped = !flipped;
      this.classList.toggle('flipped', flipped);
    };
    container.querySelector('#fcFlip').onclick = function() {
      flipped = !flipped;
      container.querySelector('#flashcardInner').classList.toggle('flipped', flipped);
    };
    container.querySelector('#fcAudio').onclick = function(e) {
      e.stopPropagation();
      if (card.characters && card.characters.length <= 4) speakCantonese(card.characters, card.tone);
      else playToneByNumber(card.tone, null, 0.5);
    };
    container.querySelector('#fcPrev').onclick = function() { if (idx > 0) { idx--; render(); } };
    container.querySelector('#fcNext').onclick = function() { if (idx < cards.length - 1) { idx++; render(); } };
  }

  render();
}

function DialogueComponent(container, turns) {
  var html = '<div class="dialogue">';
  turns.forEach(function(turn) {
    var cls = turn.speaker === 'B' ? 'speaker-b' : '';
    html += '<div class="dialogue-turn ' + cls + '">' +
      '<div class="dialogue-speaker">' + turn.speaker + '</div>' +
      '<div class="dialogue-bubble">' +
      '<div class="canto">' + turn.cantonese + '</div>' +
      '<div class="jyutping">' + turn.jyutping + '</div>' +
      '<div class="english">' + turn.english + '</div>' +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function setupLessonCompletion(lessonId, quizContainer, vocabKeys) {
  var btn = document.getElementById('completeBtn');
  if (!btn) return;

  if (isLessonComplete(lessonId)) {
    btn.textContent = 'Completed!';
    btn.classList.add('completed');
    btn.disabled = true;
    var data = getLessonData(lessonId);
    if (data && data.quizScore !== undefined) {
      btn.textContent = 'Completed! (' + data.quizScore + '/' + data.quizTotal + ')';
    }
    return;
  }

  btn.classList.add('waiting');
  btn.textContent = 'Complete the quiz first';
  btn.disabled = true;

  var origOnComplete = quizContainer._onComplete;
  quizContainer._onComplete = function(correct, total) {
    if (origOnComplete) origOnComplete(correct, total);
    btn.classList.remove('waiting');
    btn.disabled = false;
    btn.textContent = 'Mark Complete (' + correct + '/' + total + ')';
  };

  btn.onclick = function() {
    if (!quizContainer.isComplete || !quizContainer.isComplete()) return;
    var score = quizContainer.getScore();
    markLessonComplete(lessonId, score.correct, score.total);
    if (vocabKeys) recordVocabSeen(vocabKeys, lessonId);
    btn.textContent = 'Completed! (' + score.correct + '/' + score.total + ')';
    btn.classList.add('completed', 'just-completed');
    btn.disabled = true;
    if (window._courseAnimations) {
      window._courseAnimations.showCompletionBanner(score.correct, score.total);
    }
  };
}

function addScrollProgress() {
  var bar = document.createElement('div');
  bar.className = 'lesson-progress';
  bar.style.width = '0%';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      bar.style.width = Math.min(100, Math.round((scrollTop / docHeight) * 100)) + '%';
    }
  });
}
