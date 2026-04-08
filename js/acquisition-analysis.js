/* =============================================
   Acquisition Analysis Engine - Wordbydandan
   Analyzes word acquisition by order (not time)
   ============================================= */
var AcquisitionAnalysis = (function () {
  'use strict';

  var CAT_COLORS = {
    general_nominals: '#6C5CE7',
    specific_nominals: '#FF6B9D',
    action_words: '#4DD0E1',
    modifiers: '#FFD93D',
    personal_social: '#CE93D8',
  };

  var CAT_LABELS = {
    general_nominals: 'שמות עצם כלליים',
    specific_nominals: 'שמות עצם ספציפיים',
    action_words: 'מילות פעולה',
    modifiers: 'מתארים',
    personal_social: 'אינטראקציה וחברה',
  };

  var CAT_ORDER = [
    'general_nominals', 'specific_nominals', 'personal_social',
    'action_words', 'modifiers'
  ];

  var SUB_CAT_LABELS = {
    animals: 'חיות', food_drink: 'אוכל ושתייה', body_parts: 'גוף',
    clothing: 'ביגוד', household: 'בית', toys_and_routines: 'צעצועים',
    outside: 'חוץ', people: 'אנשים', actions: 'פעולות',
    attributes: 'תכונות', routines_and_games: 'שגרה ומשחקים',
    sound_effects: 'אפקטי קול', assertions: 'ביטויים', unclear: 'לא ברור'
  };

  // ==========================================
  // DATA LAYER
  // ==========================================

  function getAcquisitionOrder(wordsList) {
    // Filter out linked_to variants (evolution steps, not new words)
    var unique = wordsList.filter(function (w) { return !w.linked_to; });
    // Sort by age_months ASC, then created_at ASC (stable acquisition order)
    unique.sort(function (a, b) {
      var ageDiff = (a.age_months || 0) - (b.age_months || 0);
      if (ageDiff !== 0) return ageDiff;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    // Number them
    return unique.map(function (w, i) {
      return {
        index: i + 1,
        word: w.word,
        id: w.id,
        age_months: w.age_months,
        category: resolveCategory(w),
        sub_category: resolveSubCategory(w),
        notes: w.notes
      };
    });
  }

  function resolveCategory(w) {
    if (w.cdi_category && w.cdi_category !== 'unclear') return w.cdi_category;
    // Fallback to vocabLookup if available
    if (typeof vocabLookup !== 'undefined' && vocabLookup[w.word]) {
      var entry = vocabLookup[w.word];
      if (entry.cdi_category && entry.cdi_category !== 'unclear') return entry.cdi_category;
    }
    return null;
  }

  function resolveSubCategory(w) {
    if (w.sub_category && w.sub_category !== 'unclear') return w.sub_category;
    if (typeof vocabLookup !== 'undefined' && vocabLookup[w.word]) {
      var entry = vocabLookup[w.word];
      if (entry.sub_category && entry.sub_category !== 'unclear') return entry.sub_category;
    }
    return null;
  }

  function getCumulativeCategories(ordered, upToIndex) {
    var counts = {};
    var total = 0;
    CAT_ORDER.forEach(function (c) { counts[c] = 0; });
    for (var i = 0; i < Math.min(upToIndex, ordered.length); i++) {
      var cat = ordered[i].category;
      if (cat && counts.hasOwnProperty(cat)) {
        counts[cat]++;
        total++;
      }
    }
    var result = {};
    CAT_ORDER.forEach(function (c) {
      result[c] = {
        count: counts[c],
        pct: total > 0 ? Math.round((counts[c] / total) * 100) : 0
      };
    });
    result._total = total;
    return result;
  }

  function getWindowSlice(ordered, windowSize, startIndex) {
    var slice = ordered.slice(startIndex, startIndex + windowSize);
    var counts = {};
    var total = 0;
    CAT_ORDER.forEach(function (c) { counts[c] = 0; });
    slice.forEach(function (w) {
      if (w.category && counts.hasOwnProperty(w.category)) {
        counts[w.category]++;
        total++;
      }
    });
    var uniqueCats = 0;
    CAT_ORDER.forEach(function (c) { if (counts[c] > 0) uniqueCats++; });
    return {
      start: startIndex + 1,
      end: startIndex + slice.length,
      wordCount: slice.length,
      counts: counts,
      total: total,
      uniqueCategories: uniqueCats,
      words: slice,
      label: (startIndex + 1) + '-' + (startIndex + slice.length)
    };
  }

  function getAllWindows(ordered, windowSize) {
    var windows = [];
    for (var i = 0; i < ordered.length; i += windowSize) {
      windows.push(getWindowSlice(ordered, windowSize, i));
    }
    return windows;
  }

  function getDynamicMilestones(totalWords) {
    if (totalWords <= 15) return [totalWords];
    if (totalWords <= 30) return [10, totalWords];
    if (totalWords <= 60) return [10, 25, totalWords];
    var milestones = [];
    var step = totalWords <= 100 ? 25 : 50;
    for (var m = step; m < totalWords; m += step) {
      milestones.push(m);
    }
    milestones.push(totalWords);
    // Ensure we have at least first milestone
    if (milestones[0] > 25) milestones.unshift(25);
    // Max 6 milestones
    while (milestones.length > 6) {
      // Remove second-to-last
      milestones.splice(milestones.length - 2, 1);
    }
    return milestones;
  }

  function getMilestoneData(ordered) {
    var milestones = getDynamicMilestones(ordered.length);
    return milestones.map(function (m) {
      var data = getCumulativeCategories(ordered, m);
      data._milestone = m;
      // Find top category
      var topKey = null, topCount = 0;
      CAT_ORDER.forEach(function (c) {
        if (data[c].count > topCount) {
          topCount = data[c].count;
          topKey = c;
        }
      });
      data._topCategory = topKey;
      data._topLabel = topKey ? CAT_LABELS[topKey] : '';
      // Get example words at this milestone
      var examples = {};
      CAT_ORDER.forEach(function (c) {
        examples[c] = ordered.slice(0, m).filter(function (w) {
          return w.category === c;
        }).slice(-3).map(function (w) { return w.word; });
      });
      data._examples = examples;
      return data;
    });
  }

  function getCategoryEmergence(ordered) {
    var emergence = {};
    CAT_ORDER.forEach(function (c) {
      emergence[c] = {
        key: c,
        label: CAT_LABELS[c],
        color: CAT_COLORS[c],
        firstIndex: -1,
        firstWord: '',
        fiveWordMark: -1,
        count: 0,
        words: []
      };
    });
    ordered.forEach(function (w) {
      if (!w.category || !emergence[w.category]) return;
      var e = emergence[w.category];
      e.count++;
      e.words.push(w);
      if (e.firstIndex === -1) {
        e.firstIndex = w.index;
        e.firstWord = w.word;
      }
      if (e.count === 5 && e.fiveWordMark === -1) {
        e.fiveWordMark = w.index;
      }
    });
    return emergence;
  }

  function getNounBiasData(ordered) {
    var points = [];
    var nounCount = 0;
    var total = 0;
    ordered.forEach(function (w) {
      if (w.category === 'general_nominals' || w.category === 'specific_nominals') {
        nounCount++;
      }
      if (w.category) total++;
      points.push({
        index: w.index,
        nounPct: total > 0 ? Math.round((nounCount / total) * 100) : 0,
        word: w.word
      });
    });
    return points;
  }

  // ==========================================
  // INSIGHTS ENGINE
  // ==========================================

  function generateInsights(ordered) {
    if (ordered.length < 5) return [];
    var insights = [];
    var cats = getCategoryEmergence(ordered);
    var babyName = (typeof BABY_NAME !== 'undefined') ? BABY_NAME : 'התינוק';

    // Rule 1: Burst - window of 10 with most words in a single category
    var burstCat = null, burstCount = 0, burstStart = 0;
    for (var i = 0; i <= Math.max(0, ordered.length - 10); i++) {
      var slice = ordered.slice(i, i + 10);
      var catCounts = {};
      slice.forEach(function (w) {
        if (w.category) {
          catCounts[w.category] = (catCounts[w.category] || 0) + 1;
        }
      });
      Object.keys(catCounts).forEach(function (c) {
        if (catCounts[c] > burstCount) {
          burstCount = catCounts[c];
          burstCat = c;
          burstStart = i;
        }
      });
    }
    if (burstCount >= 6 && burstCat) {
      insights.push({
        type: 'burst',
        priority: 1,
        text: 'בין מילה ' + (burstStart + 1) + ' ל-' + Math.min(burstStart + 10, ordered.length) +
          ', ' + babyName + ' רכשה ' + burstCount + ' ' + CAT_LABELS[burstCat] +
          ' - פיצוץ של קטגוריה אחת!'
      });
    }

    // Rule 2: Late emergence
    CAT_ORDER.forEach(function (c) {
      var e = cats[c];
      if (e.firstIndex > ordered.length * 0.4 && e.count > 0) {
        insights.push({
          type: 'late_emergence',
          priority: 2,
          text: CAT_LABELS[c] + ' הופיעו רק במילה #' + e.firstIndex +
            ' (' + e.firstWord + ') - ' + babyName + ' קודם בנתה בסיס של שמות'
        });
      }
    });

    // Rule 3: Dominance at latest milestone
    var latest = getCumulativeCategories(ordered, ordered.length);
    var topKey = null, topPct = 0;
    CAT_ORDER.forEach(function (c) {
      if (latest[c].pct > topPct) { topPct = latest[c].pct; topKey = c; }
    });
    if (topPct > 50 && topKey) {
      insights.push({
        type: 'dominance',
        priority: 2,
        text: CAT_LABELS[topKey] + ' עדיין מהוות ' + topPct + '% מאוצר המילים של ' + babyName
      });
    }

    // Rule 4: Balance
    var activeCats = CAT_ORDER.filter(function (c) { return latest[c].count > 0; });
    if (activeCats.length >= 4) {
      var pcts = activeCats.map(function (c) { return latest[c].pct; });
      var maxP = Math.max.apply(null, pcts);
      var minP = Math.min.apply(null, pcts);
      if (maxP - minP < 15) {
        insights.push({
          type: 'balance',
          priority: 1,
          text: 'אוצר המילים של ' + babyName + ' מאוזן יחסית - ההפרש בין הקטגוריות הוא רק ' + (maxP - minP) + '%'
        });
      }
    }

    // Rule 5: Noun bias shift
    var nounData = getNounBiasData(ordered);
    if (nounData.length >= 20) {
      var early = nounData[Math.min(19, nounData.length - 1)].nounPct;
      var current = nounData[nounData.length - 1].nounPct;
      if (early - current > 15) {
        insights.push({
          type: 'noun_shift',
          priority: 1,
          text: 'שמות עצם ירדו מ-' + early + '% ב-20 המילים הראשונות ל-' + current + '% היום - סימן לגיוון!'
        });
      }
    }

    // Rule 6: Sub-category dominance
    var subCounts = {};
    ordered.forEach(function (w) {
      if (w.sub_category) {
        subCounts[w.sub_category] = (subCounts[w.sub_category] || 0) + 1;
      }
    });
    var topSub = null, topSubCount = 0;
    Object.keys(subCounts).forEach(function (s) {
      if (subCounts[s] > topSubCount) { topSubCount = subCounts[s]; topSub = s; }
    });
    var categorizedCount = ordered.filter(function (w) { return w.category; }).length;
    if (topSub && categorizedCount > 0) {
      var subPct = Math.round((topSubCount / categorizedCount) * 100);
      if (subPct > 20 && SUB_CAT_LABELS[topSub]) {
        insights.push({
          type: 'sub_dominant',
          priority: 3,
          text: SUB_CAT_LABELS[topSub] + ' היא תת-הקטגוריה הפופולרית ביותר: ' +
            topSubCount + ' מילים (' + subPct + '%)'
        });
      }
    }

    // Sort by priority, return max 4
    insights.sort(function (a, b) { return a.priority - b.priority; });
    return insights.slice(0, 4);
  }

  // ==========================================
  // DYNAMIC TITLES
  // ==========================================

  function getStreamTitle(ordered) {
    if (ordered.length < 5) return 'תחילת הדרך של אוצר המילים';
    var babyName = (typeof BABY_NAME !== 'undefined') ? BABY_NAME : 'התינוק';
    var cats = getCategoryEmergence(ordered);
    var latestEmergence = null;
    CAT_ORDER.forEach(function (c) {
      var e = cats[c];
      if (e.firstIndex > 0 && (!latestEmergence || e.firstIndex > latestEmergence.firstIndex)) {
        latestEmergence = e;
      }
    });
    if (latestEmergence && latestEmergence.firstIndex > ordered.length * 0.4) {
      return latestEmergence.label + ' הצטרפו מאוחר - רק אחרי מילה ' + latestEmergence.firstIndex;
    }
    var latest = getCumulativeCategories(ordered, ordered.length);
    var topKey = null, topPct = 0;
    CAT_ORDER.forEach(function (c) {
      if (latest[c].pct > topPct) { topPct = latest[c].pct; topKey = c; }
    });
    if (topPct > 50) {
      return CAT_LABELS[topKey] + ' שולטים באוצר המילים של ' + babyName;
    }
    return 'מגוון גדל - כך התפתח אוצר המילים של ' + babyName;
  }

  function getPulseTitle(windows) {
    if (!windows.length) return 'דופק הרכישה';
    var mostDiverse = windows[0];
    windows.forEach(function (w) {
      if (w.uniqueCategories > mostDiverse.uniqueCategories) mostDiverse = w;
    });
    if (mostDiverse.uniqueCategories >= 4) {
      return 'מילים ' + mostDiverse.label + ' הן המגוונות ביותר - ' +
        mostDiverse.uniqueCategories + ' קטגוריות שונות';
    }
    return 'הרכב אוצר המילים לפי סדר רכישה';
  }

  function getMilestoneTitle(milestoneData) {
    if (milestoneData.length < 2) return 'אבני דרך ברכישת מילים';
    var first = milestoneData[0];
    var last = milestoneData[milestoneData.length - 1];
    if (first._topCategory === last._topCategory) {
      return first._topLabel + ' שולטות מההתחלה ועד היום';
    }
    return 'מעולם של ' + first._topLabel + ' לעולם מגוון יותר';
  }

  function getNounBiasTitle(nounData) {
    if (nounData.length < 10) return 'יחס שמות עצם באוצר המילים';
    var first20 = nounData[Math.min(19, nounData.length - 1)].nounPct;
    var latest = nounData[nounData.length - 1].nounPct;
    var diff = first20 - latest;
    if (diff > 15) {
      return 'הטיית שמות העצם יורדת - סימן בריא לגיוון (' + latest + '% כרגע)';
    }
    if (diff < -5) {
      return 'שמות עצם עדיין עולים - ' + latest + '% ובצמיחה';
    }
    return 'שמות עצם יציבים סביב ' + latest + '% - בסיס חזק';
  }

  function getEmergenceTitle(ordered) {
    if (ordered.length < 10) return 'מתי הופיעה כל קטגוריה';
    var cats = getCategoryEmergence(ordered);
    var babyName = (typeof BABY_NAME !== 'undefined') ? BABY_NAME : 'התינוק';
    var earliest = null, latest = null;
    CAT_ORDER.forEach(function (c) {
      var e = cats[c];
      if (e.count === 0) return;
      if (!earliest || e.firstIndex < earliest.firstIndex) earliest = e;
      if (!latest || e.firstIndex > latest.firstIndex) latest = e;
    });
    if (earliest && latest && earliest.key !== latest.key) {
      return earliest.label + ' הגיעו ראשונות, ' + latest.label + ' רק במילה ' + latest.firstIndex;
    }
    return 'סדר הופעת הקטגוריות באוצר המילים של ' + babyName;
  }

  function getSubCategoryData(ordered, milestones) {
    var results = [];
    milestones.forEach(function (m) {
      var slice = ordered.slice(0, m);
      var subCounts = {};
      slice.forEach(function (w) {
        if (w.sub_category) {
          subCounts[w.sub_category] = (subCounts[w.sub_category] || 0) + 1;
        }
      });
      results.push({ milestone: m, subs: subCounts });
    });
    // Collect all active sub-categories
    var allSubs = {};
    results.forEach(function (r) {
      Object.keys(r.subs).forEach(function (s) { allSubs[s] = true; });
    });
    var subKeys = Object.keys(allSubs).sort(function (a, b) {
      // Sort by total count descending
      var totalA = 0, totalB = 0;
      results.forEach(function (r) {
        totalA += r.subs[a] || 0;
        totalB += r.subs[b] || 0;
      });
      return totalB - totalA;
    });
    // Find max value for scaling
    var maxVal = 0;
    results.forEach(function (r) {
      subKeys.forEach(function (s) {
        if ((r.subs[s] || 0) > maxVal) maxVal = r.subs[s];
      });
    });
    return { milestones: results, subKeys: subKeys, maxVal: maxVal };
  }

  function getRadarTitle(ordered) {
    if (ordered.length < 10) return 'העולם של התינוק';
    var babyName = (typeof BABY_NAME !== 'undefined') ? BABY_NAME : 'התינוק';
    var subCounts = {};
    ordered.forEach(function (w) {
      if (w.sub_category) subCounts[w.sub_category] = true;
    });
    var count = Object.keys(subCounts).length;
    // Check how many at first 25%
    var earlyCount = {};
    var quarter = Math.max(1, Math.floor(ordered.length * 0.25));
    ordered.slice(0, quarter).forEach(function (w) {
      if (w.sub_category) earlyCount[w.sub_category] = true;
    });
    var earlyN = Object.keys(earlyCount).length;
    if (count > earlyN + 3) {
      return 'העולם של ' + babyName + ' מתרחב - מ-' + earlyN + ' תחומים ל-' + count + ' תחומים';
    }
    return 'העולם של ' + babyName + ' ב-' + count + ' תחומים שונים';
  }

  // ==========================================
  // PUBLIC API
  // ==========================================
  return {
    CAT_COLORS: CAT_COLORS,
    CAT_LABELS: CAT_LABELS,
    CAT_ORDER: CAT_ORDER,
    SUB_CAT_LABELS: SUB_CAT_LABELS,
    getAcquisitionOrder: getAcquisitionOrder,
    getCumulativeCategories: getCumulativeCategories,
    getWindowSlice: getWindowSlice,
    getAllWindows: getAllWindows,
    getDynamicMilestones: getDynamicMilestones,
    getMilestoneData: getMilestoneData,
    getCategoryEmergence: getCategoryEmergence,
    getNounBiasData: getNounBiasData,
    generateInsights: generateInsights,
    getStreamTitle: getStreamTitle,
    getPulseTitle: getPulseTitle,
    getMilestoneTitle: getMilestoneTitle,
    getNounBiasTitle: getNounBiasTitle,
    getEmergenceTitle: getEmergenceTitle,
    getSubCategoryData: getSubCategoryData,
    getRadarTitle: getRadarTitle
  };
})();
