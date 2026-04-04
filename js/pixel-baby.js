/* =============================================
   Pixel Art Baby Character - Wordbydandan
   ============================================= */
(function() {
  'use strict';

  var PX = 4; // pixels per sprite-pixel

  // Color palette
  var C = {
    '.': null,
    'H': '#D4884A', // hair blonde-reddish
    'h': '#B8703A', // hair darker
    'S': '#FDDCB5', // skin
    's': '#EDB78E', // skin shadow
    'E': '#2D1B69', // eye
    'e': '#FFFFFF', // eye highlight
    'M': '#FF6B9D', // blush / mouth
    'P': '#FFB0C8', // dress pink
    'p': '#FF8FAF', // dress pink darker
    'W': '#FFFFFF', // white dots on dress
    'R': '#FF8FAF', // shoes
  };

  // ==========================================
  // SPRITE DATA  (all 12 chars wide)
  // ==========================================

  var IDLE = [
    '.....HH.....',
    '....HHHH....',
    '....hHHh....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HhSSSSHH..',
    '..HSSSSSSH..',
    '..SEeSSSeE..',
    '..SSSSSSSS..',
    '..SMSSSSMs..',
    '...SSMMSS...',
    '....SSSS....',
    '.....PP.....',
    '...pPPPPp...',
    '..SpPWPWpS..',
    '..SpPPPPpS..',
    '...pPPPPp...',
    '....SS.SS...',
    '....RR.RR...',
  ];

  var WAVE1 = [
    '.....HH.....',
    '....HHHH....',
    '....hHHh....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HhSSSSHH..',
    '..HSSSSSSH..',
    '..SEeSSSeE..',
    '..SSSSSSSS..',
    '..SMSSSSMs..',
    '...SSMMSS...',
    '....SSSS.S..',
    '.....PP..S..',
    '...pPPPPpS..',
    '..SpPWPWp...',
    '..SpPPPPp...',
    '...pPPPPp...',
    '....SS.SS...',
    '....RR.RR...',
  ];

  var WAVE2 = [
    '.....HH.....',
    '....HHHH....',
    '....hHHh....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HhSSSSHH..',
    '..HSSSSSSH..',
    '..SEeSSSeE..',
    '..SSSSSSSS..',
    '..SMSSSSMs..',
    '...SSMMSS.S.',
    '....SSSS.S..',
    '.....PP..S..',
    '...pPPPPp...',
    '..SpPWPWp...',
    '..SpPPPPp...',
    '...pPPPPp...',
    '....SS.SS...',
    '....RR.RR...',
  ];

  var SIT = [
    '.....HH.....',
    '....HHHH....',
    '....hHHh....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HhSSSSHH..',
    '..HSSSSSSH..',
    '..SEeSSSeE..',
    '..SSSSSSSS..',
    '..SMSSSSMs..',
    '...SSMMSS...',
    '....SSSS....',
    '...pPPPPp...',
    '..SpPWPWpS..',
    '..SpPPPPpS..',
    '..SSSSSSSS..',
    '..RR....RR..',
  ];

  var JUMP = [
    '.....HH.....',
    '....HHHH....',
    '....hHHh....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HhSSSSHH..',
    '..HSSSSSSH..',
    '..SEeSSSeE..',
    '..SSSSSSSS..',
    '..SMSSSSMs..',
    '...SSMMSS...',
    'S...SSSS...S',
    '.S...PP...S.',
    '..pPPPPPp...',
    '..pPWPPWp...',
    '..pPPPPPp...',
    '...pPPPp....',
    '....S..S....',
    '...RR..RR...',
  ];

  var SPRITES = { idle: IDLE, wave1: WAVE1, wave2: WAVE2, sit: SIT, jump: JUMP };

  // ==========================================
  // RENDERING
  // ==========================================

  function renderToCanvas(canvas, sprite, scale) {
    var rows = sprite.length;
    var cols = sprite[0].length;
    canvas.width = cols * scale;
    canvas.height = rows * scale;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < sprite[y].length; x++) {
        var color = C[sprite[y][x]];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }

  function createSprite(name, scale) {
    var canvas = document.createElement('canvas');
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    renderToCanvas(canvas, SPRITES[name], scale || PX);
    return canvas;
  }

  function setSprite(canvas, name, scale) {
    renderToCanvas(canvas, SPRITES[name], scale || PX);
  }

  // ==========================================
  // BUBBLE
  // ==========================================

  function createBubble(text, extraClass) {
    var el = document.createElement('div');
    el.className = 'pbaby-bubble' + (extraClass ? ' ' + extraClass : '');
    var span = document.createElement('span');
    span.className = 'pbaby-bubble-text';
    span.textContent = text;
    el.appendChild(span);
    // triangle tail
    var tail = document.createElement('div');
    tail.className = 'pbaby-bubble-tail';
    el.appendChild(tail);
    return el;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  function wait(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  // ==========================================
  // 1. PEEK-A-BOO  (input card corner)
  // ==========================================

  function initPeekaboo() {
    var inputContainer = document.querySelector('.input-container');
    var markerArea = document.querySelector('.marker-area');
    if (!inputContainer || !markerArea) return;

    var container = document.createElement('div');
    container.className = 'pbaby-peek';

    var canvas = createSprite('idle', PX);
    container.appendChild(canvas);

    var bubble = createBubble('היי!', 'pbaby-peek-bubble');
    container.appendChild(bubble);

    inputContainer.appendChild(container);

    // Loop
    (async function loop() {
      while (true) {
        await wait(4000);
        if (!inView(inputContainer)) { await wait(2000); continue; }

        // peek in
        container.classList.add('in');
        await wait(700);

        // wave
        for (var i = 0; i < 6; i++) {
          setSprite(canvas, i % 2 === 0 ? 'wave1' : 'wave2', PX);
          await wait(250);
        }
        setSprite(canvas, 'idle', PX);

        // bubble
        bubble.classList.add('show');
        await wait(2200);
        bubble.classList.remove('show');
        await wait(400);

        // peek out
        container.classList.remove('in');
        await wait(5000);
      }
    })();
  }

  // ==========================================
  // 2. SITTING ON HEADER BLOCK
  // ==========================================

  function initSittingBaby() {
    var block = document.querySelector('.block-b');
    if (!block) return;

    var wrap = document.createElement('div');
    wrap.className = 'pbaby-sit';
    var canvas = createSprite('sit', 2);
    wrap.appendChild(canvas);

    block.style.position = 'relative';
    block.style.overflow = 'visible';
    block.appendChild(wrap);
  }

  // ==========================================
  // 3. CLICKABLE BABY BUTTON
  // ==========================================

  function initClickBaby() {
    var wrapper = document.createElement('div');
    wrapper.className = 'pbaby-click-wrap';

    // popup area
    var popup = document.createElement('div');
    popup.className = 'pbaby-click-popup';

    var popupCanvas = createSprite('idle', PX);
    popup.appendChild(popupCanvas);

    var popupBubble = createBubble('אני דניאלה!', 'pbaby-click-bubble');
    popup.appendChild(popupBubble);

    wrapper.appendChild(popup);

    // button
    var btn = document.createElement('button');
    btn.className = 'pbaby-click-btn';
    btn.setAttribute('aria-label', 'לחצו לפגוש את דניאלה');

    var faceCanvas = document.createElement('canvas');
    faceCanvas.style.imageRendering = 'pixelated';
    faceCanvas.style.display = 'block';
    renderToCanvas(faceCanvas, IDLE.slice(0, 12), 3);
    btn.appendChild(faceCanvas);

    wrapper.appendChild(btn);
    document.body.appendChild(wrapper);

    var busy = false;
    btn.addEventListener('click', async function() {
      if (busy) return;
      busy = true;

      popup.classList.add('show');
      await wait(400);

      // jump
      setSprite(popupCanvas, 'jump', PX);
      popup.classList.add('bounce');
      await wait(500);
      popup.classList.remove('bounce');

      // wave
      for (var i = 0; i < 4; i++) {
        setSprite(popupCanvas, i % 2 === 0 ? 'wave1' : 'wave2', PX);
        await wait(250);
      }
      setSprite(popupCanvas, 'idle', PX);

      // bubble
      popupBubble.classList.add('show');
      await wait(2500);

      popupBubble.classList.remove('show');
      await wait(300);
      popup.classList.remove('show');

      busy = false;
    });
  }

  // ==========================================
  // 4. TRENDS SECTION BABY
  // ==========================================

  function initTrendsBaby() {
    var section = document.querySelector('.trends-section');
    if (!section) return;

    var container = document.createElement('div');
    container.className = 'pbaby-trends';

    var canvas = createSprite('idle', 3);
    container.appendChild(canvas);

    var bubble = createBubble('גדלתי!', 'pbaby-trends-bubble');
    container.appendChild(bubble);

    section.style.position = 'relative';
    section.style.overflow = 'visible';
    section.appendChild(container);

    var animating = false;

    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !animating) {
          animating = true;
          (async function() {
            await wait(600);
            container.classList.add('show');
            await wait(800);
            for (var i = 0; i < 4; i++) {
              setSprite(canvas, i % 2 === 0 ? 'wave1' : 'wave2', 3);
              await wait(250);
            }
            setSprite(canvas, 'idle', 3);
            bubble.classList.add('show');
            await wait(2500);
            bubble.classList.remove('show');
            await wait(500);
            container.classList.remove('show');
            await wait(8000);
            animating = false;
          })();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(section);
  }

  // ==========================================
  // 5. FOOTER BABY (walking bounce)
  // ==========================================

  function initFooterBaby() {
    var footer = document.querySelector('.main-footer');
    if (!footer) return;

    var container = document.createElement('div');
    container.className = 'pbaby-footer';

    var canvas = createSprite('idle', 2);
    container.appendChild(canvas);

    footer.style.position = 'relative';
    footer.style.overflow = 'visible';
    footer.appendChild(container);
  }

  // ==========================================
  // 6. WORDS SECTION - sitting on title letter
  // ==========================================

  function initWordsTitleBaby() {
    var title = document.querySelector('.words-title');
    if (!title) return;

    // wrap title in a relative container
    title.style.position = 'relative';
    title.style.display = 'inline-block';

    var container = document.createElement('div');
    container.className = 'pbaby-words-title';

    var canvas = createSprite('sit', 2);
    container.appendChild(canvas);

    title.appendChild(container);
  }

  // ==========================================
  // INIT
  // ==========================================

  function init() {
    initPeekaboo();
    initSittingBaby();
    initClickBaby();
    initTrendsBaby();
    initFooterBaby();
    initWordsTitleBaby();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }
})();
