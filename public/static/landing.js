(function () {
  "use strict";

  /* ====== gallery images (swap these for your own — see prompts) ====== */
  var GALLERY = (window.MASKGUARD_IMAGES || []);
  if (!GALLERY.length) {
    // graceful placeholders (solid gradient data-uris) so layout works before real art lands
    GALLERY = new Array(9).fill(0).map(function (_, i) {
      var c = i % 2 === 0 ? "#0EA5A0" : "#6D5EF0";
      return "data:image/svg+xml;utf8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">' +
        '<rect width="600" height="800" fill="' + c + '"/></svg>');
    });
  }
  // which cards read as "mask" vs "no mask" for the tag chip
  var LABELS = ["mask", "mask", "nomask", "mask", "mask", "nomask", "mask", "mask", "mask"];
  var CONF = ["98%", "96%", "91%", "97%", "99%", "88%", "95%", "97%", "94%"];

  var isTouch = matchMedia('(hover:none),(pointer:coarse)').matches;
  var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ====== entrance ====== */
  function reveal(el, delay) {
    if (!el) return;
    el.style.transition = "opacity .7s cubic-bezier(.25,.1,.25,1) " + delay + "s, transform .7s cubic-bezier(.25,.1,.25,1) " + delay + "s";
    requestAnimationFrame(function () { el.style.opacity = 1; el.style.transform = "translateY(0)"; });
  }
  ["#logo", "#caption"].forEach(function (s, i) { reveal(document.querySelector(s), 0.05 + i * 0.14); });
  var logoEl = document.getElementById("logo");
  var captionEl = document.getElementById("caption");
  var heroInfo = document.getElementById("hero-info");
  var scrollHint = document.getElementById("scroll-hint");
  setTimeout(function () { heroInfo.style.transition = "opacity .8s ease"; heroInfo.style.opacity = 1; }, 400);
  setTimeout(function () { scrollHint.style.transition = "opacity .8s ease"; scrollHint.style.opacity = .9; }, 700);
  // hero elements we fade out on scroll (all share the same fade factor)
  var heroLayer = [logoEl, captionEl, heroInfo];
  var heroReady = false;
  setTimeout(function () { heroReady = true; }, 1300); // let entrance finish before scroll takes over

  /* ====== custom cursor ====== */
  var cursorEl = document.getElementById("cursor");
  var cursorRing = cursorEl ? cursorEl.querySelector(".ring") : null;
  if (!isTouch) {
    window.addEventListener("mousemove", function (e) {
      cursorEl.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px) translate(-50%,-50%)";
    }, { passive: true });
    // over any clickable element, hide the big custom cursor and restore the
    // native pointer so nav links / buttons feel clickable and the ring stops
    // overlapping the text.
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest("a,button,#hero-enter,#outro-buy,#logo")) {
        cursorEl.style.opacity = "0";
        document.body.style.cursor = "pointer";
      } else {
        cursorEl.style.opacity = "1";
        document.body.style.cursor = "none";
      }
    });
  }

  /* ====== hero media fade in ====== */
  // The old flat face illustration was replaced by a code-driven detection
  // scene (#hero-scene). There are no hero images to wait on, so just fade
  // the whole media layer in once.
  var heroMedia = document.getElementById("hero-media");
  var heroScene = document.getElementById("hero-scene");
  setTimeout(function () { if (heroMedia) heroMedia.style.opacity = 1; }, 250);

  // live confidence chip flicker on the detection scene
  var hsConf = document.getElementById("hs-conf");
  if (hsConf && !reduced) {
    setInterval(function () {
      var v = 94 + Math.floor(Math.random() * 6); // 94–99%
      hsConf.textContent = v + "%";
    }, 1400);
  }

  /* ====== hover detection ring (desktop) ======
     Hover the detection frame -> a gradient ring pulses around it and the
     custom cursor grows, echoing the "found a face" moment. The ring now
     tracks the real position of #hero-scene (which is shifted left on
     desktop) instead of a hardcoded face zone. */
  var canvas = document.getElementById("reveal-canvas");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var heroBox = { w: 0, h: 0, left: 0, top: 0 };
  var sceneCenter = { x: 0.5, y: 0.5, r: 0.18 }; // fractions of hero box
  var mx = -9999, my = -9999, sx = -9999, sy = -9999; // raw + smoothed
  var inZone = false, ringT = 0;

  function sizeCanvas() {
    if (!heroMedia) return;
    var r = heroMedia.getBoundingClientRect();
    heroBox = { w: r.width, h: r.height, left: r.left, top: r.top };
    // measure the scene's actual center + radius from its live rect
    if (heroScene) {
      var s = heroScene.getBoundingClientRect();
      sceneCenter.x = (s.left + s.width / 2 - r.left) / (r.width || 1);
      sceneCenter.y = (s.top + s.height / 2 - r.top) / (r.height || 1);
      sceneCenter.r = Math.min(s.width, s.height) * 0.62 / (Math.min(r.width, r.height) || 1);
    }
    if (!canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    canvas.style.width = r.width + "px"; canvas.style.height = r.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();

  if (!isTouch) {
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX - heroBox.left;
      my = e.clientY - heroBox.top;
    }, { passive: true });
  }

  function heroLoop() {
    if (window.scrollY < window.innerHeight * 0.9 && !isTouch && ctx) {
      var W = heroBox.w, H = heroBox.h;
      var fx = sceneCenter.x * W, fy = sceneCenter.y * H;
      var rr = sceneCenter.r * Math.min(W, H);
      // magnetic snap toward the detection frame
      var ndx = (mx - fx) / (rr * 1.6), ndy = (my - fy) / (rr * 1.6);
      var d = Math.sqrt(ndx * ndx + ndy * ndy);
      var tx = mx, ty = my;
      if (d < 1) { var pull = (1 - d) * 0.16; tx = mx + (fx - mx) * pull; ty = my + (fy - my) * pull; }
      if (sx < -9000) { sx = tx; sy = ty; } else { sx += (tx - sx) * 0.14; sy += (ty - sy) * 0.14; }

      var inside = ((sx - fx) * (sx - fx) + (sy - fy) * (sy - fy)) < rr * rr;
      if (inside && !inZone) { inZone = true; ringT = 1; }
      if (!inside && inZone) { inZone = false; }
      if (cursorRing) cursorRing.style.transform = inside ? "scale(1.5)" : "scale(1)";

      ctx.clearRect(0, 0, W, H);
      if (ringT > 0) {
        var a = ringT;
        ctx.save();
        ctx.beginPath();
        var pr = rr * (1.02 + (1 - a) * 0.14);
        ctx.arc(fx, fy, pr, 0, Math.PI * 2);
        var g = ctx.createLinearGradient(fx - rr, fy - rr, fx + rr, fy + rr);
        g.addColorStop(0, "rgba(14,165,160," + a + ")");
        g.addColorStop(1, "rgba(109,94,240," + a + ")");
        ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        ringT = Math.max(0, ringT - 0.02);
        if (!inside) ringT = Math.max(0, ringT - 0.05);
      }
    }
    requestAnimationFrame(heroLoop);
  }
  requestAnimationFrame(heroLoop);

  /* ====== build gallery grid ====== */
  var panelWrapper = document.getElementById("panel-wrapper");
  var cols = 4;
  function getCols() { var w = innerWidth; return w < 640 ? 2 : (w < 1024 ? 3 : 4); }
  function buildLayout(count, colCount) {
    var rows = [], placed = 0, r = 0;
    while (placed < count) {
      var row = new Array(colCount).fill(-1);
      var a = (r * 2 + (r % 2)) % colCount; row[a] = placed; placed++;
      if (placed < count && r % 3 === 0) {
        var b = (a + 2) % colCount; if (b === a) b = (a + 1) % colCount;
        if (row[b] === -1) { row[b] = placed; placed++; }
      }
      rows.push(row); r++;
    }
    return rows;
  }
  var cardEls = [];
  function renderGrid() {
    cols = getCols();
    panelWrapper.innerHTML = "";
    panelWrapper.style.setProperty("--cols", cols);
    var layout = buildLayout(GALLERY.length, cols);
    cardEls = [];
    layout.forEach(function (row) {
      var rowEl = document.createElement("div");
      rowEl.className = "bp-row"; rowEl.style.setProperty("--cols", cols);
      row.forEach(function (idx, colIdx) {
        var cell = document.createElement("div"); cell.className = "bp-cell";
        if (idx !== -1) {
          var card = document.createElement("div");
          card.className = "bp-card " + (colIdx < cols / 2 ? "origin-left" : "origin-right");
          var img = document.createElement("img");
          img.src = GALLERY[idx]; img.loading = "lazy"; img.alt = "MaskGuard detection sample " + (idx + 1);
          var frame = document.createElement("div"); frame.className = "frame";
          var lab = LABELS[idx % LABELS.length];
          var tag = document.createElement("div"); tag.className = "tag " + lab;
          tag.innerHTML = '<span class="d"></span>' + (lab === "mask" ? "Mask" : "No mask") + ' · ' + CONF[idx % CONF.length];
          card.appendChild(img); card.appendChild(frame); card.appendChild(tag);
          cell.appendChild(card); cardEls.push(card);
        }
        rowEl.appendChild(cell);
      });
      panelWrapper.appendChild(rowEl);
    });
  }
  renderGrid();

  /* ====== scroll phases ====== */
  var spacer = document.getElementById("scroll-spacer");
  var blackPanel = document.getElementById("black-panel");
  var outroOverlay = document.getElementById("outro-overlay");
  var outroInfo = document.getElementById("outro-info");
  var outroBuy = document.getElementById("outro-buy");
  var outroFooter = document.getElementById("outro-footer");
  var maxScroll = 0;

  function recalc() {
    var vh = innerHeight;
    var wrapH = panelWrapper.scrollHeight;
    maxScroll = Math.max(0, wrapH - vh);
    spacer.style.height = (vh + maxScroll + 2 * vh) + "px";
  }
  recalc();

  var symbols = ["87%", "94%", "99%", "MASK", "96%", "SAFE"];
  var lastSym = 0, symTarget = document.getElementById("live-metric");

  function tick(ts) {
    var vh = innerHeight, scrollY = scrollY0();
    // phase 1: panel slides up
    var panelOffset = clamp(vh - scrollY, 0, vh);
    blackPanel.style.transform = "translateY(" + panelOffset + "px)";
    // phase 2: internal scroll
    var wrapperOffset = clamp(scrollY - vh, 0, maxScroll);
    panelWrapper.style.transform = "translateY(" + (-wrapperOffset) + "px)";
    // hide hero after first viewport
    heroMedia.style.visibility = scrollY > vh ? "hidden" : "visible";

    // fade the whole hero layer (logo/nav/caption/hero-info+button) out as the
    // panel slides up — fully gone by ~55% of the first viewport so it never
    // overlaps the panel or the outro headline.
    if (heroReady) {
      var heroFade = clamp(1 - (scrollY / (vh * 0.55)), 0, 1);
      for (var hi = 0; hi < heroLayer.length; hi++) {
        var el = heroLayer[hi]; if (!el) continue;
        el.style.opacity = heroFade;
        el.style.pointerEvents = heroFade < 0.05 ? "none" : "";
      }
    }

    // outro
    var outroStart = vh + maxScroll;
    var op = clamp((scrollY - outroStart) / Math.max(1, vh - 100), 0, 1);
    outroOverlay.style.opacity = op;
    outroInfo.style.opacity = op;
    outroInfo.style.transform = "translateY(" + (-40 * op) + "px)";
    outroBuy.style.transform = "scale(" + op + ")";
    outroBuy.style.pointerEvents = op > 0.5 ? "" : "none";
    outroFooter.style.opacity = op;
    if (scrollHint) scrollHint.style.opacity = scrollY > 40 ? 0 : .9;

    // live metric randomizer
    if (scrollY > vh * 0.3 && symTarget && ts - lastSym > 110) {
      symTarget.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      lastSym = ts;
    }

    // card scale-in
    for (var i = 0; i < cardEls.length; i++) {
      var card = cardEls[i], rect = card.getBoundingClientRect();
      var h = card.offsetHeight || 1, bottom = rect.bottom, top = bottom - h, scale;
      if (bottom <= 0 || top >= vh) { scale = 0; }
      else {
        var enter = clamp((vh - top) / (vh * 0.6), 0, 1);
        var exit = clamp(bottom / (vh * 0.4), 0, 1);
        scale = Math.min(enter, exit);
      }
      card.style.transform = "scale(" + scale + ")";
    }
    requestAnimationFrame(tick);
  }
  function scrollY0() { return window.scrollY || window.pageYOffset || 0; }
  requestAnimationFrame(tick);

  /* ====== resize ====== */
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      sizeCanvas();
      var nc = getCols(); if (nc !== cols) renderGrid();
      recalc();
    }, 150);
  });
})();
