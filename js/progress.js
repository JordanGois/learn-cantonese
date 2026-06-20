var STORAGE_KEY = 'cantonese_course';

function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    version: 1,
    lessons: {},
    vocabulary: {},
    streaks: { currentStreak: 0, lastDate: null, longestStreak: 0 },
    settings: { audioEnabled: true }
  };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function markLessonComplete(lessonId, score, total) {
  var data = loadData();
  var today = new Date().toISOString().slice(0, 10);
  data.lessons[lessonId] = {
    completed: true,
    completedAt: new Date().toISOString(),
    quizScore: score,
    quizTotal: total
  };
  var streaks = data.streaks;
  if (streaks.lastDate !== today) {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yStr = yesterday.toISOString().slice(0, 10);
    if (streaks.lastDate === yStr) {
      streaks.currentStreak++;
    } else {
      streaks.currentStreak = 1;
    }
    streaks.lastDate = today;
    if (streaks.currentStreak > streaks.longestStreak) {
      streaks.longestStreak = streaks.currentStreak;
    }
  }
  saveData(data);
  return data;
}

function isLessonComplete(lessonId) {
  var data = loadData();
  return !!(data.lessons[lessonId] && data.lessons[lessonId].completed);
}

function getLessonData(lessonId) {
  var data = loadData();
  return data.lessons[lessonId] || null;
}

function getLessonProgress() {
  var data = loadData();
  var total = 10;
  var completed = 0;
  for (var i = 1; i <= total; i++) {
    var id = String(i).padStart(4, '0');
    if (data.lessons[id] && data.lessons[id].completed) completed++;
  }
  return { completed: completed, total: total, percentage: Math.round((completed / total) * 100) };
}

function getStreak() {
  var data = loadData();
  var today = new Date().toISOString().slice(0, 10);
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yStr = yesterday.toISOString().slice(0, 10);
  if (data.streaks.lastDate === today) return data.streaks.currentStreak;
  if (data.streaks.lastDate === yStr) return data.streaks.currentStreak;
  return 0;
}

function getNextLesson() {
  var data = loadData();
  for (var i = 1; i <= 10; i++) {
    var id = String(i).padStart(4, '0');
    if (!data.lessons[id] || !data.lessons[id].completed) return id;
  }
  return null;
}

function recordVocabSeen(words, lessonId) {
  var data = loadData();
  words.forEach(function(w) {
    if (!data.vocabulary[w]) {
      data.vocabulary[w] = {
        firstSeen: lessonId,
        nextReview: new Date(Date.now() + 86400000).toISOString(),
        easeFactor: 2.5,
        interval: 1,
        reviews: []
      };
    }
  });
  saveData(data);
}

function getVocabDueForReview() {
  var data = loadData();
  var now = new Date().toISOString();
  var due = [];
  for (var word in data.vocabulary) {
    if (data.vocabulary[word].nextReview <= now) {
      due.push(word);
    }
  }
  return due;
}

function recordVocabReview(word, correct) {
  var data = loadData();
  var v = data.vocabulary[word];
  if (!v) return;
  v.reviews.push({ date: new Date().toISOString(), correct: correct });
  if (correct) {
    v.interval = Math.round(v.interval * v.easeFactor);
    v.easeFactor = Math.min(3.0, v.easeFactor + 0.1);
  } else {
    v.interval = 1;
    v.easeFactor = Math.max(1.3, v.easeFactor - 0.2);
  }
  v.nextReview = new Date(Date.now() + v.interval * 86400000).toISOString();
  saveData(data);
}

function getWordsLearned() {
  var data = loadData();
  return Object.keys(data.vocabulary).length;
}
