/* =============================================
   Vocabulary Analysis Charts - Wordbydandan
   Smooth animations, site palette, mobile-first
   ============================================= */
(function () {
  'use strict';

  var vocabData = [];

  // Site palette
  var COLORS = {
    purple: '#6C5CE7',
    pink: '#FF6B9D',
    teal: '#4ECDC4',
    yellow: '#FFD93D',
    coral: '#FF8A80',
    lavender: '#F3E5F5',
    deepPurple: '#2D1B69',
    bg: '#FFF9FB',
  };

  var CAT_COLORS = {
    specific_nominals: COLORS.pink,
    general_nominals: COLORS.purple,
    action_words: COLORS.teal,
    descriptive_words: COLORS.yellow,
    social_routines: COLORS.coral,
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
  var CAT_ORDER = ['specific_nominals', 'general_nominals', 'action_words', 'descriptive_words', 'social_routines'];

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

  // Baby's current age
  var BABY_MAX_AGE = 16; // months (as of April 2026)

  // ==========================================
  // DATA HELPERS
  // ==========================================
  function getWordsUpTo(maxAge) {
    return vocabData.filter(function (w) { return w.age_in_months <= maxAge; });
  }

  function getCategories(words) {
    var cats = {};
    words.forEach(function (w) {
      if (w.cdi_category === 'unclear') return;
      if (!cats[w.cdi_category]) cats[w.cdi_category] = [];
      cats[w.cdi_category].push(w);
    });
    return cats;
  }

  function getSubCategories(words) {
    var subs = {};
    words.forEach(function (w) {
      if (w.sub_category === 'unclear') return;
      if (!subs[w.sub_category]) subs[w.sub_category] = [];
      subs[w.sub_category].push(w);
    });
    return subs;
  }

  function getAgeRange() {
    if (!vocabData.length) return { min: 10, max: BABY_MAX_AGE };
    var ages = vocabData.map(function (w) { return w.age_in_months; });
    return { min: Math.min.apply(null, ages), max: Math.min(Math.max.apply(null, ages), BABY_MAX_AGE) };
  }

  function ageToHebrew(m) {
    if (m < 12) return m + ' חודשים';
    var y = Math.floor(m / 12);
    var r = m % 12;
    if (r === 0) return y === 1 ? 'שנה' : y + ' שנים';
    return (y === 1 ? 'שנה' : y + ' שנים') + ' ו-' + r + ' חו\'';
  }

  // ==========================================
  // CARD BUILDER
  // ==========================================
  // CDI category descriptions for clickable explanations
  var CAT_DESCRIPTIONS = {
    specific_nominals: 'שמות של אנשים ספציפיים, חיות מחמד, או חפצים ייחודיים (למשל: "אמא", "בובו")',
    general_nominals: 'שמות כלליים של חפצים, חיות, או מושגים (למשל: "כלב", "מים", "כדור")',
    action_words: 'מילים המתארות פעולות (למשל: "תן", "בוא", "שב")',
    descriptive_words: 'מילים המתארות תכונות או מצבים (למשל: "גדול", "חם", "יפה")',
    social_routines: 'ביטויים חברתיים ושגרתיים (למשל: "שלום", "ביי", "תודה")'
  };

  function createCard(title, id, hasSlider, description) {
    var card = document.createElement('div');
    card.className = 'vocab-card';
    var h = '<h3 class="vocab-card-title">' + title + '</h3>';
    if (description) {
      h += '<p class="vocab-card-desc">' + description + '</p>';
    }
    h += '<div class="vocab-chart-wrap"><canvas id="' + id + '"></canvas></div>';
    if (hasSlider !== false) {
      h += '<div class="vocab-slider-row">' +
        '<span class="vocab-slider-label" id="' + id + 'Lbl"></span>' +
        '<input type="range" class="vocab-slider" id="' + id + 'Sld">' +
        '</div>';
    }
    h += '<div class="vocab-tooltip-area" id="' + id + 'Tip"></div>';
    h += '<div class="vocab-legend" id="' + id + 'Leg"></div>';
    card.innerHTML = h;
    return card;
  }

  function setupSlider(id, range, onUpdate) {
    var sld = document.getElementById(id + 'Sld');
    var lbl = document.getElementById(id + 'Lbl');
    if (!sld) return;
    sld.min = range.min;
    sld.max = range.max;
    sld.step = 1;
    sld.value = range.max;
    function upd() {
      var v = parseInt(sld.value);
      lbl.textContent = ageToHebrew(v);
      onUpdate(v);
    }
    sld.addEventListener('input', upd);
    upd();
  }

  function buildLegend(id, items) {
    var el = document.getElementById(id + 'Leg');
    if (!el) return;
    el.innerHTML = '';
    items.forEach(function (item) {
      var s = document.createElement('span');
      s.className = 'vocab-legend-item';
      s.innerHTML = '<span class="vocab-legend-dot" style="background:' + item.color + '"></span>' + item.label;
      el.appendChild(s);
    });
  }

  // ==========================================
  // CHART 1: STACKED BARS (category evolution)
  // ==========================================
  function drawStackedBars(canvasId, maxAge) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.parentElement.offsetWidth;
    var H = 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var PAD = { top: 12, right: 12, bottom: 36, left: 38 };
    var cW = W - PAD.left - PAD.right;
    var cH = H - PAD.top - PAD.bottom;
    var range = getAgeRange();

    // Build data per month
    var months = [];
    for (var m = range.min; m <= Math.min(maxAge, range.max); m++) months.push(m);

    var maxTotal = 0;
    var monthData = months.map(function (m) {
      var words = getWordsUpTo(m);
      var cats = getCategories(words);
      var row = { month: m };
      var total = 0;
      CAT_ORDER.forEach(function (c) {
        row[c] = (cats[c] || []).length;
        total += row[c];
      });
      row.total = total;
      if (total > maxTotal) maxTotal = total;
      return row;
    });

    if (!months.length) return;

    var barW = Math.max(8, Math.min(36, (cW / months.length) - 4));
    var gap = (cW - barW * months.length) / (months.length + 1);
    var yMax = Math.ceil(maxTotal / 5) * 5 || 5;

    function xPos(i) { return PAD.left + gap + i * (barW + gap) + barW / 2; }
    function yPos(v) { return PAD.top + cH - (v / yMax) * cH; }

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(108,92,231,0.08)';
    ctx.lineWidth = 1;
    for (var v = 0; v <= yMax; v += Math.max(1, Math.floor(yMax / 4))) {
      ctx.beginPath();
      ctx.moveTo(PAD.left, yPos(v));
      ctx.lineTo(W - PAD.right, yPos(v));
      ctx.stroke();
      ctx.fillStyle = 'rgba(108,92,231,0.5)';
      ctx.font = '11px Varela Round, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(v, PAD.left - 6, yPos(v) + 4);
    }

    // Bars
    monthData.forEach(function (d, i) {
      var x = PAD.left + gap + i * (barW + gap);
      var base = yPos(0);
      var stack = 0;
      CAT_ORDER.forEach(function (c) {
        var count = d[c] || 0;
        if (count === 0) return;
        var barH = (count / yMax) * cH;
        var y = base - (stack / yMax) * cH - barH;
        // Rounded corners on top segment
        ctx.fillStyle = CAT_COLORS[c];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        var r = Math.min(3, barW / 4);
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + barW, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + barH, r);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        stack += count;
      });

      // Month label
      ctx.fillStyle = 'rgba(108,92,231,0.6)';
      ctx.font = '10px Varela Round, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.month + 'ח\'', x + barW / 2, H - PAD.bottom + 16);
    });

    // Touch/click tooltip
    canvas.onclick = function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left);
      var tipEl = document.getElementById(canvasId + 'Tip');
      if (!tipEl) return;

      // Find closest bar
      var closest = -1, minDist = Infinity;
      monthData.forEach(function (d, i) {
        var bx = PAD.left + gap + i * (barW + gap) + barW / 2;
        var dist = Math.abs(mx - bx);
        if (dist < minDist) { minDist = dist; closest = i; }
      });

      if (closest < 0 || minDist > barW * 2) { tipEl.innerHTML = ''; return; }
      var d = monthData[closest];
      var words = getWordsUpTo(d.month);
      var cats = getCategories(words);

      var html = '<div class="vocab-tip-card">';
      html += '<div class="vocab-tip-title">' + ageToHebrew(d.month) + ' — ' + d.total + ' מילים</div>';
      CAT_ORDER.forEach(function (c) {
        var list = cats[c] || [];
        if (!list.length) return;
        var examples = list.slice(-3).map(function (w) { return w.word; }).join(', ');
        html += '<div class="vocab-tip-row"><span class="vocab-legend-dot" style="background:' + CAT_COLORS[c] + '"></span>' +
          CAT_LABELS[c] + ': <strong>' + list.length + '</strong> <span class="vocab-tip-ex">(' + examples + ')</span></div>';
      });
      html += '</div>';
      tipEl.innerHTML = html;
    };
  }

  // ==========================================
  // CHART 2: PROPORTIONAL COLUMN (single bar)
  // ==========================================
  function drawProportionalColumn(canvasId, maxAge) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.parentElement.offsetWidth;
    var H = 260;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    var words = getWordsUpTo(maxAge);
    var cats = getCategories(words);
    var total = 0;
    var segments = [];
    CAT_ORDER.forEach(function (c) {
      var count = (cats[c] || []).length;
      total += count;
      segments.push({ key: c, count: count });
    });

    if (total === 0) return;

    var PAD = { top: 20, bottom: 20 };
    var barW = Math.min(80, W * 0.22);
    var barX = (W - barW) / 2;
    var barH = H - PAD.top - PAD.bottom;
    var cornerR = barW / 2;

    // Draw rounded bar background
    ctx.fillStyle = 'rgba(108,92,231,0.06)';
    ctx.beginPath();
    ctx.moveTo(barX, PAD.top + cornerR);
    ctx.arcTo(barX, PAD.top, barX + barW, PAD.top, cornerR);
    ctx.arcTo(barX + barW, PAD.top, barX + barW, PAD.top + barH, cornerR);
    ctx.arcTo(barX + barW, PAD.top + barH, barX, PAD.top + barH, cornerR);
    ctx.arcTo(barX, PAD.top + barH, barX, PAD.top, cornerR);
    ctx.closePath();
    ctx.fill();

    // Clip to rounded rect
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(barX, PAD.top + cornerR);
    ctx.arcTo(barX, PAD.top, barX + barW, PAD.top, cornerR);
    ctx.arcTo(barX + barW, PAD.top, barX + barW, PAD.top + barH, cornerR);
    ctx.arcTo(barX + barW, PAD.top + barH, barX, PAD.top + barH, cornerR);
    ctx.arcTo(barX, PAD.top + barH, barX, PAD.top, cornerR);
    ctx.closePath();
    ctx.clip();

    // Draw stacked segments from top to bottom
    var yOffset = PAD.top;
    segments.forEach(function (seg) {
      if (seg.count === 0) return;
      var segH = (seg.count / total) * barH;
      ctx.fillStyle = CAT_COLORS[seg.key];
      ctx.globalAlpha = 0.8;
      ctx.fillRect(barX, yOffset, barW, segH);
      ctx.globalAlpha = 1;
      yOffset += segH;
    });
    ctx.restore();

    // Draw labels on the sides
    yOffset = PAD.top;
    segments.forEach(function (seg) {
      if (seg.count === 0) return;
      var segH = (seg.count / total) * barH;
      var midY = yOffset + segH / 2;
      var pct = Math.round((seg.count / total) * 100);

      // Left side: category name + count
      ctx.fillStyle = CAT_COLORS[seg.key];
      ctx.font = 'bold 12px Secular One, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(CAT_LABELS[seg.key], barX - 14, midY - 2);
      ctx.font = '11px Varela Round, sans-serif';
      ctx.fillStyle = COLORS.deepPurple;
      ctx.fillText(seg.count + ' (' + pct + '%)', barX - 14, midY + 13);

      // Small connector line
      ctx.strokeStyle = 'rgba(108,92,231,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(barX - 10, midY);
      ctx.lineTo(barX - 2, midY);
      ctx.stroke();

      yOffset += segH;
    });

    // Total label at bottom
    ctx.fillStyle = COLORS.deepPurple;
    ctx.font = 'bold 14px Secular One, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('סה״כ: ' + total, W / 2, H - 2);

    // Update labels area if exists
    var tipEl = document.getElementById(canvasId + 'Tip');
    if (tipEl) {
      var html = '<div class="vocab-tip-card" style="text-align:center">';
      html += '<div class="vocab-tip-title">' + ageToHebrew(maxAge) + ' — ' + total + ' מילים</div>';
      segments.forEach(function (seg) {
        if (seg.count === 0) return;
        var pct = Math.round((seg.count / total) * 100);
        var catWords = (cats[seg.key] || []).slice(-3).map(function (w) { return w.word; }).join(', ');
        html += '<div class="vocab-tip-row"><span class="vocab-legend-dot" style="background:' + CAT_COLORS[seg.key] + '"></span>' +
          CAT_LABELS[seg.key] + ': <strong>' + seg.count + '</strong> (' + pct + '%) ' +
          '<span class="vocab-tip-ex">(' + catWords + ')</span></div>';
      });
      html += '</div>';
      tipEl.innerHTML = html;
    }
  }

  // ==========================================
  // CHART 3: BUBBLE MAP (CDI categories)
  // ==========================================
  function drawBubbleMap(canvasId, maxAge) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.parentElement.offsetWidth;
    var H = 320;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    var words = getWordsUpTo(maxAge);
    var cats = getCategories(words);
    var entries = CAT_ORDER.map(function (k) {
      return { key: k, count: (cats[k] || []).length, words: cats[k] || [] };
    }).filter(function (e) { return e.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });

    if (!entries.length) return;
    var maxCount = Math.max.apply(null, entries.map(function (e) { return e.count; }));
    var cx = W / 2, cy = H / 2;
    var maxR = Math.min(W, H) * 0.22;

    // Simple spiral layout
    var placed = [];
    entries.forEach(function (e, i) {
      var r = Math.max(28, (e.count / maxCount) * maxR);
      var angle = i * 2.4 + 0.5;
      var dist = i === 0 ? 0 : 55 + i * 32;
      var x = cx + Math.cos(angle) * dist;
      var y = cy + Math.sin(angle) * dist;
      x = Math.max(r + 8, Math.min(W - r - 8, x));
      y = Math.max(r + 8, Math.min(H - r - 8, y));
      placed.push({ x: x, y: y, r: r, entry: e });
    });

    // Draw bubbles
    placed.forEach(function (b) {
      var color = CAT_COLORS[b.entry.key] || '#ccc';
      // Glow
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.12;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Circle
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Label
      ctx.fillStyle = COLORS.deepPurple;
      ctx.font = 'bold ' + (b.r > 30 ? '13' : '10') + 'px Secular One, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(CAT_LABELS[b.entry.key] || b.entry.key, b.x, b.y - 3);
      ctx.font = 'bold ' + (b.r > 30 ? '16' : '12') + 'px Secular One, sans-serif';
      ctx.fillStyle = COLORS.purple;
      ctx.fillText(b.entry.count, b.x, b.y + 14);
    });
  }

  // ==========================================
  // MAIN TRENDS CHART ENHANCEMENT
  // ==========================================
  function enhanceMainTrendsChart() {
    var chartContainer = document.getElementById('trendsChart');
    if (!chartContainer) return;

    // Add title + description above chart
    var existing = chartContainer.querySelector('.trends-chart-title');
    if (!existing) {
      var title = document.createElement('h3');
      title.className = 'trends-chart-title vocab-card-title';
      title.textContent = 'גידול בסך אוצר המילים על פני זמן';
      title.style.marginBottom = '0.3rem';
      chartContainer.insertBefore(title, chartContainer.firstChild);

      var desc = document.createElement('p');
      desc.className = 'vocab-card-desc';
      desc.textContent = 'הזיזו את הסליידר כדי לבחון את הצמיחה בכל נקודת זמן';
      desc.style.marginBottom = '0.6rem';
      title.insertAdjacentElement('afterend', desc);
    }

    // Setup slider for main trends chart
    var sliderRow = document.getElementById('trendsSliderRow');
    var sld = document.getElementById('trendsSld');
    var lbl = document.getElementById('trendsSldLbl');
    var infoPanel = document.getElementById('trendsInfoPanel');
    var infoContent = document.getElementById('trendsInfoContent');

    if (!sld || !vocabData.length) return;

    var range = getAgeRange();
    sld.min = range.min;
    sld.max = range.max;
    sld.step = 1;
    sld.value = range.max;
    sliderRow.style.display = '';

    function updateTrendsInfo(age) {
      lbl.textContent = ageToHebrew(age);
      var words = getWordsUpTo(age);
      var cats = getCategories(words);
      var total = words.filter(function (w) { return w.cdi_category !== 'unclear'; }).length;

      if (total === 0) {
        infoPanel.style.display = 'none';
        return;
      }
      infoPanel.style.display = '';

      var html = '<div class="trends-info-age">' + ageToHebrew(age) + '</div>';
      html += '<div class="trends-info-total">' + total + ' מילים</div>';
      html += '<div class="trends-info-cats">';
      CAT_ORDER.forEach(function (c) {
        var count = (cats[c] || []).length;
        if (count === 0) return;
        var pct = Math.round((count / total) * 100);
        html += '<span class="trends-info-cat">' +
          '<span class="vocab-legend-dot" style="background:' + CAT_COLORS[c] + '"></span>' +
          CAT_LABELS[c] + ': ' + count + ' (' + pct + '%)' +
          '</span>';
      });
      html += '</div>';
      infoContent.innerHTML = html;
    }

    sld.addEventListener('input', function () {
      updateTrendsInfo(parseInt(sld.value));
    });
    updateTrendsInfo(range.max);
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    fetch('vocabulary.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        // Filter out future ages
        vocabData = data.filter(function (w) { return w.age_in_months <= BABY_MAX_AGE; });
        buildCards();
        enhanceMainTrendsChart();
      })
      .catch(function (err) {
        console.warn('vocabulary.json not loaded:', err);
      });
  }

  function buildLegendClickable(id, items) {
    var el = document.getElementById(id + 'Leg');
    if (!el) return;
    el.innerHTML = '';
    items.forEach(function (item) {
      var s = document.createElement('span');
      s.className = 'vocab-legend-item vocab-legend-clickable';
      s.innerHTML = '<span class="vocab-legend-dot" style="background:' + item.color + '"></span>' + item.label;
      if (item.key && CAT_DESCRIPTIONS[item.key]) {
        s.title = CAT_DESCRIPTIONS[item.key];
        s.setAttribute('data-cat-key', item.key);
        s.addEventListener('click', function () {
          var tipEl = document.getElementById(id + 'Tip');
          if (!tipEl) return;
          var desc = CAT_DESCRIPTIONS[item.key];
          tipEl.innerHTML = '<div class="vocab-tip-card"><div class="vocab-tip-title" style="margin-bottom:0.2rem">' +
            '<span class="vocab-legend-dot" style="background:' + item.color + ';display:inline-block;margin-left:0.3rem"></span> ' +
            item.label + '</div><div style="font-size:0.82rem;color:#2D1B69;line-height:1.6">' + desc + '</div></div>';
        });
      }
      el.appendChild(s);
    });
  }

  function buildCards() {
    var container = document.getElementById('vocabCards');
    if (!container || !vocabData.length) return;
    container.innerHTML = '';

    var range = getAgeRange();
    var catLegend = CAT_ORDER.map(function (k) {
      return { color: CAT_COLORS[k], label: CAT_LABELS[k], key: k };
    });

    // Card 1: Stacked bars
    var c1 = createCard('אבולוציית הקטגוריות', 'vchart1', true,
      'כמות המילים בכל קטגוריה לפי גיל - לחצו על עמודה לפירוט');
    container.appendChild(c1);
    setupSlider('vchart1', range, function (age) { drawStackedBars('vchart1', age); });
    buildLegendClickable('vchart1', catLegend);

    // Card 2: Proportional column
    var c2 = createCard('חלוקת אוצר המילים', 'vchart2', true,
      'התפלגות המילים לפי קטגוריות - הזיזו את הסליידר לראות שינוי');
    container.appendChild(c2);
    setupSlider('vchart2', range, function (age) { drawProportionalColumn('vchart2', age); });
    buildLegendClickable('vchart2', catLegend);

    // Card 3: Bubble map (now CDI categories)
    var c3 = createCard('מפת הקטגוריות', 'vchart3', true,
      'גודל הבועה מייצג את כמות המילים בקטגוריה - לחצו על קטגוריה בלגנדה לפירוט');
    container.appendChild(c3);
    setupSlider('vchart3', range, function (age) { drawBubbleMap('vchart3', age); });
    buildLegendClickable('vchart3', catLegend);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();
