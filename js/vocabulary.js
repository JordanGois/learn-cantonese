var VOCAB = {
  // Lesson 1: Tones and First Words
  "nei5":   { jyutping: "nei5",   tone: 5, english: "you",                     characters: "你",     lesson: 1, category: "pronoun" },
  "hou2":   { jyutping: "hou2",   tone: 2, english: "good",                    characters: "好",     lesson: 1, category: "adjective" },
  "do1":    { jyutping: "do1",    tone: 1, english: "many/much",               characters: "多",     lesson: 1, category: "adjective" },
  "ze6":    { jyutping: "ze6",    tone: 6, english: "thank (in do1 ze6)",      characters: "謝",     lesson: 1, category: "verb" },
  "m4":     { jyutping: "m4",     tone: 4, english: "not (negation prefix)",   characters: "唔",     lesson: 1, category: "particle" },
  "goi1":   { jyutping: "goi1",   tone: 1, english: "should/ought",            characters: "該",     lesson: 1, category: "verb" },
  "ngo5":   { jyutping: "ngo5",   tone: 5, english: "I/me",                    characters: "我",     lesson: 1, category: "pronoun" },
  "oi3":    { jyutping: "oi3",    tone: 3, english: "love",                    characters: "愛",     lesson: 1, category: "verb" },

  // Lesson 2: Three Shelves (level tones)
  "saam1":  { jyutping: "saam1",  tone: 1, english: "three",                   characters: "三",     lesson: 2, category: "number" },
  "sei3":   { jyutping: "sei3",   tone: 3, english: "four",                    characters: "四",     lesson: 2, category: "number" },
  "ji6":    { jyutping: "ji6",    tone: 6, english: "two",                     characters: "二",     lesson: 2, category: "number" },
  "sik6":   { jyutping: "sik6",   tone: 6, english: "to eat",                  characters: "食",     lesson: 2, category: "verb" },
  "sam1":   { jyutping: "sam1",   tone: 1, english: "heart",                   characters: "心",     lesson: 2, category: "noun" },
  "fu1":    { jyutping: "fu1",    tone: 1, english: "husband",                 characters: "夫",     lesson: 2, category: "noun" },

  // Lesson 3: Rising Tones
  "si1":    { jyutping: "si1",    tone: 1, english: "poem",                    characters: "詩",     lesson: 3, category: "noun" },
  "si2":    { jyutping: "si2",    tone: 2, english: "history",                 characters: "史",     lesson: 3, category: "noun" },
  "si3":    { jyutping: "si3",    tone: 3, english: "to try",                  characters: "試",     lesson: 3, category: "verb" },
  "si5":    { jyutping: "si5",    tone: 5, english: "market",                  characters: "市",     lesson: 3, category: "noun" },
  "si6":    { jyutping: "si6",    tone: 6, english: "matter/thing",            characters: "事",     lesson: 3, category: "noun" },
  "gau2":   { jyutping: "gau2",   tone: 2, english: "nine",                    characters: "九",     lesson: 3, category: "number" },
  "jyu5":   { jyutping: "jyu5",   tone: 5, english: "rain",                    characters: "雨",     lesson: 3, category: "noun" },
  "mou5":   { jyutping: "mou5",   tone: 5, english: "not have/none",           characters: "無",     lesson: 3, category: "verb" },
  "maai5":  { jyutping: "maai5",  tone: 5, english: "to buy",                  characters: "買",     lesson: 3, category: "verb" },
  "mai6":   { jyutping: "mai6",   tone: 6, english: "to sell",                 characters: "賣",     lesson: 3, category: "verb" },

  // Lesson 4: Low Falling Tone
  "si4":    { jyutping: "si4",    tone: 4, english: "time",                    characters: "時",     lesson: 4, category: "noun" },
  "jyu4":   { jyutping: "jyu4",   tone: 4, english: "like/as if",             characters: "如",     lesson: 4, category: "particle" },
  "min4":   { jyutping: "min4",   tone: 4, english: "people",                  characters: "民",     lesson: 4, category: "noun" },
  "wai4":   { jyutping: "wai4",   tone: 4, english: "to surround/for",        characters: "圍",     lesson: 4, category: "verb" },
  "cin4":   { jyutping: "cin4",   tone: 4, english: "before/front",            characters: "前",     lesson: 4, category: "noun" },
  "naam4":  { jyutping: "naam4",  tone: 4, english: "male/south",              characters: "男",     lesson: 4, category: "noun" },

  // Lesson 5: All Six Tones Together (review + integration)
  // Uses words from lessons 1-4 plus:
  "jat1":   { jyutping: "jat1",   tone: 1, english: "one",                     characters: "一",     lesson: 5, category: "number" },
  "tin1":   { jyutping: "tin1",   tone: 1, english: "sky/day",                 characters: "天",     lesson: 5, category: "noun" },

  // Lesson 6: Greetings and Goodbyes
  "zou2":   { jyutping: "zou2",   tone: 2, english: "early/morning",           characters: "早",     lesson: 6, category: "adjective" },
  "san4":   { jyutping: "san4",   tone: 4, english: "spirit/god",              characters: "神",     lesson: 6, category: "noun" },
  "maan5":  { jyutping: "maan5",  tone: 5, english: "evening/late",            characters: "晚",     lesson: 6, category: "noun" },
  "on1":    { jyutping: "on1",    tone: 1, english: "peace/safe",              characters: "安",     lesson: 6, category: "adjective" },
  "baai1":  { jyutping: "baai1",  tone: 1, english: "bye (1st syllable)",      characters: "Bye",        lesson: 6, category: "phrase" },
  "baai3":  { jyutping: "baai3",  tone: 3, english: "bye (2nd syllable)",      characters: "Bye",        lesson: 6, category: "phrase" },
  "joi3":   { jyutping: "joi3",   tone: 3, english: "again",                   characters: "再",     lesson: 6, category: "adverb" },
  "gin3":   { jyutping: "gin3",   tone: 3, english: "to see",                  characters: "見",     lesson: 6, category: "verb" },
  "maa3":   { jyutping: "maa3",   tone: 3, english: "question particle (yes/no)", characters: "嗎",  lesson: 6, category: "particle" },
  "gei2":   { jyutping: "gei2",   tone: 2, english: "quite/how",               characters: "幾",     lesson: 6, category: "adverb" },

  // Lesson 7: Pronouns and To Be
  "keoi5":  { jyutping: "keoi5",  tone: 5, english: "he/she/it",               characters: "佢",     lesson: 7, category: "pronoun" },
  "dei6":   { jyutping: "dei6",   tone: 6, english: "plural suffix (for pronouns)", characters: "地", lesson: 7, category: "particle" },
  "hai6":   { jyutping: "hai6",   tone: 6, english: "to be/is",                characters: "係",     lesson: 7, category: "verb" },
  "bin1":   { jyutping: "bin1",   tone: 1, english: "which",                   characters: "邊",     lesson: 7, category: "pronoun" },
  "go3":    { jyutping: "go3",    tone: 3, english: "classifier (general)",    characters: "個",     lesson: 7, category: "classifier" },
  "ge3":    { jyutping: "ge3",    tone: 3, english: "possessive/emphasis particle", characters: "嘅", lesson: 7, category: "particle" },

  // Lesson 8: Numbers 1-10
  "ng5":    { jyutping: "ng5",    tone: 5, english: "five",                    characters: "五",     lesson: 8, category: "number" },
  "luk6":   { jyutping: "luk6",   tone: 6, english: "six",                     characters: "六",     lesson: 8, category: "number" },
  "cat1":   { jyutping: "cat1",   tone: 1, english: "seven",                   characters: "七",     lesson: 8, category: "number" },
  "baat3":  { jyutping: "baat3",  tone: 3, english: "eight",                   characters: "八",     lesson: 8, category: "number" },
  "sap6":   { jyutping: "sap6",   tone: 6, english: "ten",                     characters: "十",     lesson: 8, category: "number" },

  // Lesson 9: Family Words
  "baa4":     { jyutping: "baa4",     tone: 4, english: "dad (1st syllable)",     characters: "爸",   lesson: 9, category: "noun" },
  "baa1":     { jyutping: "baa1",     tone: 1, english: "dad (2nd syllable)",     characters: "爸",   lesson: 9, category: "noun" },
  "maa4":     { jyutping: "maa4",     tone: 4, english: "mom (1st syllable)",     characters: "媽",   lesson: 9, category: "noun" },
  "maa1":     { jyutping: "maa1",     tone: 1, english: "mom (2nd syllable)",     characters: "媽",   lesson: 9, category: "noun" },
  "go1":      { jyutping: "go1",      tone: 1, english: "older brother",          characters: "哥",   lesson: 9, category: "noun" },
  "ze2":      { jyutping: "ze2",      tone: 2, english: "older sister (1st)",     characters: "姐",   lesson: 9, category: "noun" },
  "ze1":      { jyutping: "ze1",      tone: 1, english: "older sister (2nd)",     characters: "姐",   lesson: 9, category: "noun" },
  "dai6":     { jyutping: "dai6",     tone: 6, english: "younger brother (1st)",  characters: "弟",   lesson: 9, category: "noun" },
  "dai2":     { jyutping: "dai2",     tone: 2, english: "younger brother (2nd)",  characters: "弟",   lesson: 9, category: "noun" },
  "mui4":     { jyutping: "mui4",     tone: 4, english: "younger sister (1st)",   characters: "妹",   lesson: 9, category: "noun" },
  "mui2":     { jyutping: "mui2",     tone: 2, english: "younger sister (2nd)",   characters: "妹",   lesson: 9, category: "noun" },
  "lou5":     { jyutping: "lou5",     tone: 5, english: "old (in lou5 gung1)",    characters: "老",   lesson: 9, category: "noun" },
  "gung1":    { jyutping: "gung1",    tone: 1, english: "male/work",              characters: "公",   lesson: 9, category: "noun" },
  "po4":      { jyutping: "po4",      tone: 4, english: "woman (in lou5 po4)",    characters: "婆",   lesson: 9, category: "noun" },

  // Lesson 10: Yes/No Questions
  "hai6m4hai6": { jyutping: "hai6 m4 hai6", tone: 6, english: "is it or not? (A-not-A)", characters: "係唔係", lesson: 10, category: "phrase" },
  "dim2":     { jyutping: "dim2",     tone: 2, english: "how/what",                characters: "點",   lesson: 10, category: "pronoun" },
  "mat1":     { jyutping: "mat1",     tone: 1, english: "what (in mat1 je5)",      characters: "乞",   lesson: 10, category: "pronoun" },
  "je5":      { jyutping: "je5",      tone: 5, english: "thing (in mat1 je5)",     characters: "野",   lesson: 10, category: "noun" },
  "zung1":    { jyutping: "zung1",    tone: 1, english: "like/fond of",            characters: "鑽",   lesson: 10, category: "verb" },
  "ji4":      { jyutping: "ji4",      tone: 4, english: "meaning/idea (in ji4 si1)", characters: "意", lesson: 10, category: "noun" }
};

function getVocabByLesson(lessonNum) {
  var result = [];
  for (var key in VOCAB) {
    if (VOCAB[key].lesson === lessonNum) result.push(VOCAB[key]);
  }
  return result;
}

function getVocabUpToLesson(lessonNum) {
  var result = [];
  for (var key in VOCAB) {
    if (VOCAB[key].lesson <= lessonNum) result.push(VOCAB[key]);
  }
  return result;
}

function lookupWord(jyutping) {
  return VOCAB[jyutping] || null;
}
