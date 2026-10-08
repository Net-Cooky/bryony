/* =========================================================================
   BRYONY JAYNE BRIDAL COUTURE - interaction layer
   Vanilla JS, progressively enhanced. The page reads fine without it.
   ========================================================================= */
(function () {
  'use strict';

  var d = document;
  var w = window;
  var $ = function (sel, ctx) { return (ctx || d).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); };
  var motionOK = !(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !w.matchMedia || w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (n, min, max) { return n < min ? min : (n > max ? max : n); };

  /* Focusing something that has only just become visible can fail quietly,
     because the style sheet has not been resolved yet. Flush, then focus. */
  function isShown(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }
  function focusNow(el) {
    if (!el) return;
    void el.offsetHeight;
    if (el.focus) { el.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------------
     1 · LOADER
     The overlay lifts on window load, with a hard cap so a slow image
     can never trap somebody on a blank screen.
     --------------------------------------------------------------------- */
  var loader = $('#loader');

  function revealEverything() {
    $$('.reveal, .mask').forEach(function (el) { el.classList.add('is-in'); });
  }

  if (loader) {
    var lifted = false;
    var lift = function () {
      if (lifted) return;
      lifted = true;
      loader.classList.add('is-done');
      loader.setAttribute('aria-hidden', 'true');
      w.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 1100);
    };
    if (d.readyState === 'complete') {
      w.setTimeout(lift, 700);
    } else {
      w.addEventListener('load', function () { w.setTimeout(lift, 550); });
    }
    w.setTimeout(lift, 4000);
  }

  /* ---------------------------------------------------------------------
     2 · SCROLL REVEALS  (fade-up blocks + line-mask headings)
     --------------------------------------------------------------------- */
  var revealables = $$('.reveal, .mask');
  if (!motionOK || !('IntersectionObserver' in w)) {
    revealEverything();
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    revealables.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------------------------------------------------------------------
     3 · RIBBON  (duplicate the row so the marquee loops seamlessly)
     --------------------------------------------------------------------- */
  var ribbon = $('#ribbon');
  if (ribbon && motionOK && ribbon.firstElementChild) {
    ribbon.appendChild(ribbon.firstElementChild.cloneNode(true));
  }

  /* ---------------------------------------------------------------------
     4 · THE SCROLL ENGINE  (one rAF loop: thread, nav, bar, parallax, spy)
     --------------------------------------------------------------------- */
  var nav = $('#nav');
  var thread = $('#threadFill');
  var toTop = $('#toTop');
  var mbar = $('.mbar');
  var parallaxEls = $$('[data-parallax]');
  var navLinks = $$('.navlink');
  var spySections = navLinks.map(function (a) {
    var id = a.getAttribute('href') || '';
    return id.charAt(0) === '#' && id.length > 1 ? $(id) : null;
  });
  var pending = false;

  function paint() {
    pending = false;
    var y = w.pageYOffset || d.documentElement.scrollTop || 0;
    var vh = w.innerHeight || 0;
    var docH = d.documentElement.scrollHeight - vh;

    if (thread) thread.style.width = (clamp(docH > 0 ? y / docH : 0, 0, 1) * 100).toFixed(2) + '%';
    if (nav) nav.classList.toggle('is-stuck', y > 28);
    if (toTop) toTop.classList.toggle('is-up', y > vh * 1.15);
    if (mbar) mbar.classList.toggle('is-up', y > vh * 0.55);

    if (motionOK) {
      for (var i = 0; i < parallaxEls.length; i++) {
        var el = parallaxEls[i];
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.06;
        var mid = rect.top + rect.height / 2 - vh / 2;
        /* the image is scaled 1.16, so ±8% of its height is safe travel */
        var reach = rect.height * 0.07;
        var shift = clamp(-mid * speed, -reach, reach);
        el.style.setProperty('--py', shift.toFixed(1) + 'px');
      }
    }

    var here = -1;
    for (var s = 0; s < spySections.length; s++) {
      var sec = spySections[s];
      if (!sec) continue;
      if (sec.offsetTop - 140 <= y) here = s;
    }
    for (var n = 0; n < navLinks.length; n++) {
      navLinks[n].classList.toggle('is-here', n === here);
    }
  }

  function onScroll() {
    if (pending) return;
    pending = true;
    w.requestAnimationFrame(paint);
  }

  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', onScroll, { passive: true });
  paint();

  if (toTop) {
    toTop.addEventListener('click', function () {
      w.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' });
    });
  }

  /* ---------------------------------------------------------------------
     5 · DRAWER  (the full-screen menu)
     --------------------------------------------------------------------- */
  var burger = $('#burger');
  var drawer = $('#drawer');

  function setDrawer(open) {
    if (!burger || !drawer) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    d.body.classList.toggle('is-locked', open);
    if (open) { focusNow($('a', drawer)); }
    if (!open) { focusNow(isShown(burger) ? burger : $('.nav__links .navlink')); }
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      setDrawer(burger.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
    w.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setDrawer(false); return; }
      if (e.key !== 'Tab') return;
      var links = $$('a, button', drawer).filter(isShown);
      if (!links.length) return;
      var firstEl = links[0];
      var lastEl = links[links.length - 1];
      if (e.shiftKey && d.activeElement === firstEl) { e.preventDefault(); focusNow(lastEl); }
      else if (!e.shiftKey && d.activeElement === lastEl) { e.preventDefault(); focusNow(firstEl); }
    });
  }

  /* ---------------------------------------------------------------------
     6 · THE COLLECTION  (front / detail / back for every gown at once)
     --------------------------------------------------------------------- */
  var viewBtns = $$('.views__btn');
  var gowns = $$('.gown');
  var viewNames = { front: 'Front', detail: 'Detail', back: 'Back' };

  function applyView(view) {
    gowns.forEach(function (gown) {
      var base = gown.getAttribute('data-' + view);
      var img = $('img', gown);
      var source = $('source', gown);
      var chip = $('.gown__view', gown);
      if (!base || !img) return;
      img.src = base + '.jpg';
      img.alt = (gown.getAttribute('data-name') || 'A gown') + ', ' + view +
                ' view of a hand-made bridal gown';
      if (source) { source.setAttribute('srcset', base + '.webp'); }
      if (chip) { chip.textContent = viewNames[view] || view; }
      if (motionOK) {
        img.style.opacity = '0';
        void img.offsetWidth;    /* settle the zero first so the fade has a start */
        img.style.opacity = '1';
      }
    });
    viewBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-view') === view;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  viewBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { applyView(btn.getAttribute('data-view')); });
  });

  /* ---------------------------------------------------------------------
     7 · STUDIO RAIL  (drag, wheel-nudge and arrow keys)
     --------------------------------------------------------------------- */
  var rail = $('#rail');
  if (rail) {
    var dragging = false;
    var startX = 0;
    var startLeft = 0;
    var travelled = 0;
    var lastX = 0;
    var lastT = 0;
    var velocity = 0;      /* pointer speed in px per ms */
    var glideId = 0;
    var coastTimer = 0;

    /* an <img> drags itself by default, which steals the gesture from the
       strip - turn that off, and cancel the default pointerdown as well */
    $$('img', rail).forEach(function (im) { im.setAttribute('draggable', 'false'); });

    function stopGlide() {
      if (glideId) { w.cancelAnimationFrame(glideId); glideId = 0; }
      if (coastTimer) { w.clearTimeout(coastTimer); coastTimer = 0; }
      rail.classList.remove('is-coast');
    }

    function glide() {
      var v = velocity;
      var last = performance.now();
      rail.classList.add('is-coast');
      function frame(now) {
        var dt = Math.min(now - last, 40);
        if (!(dt > 0)) dt = 16;                 /* never let a zero/negative tick spin */
        last = now;
        v *= Math.pow(0.92, dt / 16);           /* friction */
        rail.scrollLeft -= v * dt;
        var maxL = rail.scrollWidth - rail.clientWidth;
        if (Math.abs(v) > 0.03 && rail.scrollLeft > 0 && rail.scrollLeft < maxL) {
          paintArrows();
          glideId = w.requestAnimationFrame(frame);
        } else {
          glideId = 0;
          rail.scrollLeft = Math.min(Math.max(rail.scrollLeft, 0), maxL);
          paintArrows();
          coastTimer = w.setTimeout(function () { rail.classList.remove('is-coast'); }, 220);
        }
      }
      glideId = w.requestAnimationFrame(frame);
    }

    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;    /* touch scrolling is native and already good */
      e.preventDefault();
      stopGlide();
      dragging = true;
      travelled = 0;
      startX = lastX = e.clientX;
      lastT = performance.now();
      startLeft = rail.scrollLeft;
      velocity = 0;
      rail.classList.add('is-drag');
      try { rail.setPointerCapture(e.pointerId); } catch (err) {}
    });

    rail.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (e.buttons === 0) { endDrag(); return; }   /* released outside the window */
      var dx = e.clientX - startX;
      travelled = Math.max(travelled, Math.abs(dx));
      rail.scrollLeft = startLeft - dx;
      var now = performance.now();
      var dt = now - lastT;
      if (dt > 0) velocity = velocity * 0.6 + ((e.clientX - lastX) / dt) * 0.4;
      lastX = e.clientX;
      lastT = now;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('is-drag');
      if (motionOK && travelled > 6 && Math.abs(velocity) > 0.05) glide();
      velocity = 0;
      w.requestAnimationFrame(paintArrows);
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (evt) {
      rail.addEventListener(evt, endDrag);
    });
    /* releasing the button over another element must still end the drag */
    w.addEventListener('pointerup', endDrag);
    w.addEventListener('pointercancel', endDrag);
    rail.addEventListener('click', function (e) {
      if (travelled > 8) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    var btnPrev = $('#railPrev');
    var btnNext = $('#railNext');
    var holdEnd = false;   /* true while we are travelling towards the last photograph */

    function railEnd() {
      return Math.max(0, rail.scrollWidth - rail.clientWidth);
    }

    /* one photograph at a time, and never past either end of the strip */
    function railStep() {
      var card = $('.shot', rail);
      var track = $('#railTrack');
      if (!card) return Math.round(rail.clientWidth * 0.6);
      var gap = track ? (parseFloat(getComputedStyle(track).gap) || 0) : 0;
      return Math.max(1, Math.round(card.getBoundingClientRect().width + gap));
    }

    function railGo(dir) {
      stopGlide();
      var end = railEnd();
      var target = Math.min(Math.max(rail.scrollLeft + dir * railStep(), 0), end);
      var landing = end > 0 && target >= end - 1;
      /* switch snapping off *before* we arrive, so nothing can pull the strip
         back off the last photograph the moment we land on it */
      holdEnd = landing;
      rail.classList.toggle('is-atend', landing);
      rail.scrollTo({ left: target, behavior: motionOK ? 'smooth' : 'auto' });
      paintArrows();
      w.setTimeout(function () { holdEnd = false; paintArrows(); }, 520);  /* smooth scroll has landed */
    }

    /* the buttons grey themselves out at either end, so the end of the strip is
       something you can see rather than something you have to keep probing for */
    function paintArrows() {
      var at = rail.scrollLeft;
      var end = railEnd();
      var noPrev = at <= 1;
      var noNext = end === 0 || at >= end - 1;
      if (btnPrev && btnPrev.disabled !== noPrev) { btnPrev.disabled = noPrev; }
      if (btnNext && btnNext.disabled !== noNext) { btnNext.disabled = noNext; }
      /* resting on the last photograph keeps snapping off, however we got here */
      var atEnd = end > 0 && (noNext || holdEnd);
      if (rail.classList.contains('is-atend') !== atEnd) { rail.classList.toggle('is-atend', atEnd); }
    }

    rail.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      railGo(e.key === 'ArrowRight' ? 1 : -1);
    });

    /* the wheel belongs to the page: no hijacking here, just the buttons */
    if (btnPrev) { btnPrev.addEventListener('click', function () { railGo(-1); }); }
    if (btnNext) { btnNext.addEventListener('click', function () { railGo(1); }); }

    rail.addEventListener('scroll', paintArrows, { passive: true });
    w.addEventListener('resize', paintArrows, { passive: true });
    w.addEventListener('load', paintArrows);
    paintArrows();
  }

  /* ---------------------------------------------------------------------
     8 · THE COMMISSION  (the step you are reading becomes the meter)
     --------------------------------------------------------------------- */
  var steps = $$('#jSteps .step');
  var jNum = $('#jNum');
  var jNow = $('#jNow');

  if (steps.length && 'IntersectionObserver' in w) {
    var stepIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        steps.forEach(function (s) { s.classList.remove('is-on'); });
        entry.target.classList.add('is-on');
        var no = $('.step__no', entry.target);
        var name = $('.step__head h3', entry.target);
        if (jNum && no) { jNum.textContent = no.textContent; }
        if (jNow && name) { jNow.textContent = name.textContent; }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { stepIO.observe(s); });
  }

  /* ---------------------------------------------------------------------
     9 · BRIDES POSTCARDS  (a shallow drift under the pointer)
     --------------------------------------------------------------------- */
  var postcards = $('#postcards');
  if (postcards && finePointer && motionOK) {
    var drifters = $$('[data-drift]', postcards);
    var driftPending = false;
    var dx = 0;
    var dy = 0;

    function paintDrift() {
      driftPending = false;
      drifters.forEach(function (card) {
        var depth = parseFloat(card.getAttribute('data-drift')) || 1;
        card.style.setProperty('--dx', (dx * depth * 7).toFixed(2) + 'px');
        card.style.setProperty('--dy', (dy * depth * 5).toFixed(2) + 'px');
      });
    }

    postcards.addEventListener('pointermove', function (e) {
      var r = postcards.getBoundingClientRect();
      dx = (e.clientX - r.left) / r.width - 0.5;
      dy = (e.clientY - r.top) / r.height - 0.5;
      if (driftPending) return;
      driftPending = true;
      w.requestAnimationFrame(paintDrift);
    });

    postcards.addEventListener('pointerleave', function () {
      dx = 0;
      dy = 0;
      paintDrift();
    });
  }

  /* ---------------------------------------------------------------------
     10 · JOURNAL  (one photograph follows the pointer down the list)
     --------------------------------------------------------------------- */
  var jlinks = $$('.jitem__a[data-img]');
  var peek = $('#jpeek');

  if (jlinks.length && peek && finePointer && motionOK) {
    var peekImg = d.createElement('img');
    peekImg.alt = '';
    peekImg.decoding = 'async';
    peek.appendChild(peekImg);

    var peekPending = false;
    var px = 0;
    var py = 0;
    var peekOn = false;

    /* The card is painted from the last known pointer position, so arriving at
       an item by scrolling into it (rather than by moving the mouse) still puts
       the photograph beside the cursor - and it is placed before it is shown. */
    function paintPeek() {
      peekPending = false;
      var flip = px + 272 > w.innerWidth;
      peek.style.transform = 'translate3d(' + (flip ? px - 256 : px + 30) + 'px,' +
        clamp(py - 145, 14, Math.max(14, w.innerHeight - 304)) + 'px,0)';
    }
    function queuePeek() {
      if (peekPending) return;
      peekPending = true;
      w.requestAnimationFrame(paintPeek);
    }
    function peekShow(link) {
      peekImg.src = link.getAttribute('data-img') + '.jpg';
      peekOn = true;
      paintPeek();
      peek.classList.add('is-on');
    }
    function peekHide() {
      peekOn = false;
      peek.classList.remove('is-on');
    }

    jlinks.forEach(function (link) {
      link.addEventListener('pointerenter', function (e) {
        px = e.clientX;
        py = e.clientY;
        peekShow(link);
      });
      link.addEventListener('pointerleave', peekHide);
      link.addEventListener('focus', peekHide);
    });

    $$('.jlist').forEach(function (list) {
      list.addEventListener('pointermove', function (e) {
        px = e.clientX;
        py = e.clientY;
        queuePeek();
      });
    });

    /* the page can move under a motionless cursor: keep the card pinned */
    w.addEventListener('scroll', function () { if (peekOn) queuePeek(); }, { passive: true });
    w.addEventListener('resize', function () { if (peekOn) queuePeek(); }, { passive: true });
  }


  /* ---------------------------------------------------------------------
     11 · VOICES  (testimonials on a slow, unhurried turn)
     --------------------------------------------------------------------- */
  var voices = $$('#voiceStage .voice');
  var dotsWrap = $('#vDots');
  var vPrev = $('#vPrev');
  var vNext = $('#vNext');
  var vIndex = 0;
  var vTimer = null;

  function voiceShow(i) {
    if (!voices.length) return;
    vIndex = (i + voices.length) % voices.length;
    voices.forEach(function (v, n) {
      var on = n === vIndex;
      v.classList.toggle('is-on', on);
      v.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    if (dotsWrap) {
      $$('button', dotsWrap).forEach(function (dot, n) {
        var on = n === vIndex;
        dot.classList.toggle('is-on', on);
        dot.setAttribute('aria-selected', on ? 'true' : 'false');
        dot.setAttribute('tabindex', on ? '0' : '-1');
      });
    }
  }

  if (voices.length) {
    voices.forEach(function (v, n) {
      v.setAttribute('role', 'tabpanel');
      v.setAttribute('aria-label', 'Note ' + (n + 1) + ' of ' + voices.length);
      if (n !== 0) { v.setAttribute('aria-hidden', 'true'); }
    });

    if (dotsWrap) {
      voices.forEach(function (v, n) {
        var who = $('figcaption', v);
        var dot = d.createElement('button');
        dot.type = 'button';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Read the note from ' + (who ? who.textContent : 'bride ' + (n + 1)));
        dot.addEventListener('click', function () {
          voiceShow(n);
          voiceStart();
        });
        dotsWrap.appendChild(dot);
      });
    }

    function voiceStart() {
      if (!motionOK) return;
      voiceStop();
      vTimer = w.setInterval(function () { voiceShow(vIndex + 1); }, 8000);
    }
    function voiceStop() {
      if (vTimer) { w.clearInterval(vTimer); vTimer = null; }
    }

    voiceShow(0);

    if (vPrev) { vPrev.addEventListener('click', function () { voiceShow(vIndex - 1); voiceStart(); }); }
    if (vNext) { vNext.addEventListener('click', function () { voiceShow(vIndex + 1); voiceStart(); }); }

    var voicesSection = $('#voices');
    if (voicesSection) {
      voicesSection.addEventListener('pointerenter', voiceStop);
      voicesSection.addEventListener('pointerleave', voiceStart);
      voicesSection.addEventListener('focusin', voiceStop);
      voicesSection.addEventListener('focusout', voiceStart);
    }
    d.addEventListener('visibilitychange', function () {
      if (d.hidden) { voiceStop(); } else { voiceStart(); }
    });
    voiceStart();
  }


  /* ---------------------------------------------------------------------
     12 · GOWN VIEWER  (three photographs per gown, one at a time)
     --------------------------------------------------------------------- */
  var lb = $('#lb');
  var lbImg = $('#lbImg');
  var lbNo = $('#lbNo');
  var lbName = $('#lbName');
  var lbCap = $('#lbCap');
  var lbThumbs = $('#lbThumbs');
  var lbImgWrap = lb ? $('.lb__imgwrap', lb) : null;
  var VIEWS = [['front', 'Front'], ['detail', 'Detail'], ['back', 'Back']];
  var lbIndex = 0;
  var lbView = 0;
  var lbOpener = null;

  function gownAt(i) {
    if (!gowns.length) return null;
    return gowns[((i % gowns.length) + gowns.length) % gowns.length];
  }

  function gownBase(gown, view) {
    return gown ? (gown.getAttribute('data-' + view) || '') : '';
  }

  function lbShow() {
    if (!lb) return;
    var gown = gownAt(lbIndex);
    if (!gown) return;
    var name = gown.getAttribute('data-name') || 'A gown';
    var no = gown.getAttribute('data-no') || '';
    var view = VIEWS[lbView][0];
    var base = gownBase(gown, view);
    if (!base) return;

    if (lbImgWrap) { lbImgWrap.classList.add('is-load'); }
    lbImg.onload = function () {
      if (lbImgWrap) { lbImgWrap.classList.remove('is-load'); }
    };
    lbImg.onerror = function () {
      if (this.src.indexOf('.webp') !== -1) {
        this.src = base + '.jpg';
      }
    };
    lbImg.src = base + '.webp';
    lbImg.alt = name + ', ' + view + ' view of a hand-made bridal gown';
    if (lbNo) { lbNo.textContent = 'No. ' + no; }
    if (lbName) { lbName.textContent = name; }
    if (lbCap) { lbCap.textContent = VIEWS[lbView][1]; }
    if (lb) { lb.setAttribute('aria-label', name + ' - three photographs'); }
    
    var lbLink = $('#lbLink');
    if (lbLink) {
      var url = gown.getAttribute('data-url');
      if (url) {
        lbLink.href = url;
        lbLink.style.display = 'inline-flex';
      } else {
        lbLink.style.display = 'none';
      }
    }

    if (lbThumbs) {
      lbThumbs.innerHTML = '';
      VIEWS.forEach(function (pair, n) {
        var btn = d.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Look at the ' + pair[1].toLowerCase() + ' of ' + name);
        btn.setAttribute('aria-pressed', n === lbView ? 'true' : 'false');
        if (n === lbView) { btn.classList.add('is-on'); }
        var im = d.createElement('img');
        im.src = gownBase(gown, pair[0]) + '.webp';
        im.onerror = function () { this.src = gownBase(gown, pair[0]) + '.jpg'; };
        im.alt = '';
        im.width = 64;
        im.height = 96;
        im.decoding = 'async';
        btn.appendChild(im);
        btn.addEventListener('click', function () {
          lbView = n;
          lbShow();
        });
        lbThumbs.appendChild(btn);
      });
    }

    [-1, 1].forEach(function (step) {
      var near = gownAt(lbIndex + step);
      var preload = new Image();
      preload.src = gownBase(near, view) + '.webp';
    });
  }

  function lbOpen(gown, opener) {
    if (!lb) return;
    var idx = gowns.indexOf(gown);
    if (idx < 0) return;
    lbIndex = idx;
    lbView = 0;
    lbOpener = opener || null;
    lbShow();
    lb.classList.add('is-on');
    lb.setAttribute('aria-hidden', 'false');
    d.body.classList.add('is-locked');
    focusNow($('#lbClose'));
  }

  function lbShut() {
    if (!lb || !lb.classList.contains('is-on')) return;
    lb.classList.remove('is-on');
    lb.setAttribute('aria-hidden', 'true');
    d.body.classList.remove('is-locked');
    focusNow(lbOpener);
    lbOpener = null;
  }

  function lbStep(delta) {
    if (!lb || !lb.classList.contains('is-on') || !gowns.length) return;
    lbIndex = (lbIndex + delta + gowns.length) % gowns.length;
    lbView = 0;
    lbShow();
  }


  if (lb) {
    gowns.forEach(function (gown) {
      var opener = $('.gown__open', gown);
      if (!opener) return;
      opener.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();          /* the photograph below would fire too */
        lbOpen(gown, opener);
      });
      /* the whole photograph reads as "open me" - the pill is only the
         keyboard/touch affordance that carries the accessible name */
      var media = $('.gown__media', gown);
      if (media) {
        media.addEventListener('click', function () { lbOpen(gown, opener); });
      }
    });

    var lbPrev = $('#lbPrev');
    var lbNext = $('#lbNext');
    var lbCloseBtn = $('#lbClose');
    if (lbPrev) { lbPrev.addEventListener('click', function () { lbStep(-1); }); }
    if (lbNext) { lbNext.addEventListener('click', function () { lbStep(1); }); }
    if (lbCloseBtn) { lbCloseBtn.addEventListener('click', lbShut); }
    $$('[data-lb-close]').forEach(function (el) {
      el.addEventListener('click', function () { lbShut(); });
    });

    d.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-on')) return;
      if (e.key === 'Escape') { e.preventDefault(); lbShut(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); lbStep(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); lbStep(-1); return; }
      if (e.key !== 'Tab') return;

      var focusables = $$('button, a[href], [tabindex]:not([tabindex="-1"])', lb).filter(function (el) {
        return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
      });
      if (!focusables.length) return;
      var firstEl = focusables[0];
      var lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && d.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && d.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });

    /* a horizontal swipe moves to the next gown */
    var swipeX = null;
    lb.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      swipeX = e.clientX;
    });
    lb.addEventListener('pointerup', function (e) {
      if (swipeX === null) return;
      var dxp = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dxp) > 60) { lbStep(dxp < 0 ? 1 : -1); }
    });
  }

  /* ---------------------------------------------------------------------
     13 · ENQUIRY FORMS (Web3Forms direct submission)
     --------------------------------------------------------------------- */
  var forms = $$('form.form');

  var rules = {
    name: function (v) {
      if (!v.trim()) return 'We would love to know who we are writing to.';
      if (v.trim().length < 2) return 'A first name is plenty.';
      return '';
    },
    email: function (v) {
      if (!v.trim()) return 'An email address lets us reply to you.';
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim())) return 'That address does not look quite right.';
      return '';
    },
    phone: function (v) {
      if (!v.trim()) return 'A number is the quickest way for Bryony to reach you.';
      if (v.replace(/\D/g, '').length < 8) return 'That number looks incomplete.';
      return '';
    },
    message: function (v) {
      if (!v.trim()) return 'Tell us a little about the dress you are picturing.';
      if (v.trim().length < 10) return 'A sentence or two is plenty to get us started.';
      return '';
    },
    date: function (v) {
      var s = (v || '').trim();
      if (!s) return '';                                   /* the date is optional */
      var m = s.match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
      if (!m) return 'A month and a year, like 09 / 2027.';
      var month = parseInt(m[1], 10);
      if (month < 1 || month > 12) return 'There is no month ' + month + '.';
      var year = parseInt(m[2], 10);
      var now = new Date().getFullYear();
      if (year < now - 1 || year > now + 15) {
        return 'A year between ' + (now - 1) + ' and ' + (now + 15) + ', please.';
      }
      return '';
    }
  };

  function fieldOf(input) {
    return input && input.closest ? input.closest('.field') : null;
  }

  function showError(input, message) {
    var wrap = fieldOf(input);
    var slot = wrap ? $('.field__err[data-err-for="' + input.id + '"]', wrap) : null;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (wrap) { wrap.classList.add('is-bad'); }
      if (slot) { slot.textContent = message; }
    } else {
      input.removeAttribute('aria-invalid');
      if (wrap) { wrap.classList.remove('is-bad'); }
      if (slot) { slot.textContent = ''; }
    }
  }

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var message = rule(input.value || '');
    showError(input, message);
    return !message;
  }

  forms.forEach(function (formEl) {
    var formDone = $('#formDone', formEl) || (formEl.parentElement ? $('.form__done', formEl.parentElement) : null);
    var doneBody = $('#doneBody', formDone) || (formDone ? $('span', formDone) : null);
    var formFail = $('#formFail', formEl) || (formEl.parentElement ? $('.form__fail', formEl.parentElement) : null);
    var failBody = $('#failBody', formFail) || (formFail ? $('span', formFail) : null);
    var submitBtn = $('button[type="submit"]', formEl);
    var origBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>Book a complimentary consultation</span>';
    var fields = $$('input[name], textarea[name], select[name]', formEl);

    fields.forEach(function (input) {
      if (!rules[input.name]) return;
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        var wrap = fieldOf(input);
        if (wrap && wrap.classList.contains('is-bad')) { validateField(input); }
      });
    });

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;

      fields.forEach(function (input) {
        if (!rules[input.name]) return;
        if (!validateField(input)) {
          ok = false;
          if (!firstBad) { firstBad = input; }
        }
      });

      if (!ok) {
        if (firstBad) { firstBad.focus(); }
        return;
      }

      var data = {};
      fields.forEach(function (input) { data[input.name] = (input.value || '').trim(); });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending enquiry...</span>';
      }
      if (formFail) { formFail.hidden = true; }

      var formData = new FormData(formEl);
      var accessKey = formEl.getAttribute('data-access-key') || '8040cfa3-0cde-449a-bc1d-f7e6bbb16de8';
      if (!formData.has('access_key')) {
        formData.append('access_key', accessKey);
      }

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      })
      .then(function (res) {
        return res.json().then(function (json) {
          if (res.status === 200 && json.success) {
            var firstName = data.name ? data.name.split(' ')[0] : 'there';
            if (doneBody) {
              doneBody.textContent = 'Thanks ' + firstName + ' – your enquiry has been sent to Bryony. She will be in touch personally.';
            }
            formEl.classList.add('is-sent');
            formEl.reset();
            if (formDone) {
              formDone.hidden = false;
              formDone.setAttribute('tabindex', '-1');
              focusNow(formDone);
            }
          } else {
            showFail(json.message || 'There was an issue sending your enquiry.');
          }
        });
      })
      .catch(function () {
        showFail('Connection issue: could not reach the server.');
      });

      function showFail(msg) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
        if (formFail) {
          if (failBody) {
            failBody.textContent = msg + ' Please call Bryony directly on 0433 972 656 or email bryony@bryonyjayne.com.au.';
          }
          formFail.hidden = false;
          formFail.setAttribute('tabindex', '-1');
          focusNow(formFail);
        } else {
          alert(msg + ' Please call Bryony directly on 0433 972 656.');
        }
      }
    });
  });


  /* ---------------------------------------------------------------------
     13b · FORM CONTROLS  (a designed listbox and a month/year field)
     The native select popup and the native month picker can't be styled, so
     they are dressed up here - while the real <select> stays the value the
     form submits, and with JS off both fields still behave like plain inputs.
     --------------------------------------------------------------------- */
  var CHEVRON = '<svg viewBox="0 0 14 8" aria-hidden="true"><path d="M1 1l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---- the "I would love to talk about" listbox ---- */
  var sel = $('#f-interest');
  var selBox = sel ? sel.closest('.field__box') : null;
  if (sel && selBox) {
    selBox.classList.add('has-select');   /* only now is the native select put away */
    var selVal = d.createElement('button');
    selVal.type = 'button';
    selVal.className = 'select__btn';
    selVal.id = 'f-interestBtn';
    selVal.setAttribute('aria-haspopup', 'listbox');
    selVal.setAttribute('aria-expanded', 'false');
    selVal.setAttribute('aria-labelledby', 'f-interestLabel f-interestTxt');

    var selTxt = d.createElement('span');
    selTxt.className = 'select__val';
    selTxt.id = 'f-interestTxt';
    var selIco = d.createElement('span');
    selIco.className = 'select__ico';
    selIco.setAttribute('aria-hidden', 'true');
    selIco.innerHTML = CHEVRON;
    selVal.appendChild(selTxt);
    selVal.appendChild(selIco);

    var selList = d.createElement('ul');
    selList.className = 'select__list';
    selList.setAttribute('role', 'listbox');
    selList.setAttribute('aria-labelledby', 'f-interestLabel');
    selList.setAttribute('tabindex', '-1');
    selList.hidden = true;

    var selOpts = $$('option', sel);
    var selIdx = 0;
    var selItems = selOpts.map(function (opt, i) {
      var li = d.createElement('li');
      li.className = 'select__opt';
      li.setAttribute('role', 'option');
      li.id = 'f-interest-opt-' + i;
      li.textContent = opt.textContent;
      li.addEventListener('click', function () { pickOpt(i); });
      li.addEventListener('pointerenter', function () { markOpt(i); });
      selList.appendChild(li);
      return li;
    });

    function markOpt(i) {
      selIdx = clamp(i, 0, selItems.length - 1);
      selItems.forEach(function (li, n) {
        var on = n === selIdx;
        li.classList.toggle('is-on', on);
        li.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      selList.setAttribute('aria-activedescendant', selItems[selIdx].id);
    }

    function syncSel() {
      var i = sel.selectedIndex < 0 ? 0 : sel.selectedIndex;
      selTxt.textContent = selOpts[i].textContent;
      selIdx = i;
    }

    function selAway(e) {
      if (selBox.contains(e.target)) return;
      closeSel(false);
    }

    function openSel() {
      selList.hidden = false;
      selBox.classList.add('is-open');
      selVal.setAttribute('aria-expanded', 'true');
      markOpt(selIdx);
      selList.focus();
      d.addEventListener('pointerdown', selAway);
    }

    function closeSel(putBack) {
      if (selList.hidden) return;
      selList.hidden = true;
      selBox.classList.remove('is-open');
      selVal.setAttribute('aria-expanded', 'false');
      d.removeEventListener('pointerdown', selAway);
      if (putBack) selVal.focus();
    }

    function pickOpt(i) {
      sel.selectedIndex = i;
      syncSel();
      closeSel(true);
      if (typeof Event === 'function') { sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }

    sel.addEventListener('change', syncSel);
    selVal.addEventListener('click', function () {
      if (selList.hidden) { openSel(); } else { closeSel(true); }
    });

    var selLabel = d.getElementById('f-interestLabel');
    if (selLabel) {
      selLabel.addEventListener('click', function (e) {
        e.preventDefault();
        if (selList.hidden) { openSel(); } else { closeSel(true); }
      });
    }

    selVal.addEventListener('keydown', function (e) {
      if (!selList.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openSel();
      }
    });

    selList.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); markOpt(selIdx + 1); break;
        case 'ArrowUp': e.preventDefault(); markOpt(selIdx - 1); break;
        case 'Home': e.preventDefault(); markOpt(0); break;
        case 'End': e.preventDefault(); markOpt(selItems.length - 1); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          pickOpt(selIdx);
          break;
        case 'Escape':
          e.preventDefault();
          closeSel(true);
          break;
        case 'Tab':
          closeSel(false);
          break;
      }
    });

    /* the trigger sits before the underline, so the focus line still draws */
    selBox.insertBefore(selVal, $('.field__line', selBox) || null);
    selBox.appendChild(selList);
    syncSel();
  }

  /* ---- the wedding date: masked MM / YYYY with its own month wheel ---- */
  var dateIn = $('#f-date');
  var dateBox = dateIn ? dateIn.closest('.field__box') : null;
  var dateWrap = dateIn ? dateIn.closest('.picker') : null;
  if (dateIn && dateBox && dateWrap) {
    dateBox.classList.add('has-picker');
    var thisYear = new Date().getFullYear();

    var dateBtn = d.createElement('button');
    dateBtn.type = 'button';
    dateBtn.className = 'picker__btn';
    dateBtn.setAttribute('aria-label', 'Choose the wedding month and year');
    dateBtn.setAttribute('aria-expanded', 'false');

    var datePop = d.createElement('div');
    datePop.className = 'picker__pop';
    datePop.hidden = true;
    datePop.innerHTML =
      '<div class="picker__head">' +
        '<button type="button" class="picker__step" data-dy="-1" aria-label="One year earlier">–</button>' +
        '<span class="picker__year"></span>' +
        '<button type="button" class="picker__step" data-dy="1" aria-label="One year later">+</button>' +
      '</div>';

    var yearEl = $('.picker__year', datePop);
    var monWrap = d.createElement('div');
    monWrap.className = 'picker__months';
    monWrap.setAttribute('role', 'group');
    monWrap.setAttribute('aria-label', 'Month of the wedding');

    var pickYear = thisYear + 1;
    var pickMonth = -1;

    var monBtns = MONTHS.map(function (label, i) {
      var b = d.createElement('button');
      b.type = 'button';
      b.className = 'picker__m';
      b.textContent = label;
      b.tabIndex = -1;
      b.addEventListener('click', function () {
        pickMonth = i;
        dateIn.value = ('0' + (i + 1)).slice(-2) + ' / ' + pickYear;
        paintDate();
        closePop(true);
        dateIn.dispatchEvent(new Event('input', { bubbles: true }));
      });
      b.addEventListener('keydown', function (e) {
        var to = null;
        if (e.key === 'ArrowRight') to = i + 1;
        else if (e.key === 'ArrowLeft') to = i - 1;
        else if (e.key === 'ArrowDown') to = i + 4;
        else if (e.key === 'ArrowUp') to = i - 4;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = 11;
        if (to === null) return;
        e.preventDefault();
        to = clamp(to, 0, 11);
        b.tabIndex = -1;
        monBtns[to].tabIndex = 0;
        monBtns[to].focus();
      });
      monWrap.appendChild(b);
      return b;
    });
    datePop.appendChild(monWrap);

    var popNote = d.createElement('p');
    popNote.className = 'picker__hint';
    popNote.textContent = 'Leave it be if the date is not settled yet.';
    datePop.appendChild(popNote);

    function readDate() {
      var m = (dateIn.value || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
      if (!m) return;
      pickMonth = clamp(parseInt(m[1], 10) - 1, 0, 11);
      pickYear = clamp(parseInt(m[2], 10), thisYear - 1, thisYear + 15);
    }

    function paintDate() {
      monBtns.forEach(function (b, i) {
        var on = i === pickMonth;
        b.classList.toggle('is-on', on);
        b.tabIndex = on ? 0 : -1;
        b.setAttribute('aria-current', on ? 'true' : 'false');
      });
      if (pickMonth < 0 && monBtns[0]) monBtns[0].tabIndex = 0;
      if (yearEl) yearEl.textContent = pickYear;
    }

    function dateAway(e) {
      if (dateWrap.contains(e.target)) return;
      closePop(false);
    }

    function openPop() {
      readDate();
      paintDate();
      datePop.hidden = false;
      dateBox.classList.add('is-open');
      dateBtn.setAttribute('aria-expanded', 'true');
      var first = monBtns[pickMonth < 0 ? 0 : pickMonth];
      if (first) first.focus();
      d.addEventListener('pointerdown', dateAway);
    }

    function closePop(putBack) {
      if (datePop.hidden) return;
      datePop.hidden = true;
      dateBox.classList.remove('is-open');
      dateBtn.setAttribute('aria-expanded', 'false');
      d.removeEventListener('pointerdown', dateAway);
      if (putBack) dateBtn.focus();
    }

    dateBtn.innerHTML = CHEVRON;
    dateBtn.addEventListener('click', function () {
      if (datePop.hidden) { openPop(); } else { closePop(true); }
    });

    datePop.addEventListener('click', function (e) {
      var step = e.target.closest ? e.target.closest('.picker__step') : null;
      if (!step) return;
      pickYear = clamp(pickYear + parseInt(step.getAttribute('data-dy'), 10), thisYear - 1, thisYear + 15);
      paintDate();
    });

    datePop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePop(true); }
      else if (e.key === 'Tab') { closePop(false); }
    });

    /* keep the field a clean MM / YYYY while it is being typed into */
    dateIn.addEventListener('input', function () {
      var digits = (dateIn.value || '').replace(/\D/g, '').slice(0, 6);
      dateIn.value = digits.length <= 2 ? digits : digits.slice(0, 2) + ' / ' + digits.slice(2);
    });

    dateWrap.insertBefore(dateBtn, $('.field__line', dateWrap) || null);
    dateWrap.appendChild(datePop);
  }



  var yearSlot = $('#yr');
  if (yearSlot) { yearSlot.textContent = String(new Date().getFullYear()); }

  /* any in-page link gets the fixed header taken out of its way */
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var hash = link.getAttribute('href');
      if (!hash || hash === '#' || link.hasAttribute('data-lb-close')) return;
      var target = d.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      var offset = (parseInt(getComputedStyle(d.documentElement).getPropertyValue('--nav-h'), 10) || 76) +
                   (parseInt(getComputedStyle(d.documentElement).getPropertyValue('--ticker-h'), 10) || 38) + 12;
      var top = target.getBoundingClientRect().top + (w.pageYOffset || 0) - offset;
      w.scrollTo({ top: Math.max(top, 0), behavior: motionOK ? 'smooth' : 'auto' });
      if (history.replaceState) { history.replaceState(null, '', hash); }
    });
  });

})();


