/* =============================================
   Vocabulary Analysis Charts - Wordbydandan
   4 interactive cards with time sliders
   ============================================= */
(function () {
  'use strict';

  var vocabData = [];
  var CAT_COLORS = {
    specific_nominals: '#FF6B9D',
    general_nominals: '#6C5CE7',
    action_words: '#4ECDC4',
    descriptive_words: '#FFD93D',
    social_routines: '#FF8A80',
    unclear: '#B0BEC5',
  };
  var CAT_LABELS = {
    specific_nominals: 'שמות פרטיים',
    general_nominals: 'שמות כלליים',
    action_words: 'פעלים',
    descriptive_words: 'תיאורים',
    social_routines: 'שגרות חברתיות',
    unclear: 'לא ברור',
  };
  var SUB_COLORS = {
    people: '#FF6B9D', animals: '#6C5CE7', food: '#FFD93D',
    clothing: '#4ECDC4', household: '#FF8A80', nature: '#81C784',
    toys: '#CE93D8', verbs: '#4DD0E1', adjectives: '#FFB74D',
    social: '#F48FB1', body_function: '#B0BEC5', eating: '#FFF176',
    unclear: '#CFD8DC',
  };
  var SUB_LABELS = {
    people: 'אנשים', animals: 'חיות', food: 'אוכל',
    clothing: 'לבוש', household: 'בית', nature: 'טבע',
    toys: 'צעצועים', verbs: 'פעלים', adjectives: 'תארים',
    social: 'חברתי', body_function: 'גוף', eating: 'אכילה',
    unclear: 'לא ברור',
  };

  // ==========================================
  // DATA HELPERS
  // ==========================================
  function getWordsUpTo(maxAge) {
    return vocabData.filter(function (w) { return w.age_in_months <= maxAge; });
  }

  function getCategories(words) {
    var cats = {};
    words.forEach(function (w) {
      var c = w.cdi_category;
      if (!cats[c]) cats[c] = [];
      cats[c].push(w);
    });
    return cats;
  }

  function getSubCategories(words) {
    var subs = {};
    words.forEach(function (w) {
      var s = w.sub_category;
      if (!subs[s]) subs[s] = [];
      subs[s].push(w);
    });
    return subs;
  }

  function getAgeRange() {
    if (!vocabData.length) return { min: 10, max: 16 };
    var ages = vocabData.map(function (w) { return w.age_in_months; });
    return { min: Math.min.apply(null, ages), max: Math.max.apply(null, ages) };
  }

  function getMonthTicks(min, max) {
    var ticks = [];
    for (var m = Math.floor(min); m <= Math.ceil(max); m++) ticks.push(m);
    return ticks;
  }

  // ==========================================
  // CHART RENDERING
  // ==========================================

  function createCard(title, id) {
    var card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML =
      '<h3 class="vocab-card-title">' + title + '</h3>' +
      '<div class="vocab-chart-wrap"><canvas id="' + id + '" width="600" height="250"></canvas></div>' +
      '<div class="vocab-slider-row">' +
      '  <span class="vocab-slider-label" id="' + id + 'Label"></span>' +
      '  <input type="range" class="vocab-slider" id="' + id + 'Slider">' +
      '</div>' +
      '<div class="vocab-stats" id="' + id + 'Stats"></div>' +
      '<div class="vocab-legend" id="' + id + 'Legend"></div>';
    return card;
  }

  // Draw stacked area chart (relative or absolute)
  function drawStackedArea(canvasId, maxAge, relative) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var PAD = { top: 10, right: 10, bottom: 30, left: 40 };
    var cW = W - PAD.left - PAD.right;
    var cH = H - PAD.top - PAD.bottom;
    var range = getAgeRange();
    var ticks = getMonthTicks(range.min, range.max);

    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px Varela Round, sans-serif';

    // Calculate data per month
    var catOrder = ['specific_nominals', 'general_nominals', 'action_words', 'descriptive_words', 'social_routines', 'unclear'];
    var monthData = [];
    ticks.forEach(function (m) {
      if (m > maxAge) return;
      var words = getWordsUpTo(m);
      var cats = getCategories(words);
      var total = words.length || 1;
      var row = { month: m, total: words.length };
      catOrder.forEach(function (c) {
        var count = (cats[c] || []).length;
        row[c] = relative ? (count / total) * 100 : count;
      });
      monthData.push(row);
    });

    if (monthData.length < 2) return;

    var maxY = relative ? 100 : Math.max.apply(null, monthData.map(function (d) {
      var sum = 0; catOrder.forEach(function (c) { sum += d[c] || 0; }); return sum;
    }));

    function xPos(m) { return PAD.left + ((m - range.min) / (range.max - range.min)) * cW; }
    function yPos(v) { return PAD.top + cH - (v / (maxY || 1)) * cH; }

    // Draw axes
    ctx.strokeStyle = 'rgba(109,92,231,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + cH); ctx.lineTo(PAD.left + cW, PAD.top + cH);
    ctx.stroke();

    // Y axis labels
    ctx.fillStyle = '#6C5CE7';
    ctx.textAlign = 'right';
    var ySteps = relative ? [0, 25, 50, 75, 100] : [0, Math.round(maxY / 2), maxY];
    ySteps.forEach(function (v) {
      ctx.fillText((relative ? v + '%' : v), PAD.left - 4, yPos(v) + 4);
    });

    // X axis labels
    ctx.textAlign = 'center';
    ticks.forEach(function (m) {
      if (m <= maxAge) ctx.fillText(m + 'ח', xPos(m), PAD.top + cH + 18);
    });

    // Draw stacked areas (bottom to top)
    for (var ci = catOrder.length - 1; ci >= 0; ci--) {
      ctx.beginPath();
      var cat = catOrder[ci];
      // Bottom line
      for (var i = 0; i < monthData.length; i++) {
        var d = monthData[i];
        var base = 0;
        for (var j = 0; j < ci; j++) base += d[catOrder[j]] || 0;
        var top = base + (d[cat] || 0);
        var x = xPos(d.month);
        if (i === 0) ctx.moveTo(x, yPos(top));
        else ctx.lineTo(x, yPos(top));
      }
      // Back along bottom
      for (var i = monthData.length - 1; i >= 0; i--) {
        var d = monthData[i];
        var base = 0;
        for (var j = 0; j < ci; j++) base += d[catOrder[j]] || 0;
        ctx.lineTo(xPos(d.month), yPos(base));
      }
      ctx.closePath();
      ctx.fillStyle = CAT_COLORS[cat] || '#ccc';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Slider marker line
    ctx.strokeStyle = 'rgba(45,27,105,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xPos(maxAge), PAD.top);
    ctx.lineTo(xPos(maxAge), PAD.top + cH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw line chart (growth curve)
  function drawGrowthLine(canvasId, markerAge) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var PAD = { top: 10, right: 10, bottom: 30, left: 40 };
    var cW = W - PAD.left - PAD.right;
    var cH = H - PAD.top - PAD.bottom;
    var range = getAgeRange();
    var ticks = getMonthTicks(range.min, range.max);

    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px Varela Round, sans-serif';

    // Data: cumulative word count at each month
    var points = [];
    ticks.forEach(function (m) {
      points.push({ month: m, count: getWordsUpTo(m).length });
    });

    var maxY = Math.max.apply(null, points.map(function (p) { return p.count; })) || 1;

    function xPos(m) { return PAD.left + ((m - range.min) / (range.max - range.min)) * cW; }
    function yPos(v) { return PAD.top + cH - (v / maxY) * cH; }

    // Axes
    ctx.strokeStyle = 'rgba(109,92,231,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + cH); ctx.lineTo(PAD.left + cW, PAD.top + cH);
    ctx.stroke();

    ctx.fillStyle = '#6C5CE7';
    ctx.textAlign = 'right';
    [0, Math.round(maxY / 2), maxY].forEach(function (v) {
      ctx.fillText(v, PAD.left - 4, yPos(v) + 4);
    });
    ctx.textAlign = 'center';
    ticks.forEach(function (m) {
      ctx.fillText(m + 'ח', xPos(m), PAD.top + cH + 18);
    });

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(xPos(points[0].month), yPos(0));
    points.forEach(function (p) { ctx.lineTo(xPos(p.month), yPos(p.count)); });
    ctx.lineTo(xPos(points[points.length - 1].month), yPos(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(108,92,231,0.08)';
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(xPos(p.month), yPos(p.count));
      else ctx.lineTo(xPos(p.month), yPos(p.count));
    });
    ctx.strokeStyle = '#6C5CE7';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    points.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(xPos(p.month), yPos(p.count), 4, 0, Math.PI * 2);
      ctx.fillStyle = p.month <= markerAge ? '#FF6B9D' : 'rgba(108,92,231,0.2)';
      ctx.fill();
    });

    // Marker line
    ctx.strokeStyle = '#FF6B9D';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(xPos(markerAge), PAD.top);
    ctx.lineTo(xPos(markerAge), PAD.top + cH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marker count label
    var markerCount = getWordsUpTo(markerAge).length;
    ctx.fillStyle = '#FF6B9D';
    ctx.font = 'bold 14px Secular One, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(markerCount + ' מילים', xPos(markerAge), PAD.top - 2);
  }

  // Draw treemap / bubble chart
  function drawBubbles(canvasId, maxAge) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    var words = getWordsUpTo(maxAge);
    var subs = getSubCategories(words);
    var entries = Object.keys(subs).map(function (k) {
      return { key: k, count: subs[k].length, words: subs[k] };
    }).sort(function (a, b) { return b.count - a.count; });

    if (!entries.length) return;

    var maxCount = entries[0].count;
    var cx = W / 2, cy = H / 2;
    var maxR = Math.min(W, H) * 0.22;

    // Simple circle packing layout
    var placed = [];
    entries.forEach(function (e, i) {
      var r = Math.max(16, (e.count / maxCount) * maxR);
      var angle = (i / entries.length) * Math.PI * 2 + Math.PI / 4;
      var dist = i === 0 ? 0 : 40 + i * 22;
      var x = cx + Math.cos(angle) * dist;
      var y = cy + Math.sin(angle) * dist;
      // Clamp to canvas
      x = Math.max(r + 5, Math.min(W - r - 5, x));
      y = Math.max(r + 5, Math.min(H - r - 5, y));
      placed.push({ x: x, y: y, r: r, entry: e });
    });

    placed.forEach(function (b) {
      var color = SUB_COLORS[b.entry.key] || '#ccc';
      // Circle
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#2D1B69';
      ctx.font = (b.r > 25 ? '12' : '9') + 'px Secular One, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(SUB_LABELS[b.entry.key] || b.entry.key, b.x, b.y - 2);
      ctx.font = 'bold 14px Secular One, sans-serif';
      ctx.fillText(b.entry.count, b.x, b.y + 14);
    });
  }

  function buildLegend(containerId, items) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    items.forEach(function (item) {
      var span = document.createElement('span');
      span.className = 'vocab-legend-item';
      span.innerHTML = '<span class="vocab-legend-dot" style="background:' + item.color + '"></span>' + item.label;
      el.appendChild(span);
    });
  }

  function updateStats(containerId, maxAge) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var words = getWordsUpTo(maxAge);
    var cats = getCategories(words);
    var parts = [];
    Object.keys(cats).forEach(function (c) {
      if (cats[c].length > 0 && c !== 'unclear') {
        var examples = cats[c].slice(-3).map(function (w) { return w.word; }).join(', ');
        parts.push((CAT_LABELS[c] || c) + ': ' + cats[c].length + ' (' + examples + ')');
      }
    });
    el.textContent = words.length + ' מילים עד גיל ' + maxAge + ' חודשים';
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    fetch('vocabulary.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        vocabData = data;
        buildCards();
      })
      .catch(function (err) {
        console.error('Failed to load vocabulary.json:', err);
      });
  }

  function buildCards() {
    var container = document.getElementById('vocabCards');
    if (!container || !vocabData.length) return;

    var range = getAgeRange();
    var catLegend = Object.keys(CAT_COLORS).filter(function (k) { return k !== 'unclear'; }).map(function (k) {
      return { color: CAT_COLORS[k], label: CAT_LABELS[k] };
    });

    // Card 1: Relative stacked area
    var c1 = createCard('אבולוציית הקטגוריות (יחסי)', 'chart1');
    container.appendChild(c1);
    setupSlider('chart1', range, function (age) {
      drawStackedArea('chart1', age, true);
      updateStats('chart1Stats', age);
    });
    buildLegend('chart1Legend', catLegend);

    // Card 2: Absolute stacked area
    var c2 = createCard('צמיחת הקטגוריות (מוחלט)', 'chart2');
    container.appendChild(c2);
    setupSlider('chart2', range, function (age) {
      drawStackedArea('chart2', age, false);
      updateStats('chart2Stats', age);
    });
    buildLegend('chart2Legend', catLegend);

    // Card 3: Growth line
    var c3 = createCard('עקומת צמיחה ונקודת פיתול', 'chart3');
    container.appendChild(c3);
    setupSlider('chart3', range, function (age) {
      drawGrowthLine('chart3', age);
      updateStats('chart3Stats', age);
    });

    // Card 4: Bubble map
    var c4 = createCard('מפת תשומת הלב', 'chart4');
    container.appendChild(c4);
    setupSlider('chart4', range, function (age) {
      drawBubbles('chart4', age);
      updateStats('chart4Stats', age);
    });
    var subLegend = Object.keys(SUB_COLORS).filter(function (k) { return k !== 'unclear'; }).map(function (k) {
      return { color: SUB_COLORS[k], label: SUB_LABELS[k] };
    });
    buildLegend('chart4Legend', subLegend);
  }

  function setupSlider(chartId, range, onUpdate) {
    var slider = document.getElementById(chartId + 'Slider');
    var label = document.getElementById(chartId + 'Label');
    if (!slider) return;

    slider.min = range.min;
    slider.max = range.max;
    slider.step = 0.5;
    slider.value = range.max;

    function update() {
      var age = parseFloat(slider.value);
      label.textContent = age + ' חודשים';
      onUpdate(age);
    }

    slider.addEventListener('input', update);
    update(); // initial draw
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();
