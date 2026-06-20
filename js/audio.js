var audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, btn, duration) {
  duration = duration || 0.8;
  var ctx = getAudioCtx();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
  if (btn) {
    btn.classList.add('playing');
    setTimeout(function() { btn.classList.remove('playing'); }, duration * 1000);
  }
}

function playRisingTone(startFreq, endFreq, btn, duration) {
  duration = duration || 0.8;
  var ctx = getAudioCtx();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
  if (btn) {
    btn.classList.add('playing');
    setTimeout(function() { btn.classList.remove('playing'); }, duration * 1000);
  }
}

function playFallingTone(startFreq, endFreq, btn, duration) {
  duration = duration || 0.8;
  playRisingTone(startFreq, endFreq, btn, duration);
}

var TONE_MAP = {
  1: { type: 'level', freq: 350 },
  2: { type: 'rising', start: 250, end: 350 },
  3: { type: 'level', freq: 250 },
  4: { type: 'falling', start: 250, end: 180 },
  5: { type: 'rising', start: 180, end: 250 },
  6: { type: 'level', freq: 180 }
};

function playToneByNumber(num, btn, duration) {
  var t = TONE_MAP[num];
  if (!t) return;
  if (t.type === 'level') {
    playTone(t.freq, btn, duration);
  } else {
    playRisingTone(t.start, t.end, btn, duration);
  }
}

var _cantoVoice = null;
var _voiceReady = false;
var _voiceCallbacks = [];

function _findBestVoice() {
  var voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  var priorities = [
    function(v) { return v.lang === 'yue-HK' || v.lang === 'yue'; },
    function(v) { return v.lang === 'zh-HK' || v.lang.indexOf('zh-HK') === 0; },
    function(v) { return v.lang.indexOf('yue') === 0; },
    function(v) { return v.lang === 'zh-TW' || v.lang.indexOf('zh-TW') === 0; },
    function(v) { return v.lang === 'zh-CN' || v.lang.indexOf('zh-CN') === 0; },
    function(v) { return v.lang === 'zh' || v.lang.indexOf('zh') === 0; }
  ];

  for (var i = 0; i < priorities.length; i++) {
    var match = voices.find(priorities[i]);
    if (match) return match;
  }
  return null;
}

function _initVoices() {
  var voice = _findBestVoice();
  if (voice) {
    _cantoVoice = voice;
    _voiceReady = true;
    _voiceCallbacks.forEach(function(cb) { cb(voice); });
    _voiceCallbacks = [];
  }
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = _initVoices;
  _initVoices();
  setTimeout(_initVoices, 100);
  setTimeout(_initVoices, 500);
  setTimeout(_initVoices, 1500);
}

function getCantoVoice() {
  if (_voiceReady) return _cantoVoice;
  _initVoices();
  return _cantoVoice;
}

function speakCantonese(text, toneNum) {
  var voice = getCantoVoice();
  if (voice) {
    speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = voice.lang;
    utter.rate = 0.75;
    speechSynthesis.speak(utter);
  } else if (toneNum) {
    playToneByNumber(toneNum, null, 0.6);
  }
}

function showTtsStatus(containerId) {
  function update() {
    var el = document.getElementById(containerId);
    if (!el) return;
    var voice = getCantoVoice();
    if (voice) {
      el.style.display = 'block';
      var isCantonese = voice.lang.indexOf('yue') === 0 || voice.lang.indexOf('zh-HK') === 0;
      if (isCantonese) {
        el.textContent = 'Cantonese voice active (' + voice.name + '). Audio buttons play real speech.';
      } else {
        el.textContent = 'Using ' + voice.name + ' (' + voice.lang + ') for audio. Tones may not be perfectly accurate — practise with your partner.';
      }
    } else {
      var voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        el.style.display = 'block';
        el.innerHTML = 'No Chinese voice found. Audio buttons play pitch tones only. For real pronunciation, try <a href="https://jyutping.org/en/docs/tone/">Jyutping.org</a> or ask your partner.';
      }
    }
  }
  update();
  setTimeout(update, 600);
  setTimeout(update, 2000);
}
