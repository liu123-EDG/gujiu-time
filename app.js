'use strict';
(() => {
  const scenes = [...document.querySelectorAll('.scene')];
  const rail = document.querySelector('.scene-rail');
  const previous = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const canvas = document.querySelector('#ink-transition');
  const context = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const announce = document.querySelector('#announcement');
  let index = 0;
  let busy = false;
  let frame = 0;
  let completeTransition = null;
  let touchStart = null;
  let filmActive = false;

  scenes.forEach((scene, n) => {
    if (!scene.matches('.cover,.dilemma,.conversation,.dark,.poetry,.return,.question')) {
      const scenery = document.createElement('div');
      scenery.className = 'scenery';
      scenery.setAttribute('aria-hidden', 'true');
      scene.prepend(scenery);
    }
    scene.querySelectorAll('.distance-list article,.archive-folio article,.evidence-scale article,.craft-node,.craft-path i,.experiment-step,.map-node').forEach((element, part) => element.style.setProperty('--part', part));
    scene.querySelectorAll('.reveal').forEach((element, order) => {
      element.style.setProperty('--delay', `${Math.min(order * 145, 850)}ms`);
    });
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.dataset.go = String(n);
    dot.setAttribute('aria-label', `第 ${n + 1} 幕：${scene.dataset.title}`);
    dot.title = `${String(n + 1).padStart(2, '0')} · ${scene.dataset.title}`;
    rail.append(dot);
  });
  const dots = [...rail.children];

  function readPosition() {
    // A valid URL wins. An invalid hash always opens the cover.
    if (location.hash) {
      const value = /^#(\d{1,2})$/.exec(location.hash);
      return value ? Math.max(0, Math.min(scenes.length - 1, Number(value[1]) - 1)) : 0;
    }
    try {
      const value = Number(sessionStorage.getItem('gujiu.scene.v3'));
      return Number.isInteger(value) && value >= 0 && value < scenes.length ? value : 0;
    } catch { return 0; }
  }

  function activate(target) {
    const focusWasInScene = scenes[index].contains(document.activeElement);
    scenes.forEach((scene, n) => {
      const active = n === target;
      scene.classList.remove('arrived');
      scene.classList.toggle('active', active);
      scene.inert = !active;
      scene.setAttribute('aria-hidden', String(!active));
      if (!active) scene.scrollTop = 0;
    });
    index = target;
    document.body.classList.toggle('is-dark', scenes[index].classList.contains('dark'));
    // Force a fresh entrance when returning to a previously visited scene.
    void scenes[index].offsetWidth;
    scenes[index].classList.add('arrived');
    document.querySelector('.total').textContent = `/ ${scenes.length}`;
    document.querySelector('.timeline').setAttribute('aria-valuemax', String(scenes.length));
    document.querySelector('#count').textContent = String(index + 1).padStart(2, '0');
    document.querySelector('#scene-name').textContent = scenes[index].dataset.title;
    document.querySelector('#progress').style.width = `${(index + 1) / scenes.length * 100}%`;
    document.querySelector('.timeline').setAttribute('aria-valuenow', String(index + 1));
    previous.disabled = index === 0;
    next.disabled = index === scenes.length - 1;
    dots.forEach((dot, n) => n === index ? dot.setAttribute('aria-current', 'step') : dot.removeAttribute('aria-current'));
    document.querySelectorAll('.chapters button').forEach((button, n) => {
      n === Number(scenes[index].dataset.chapter) ? button.setAttribute('aria-current', 'true') : button.removeAttribute('aria-current');
    });
    try {
      history.replaceState(null, '', `#${index + 1}`);
      sessionStorage.setItem('gujiu.scene.v3', String(index));
    } catch { /* File previews and private mode may restrict persistence. */ }
    announce.textContent = `第 ${index + 1} 幕，共 ${scenes.length} 幕。${scenes[index].dataset.title}`;
    if (focusWasInScene) {
      const heading = scenes[index].querySelector('h1,h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  // Seeded contours avoid flicker: each bloom keeps its shape while growing.
  function randomSource(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // Procedural pigment stamps are generated once, then composited as sprites.
  // Multi-scale noise changes both the wet edge and pigment density. This gives
  // diffusion, granulation and paper-like pinholes without a per-frame filter.
  const stamps = [];
  const vermilionStamps = [];
  let activeStamps = stamps;
  function makeStamp(seed, vermilion = false) {
    const size = 256;
    const random = randomSource(seed);
    const grids = [9, 23, 57].map(side => ({side, values: Array.from({length:(side + 1) ** 2}, random)}));
    function noise(x, y, grid) {
      const gx = x / size * grid.side, gy = y / size * grid.side;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      let fx = gx - ix, fy = gy - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const at = (a,b) => grid.values[b * (grid.side + 1) + a];
      return (at(ix,iy) * (1-fx) + at(ix+1,iy) * fx) * (1-fy) + (at(ix,iy+1) * (1-fx) + at(ix+1,iy+1) * fx) * fy;
    }
    const stamp = document.createElement('canvas');
    stamp.width = stamp.height = size;
    const ctx = stamp.getContext('2d');
    const pixels = ctx.createImageData(size,size);
    const phase = random() * 6;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const nx = (x-size/2)/(size/2)*1.35, ny=(y-size/2)/(size/2)*1.35;
      const angle = Math.atan2(ny,nx);
      const n = noise(x,y,grids[0])*.57 + noise(x,y,grids[1])*.29 + noise(x,y,grids[2])*.14;
      const boundary = 1 + Math.sin(angle*3+phase)*.1 + Math.sin(angle*7-phase)*.055 + (n-.5)*.28;
      const distance = Math.hypot(nx,ny)/boundary;
      let alpha = Math.max(0,Math.min(1,(1.11-distance)/.24));
      alpha = alpha*alpha*(3-2*alpha);
      if(distance>.8) alpha *= .60 + n*.4;
      const pigment=(n-.5)*21;
      const at=(y*size+x)*4;
      pixels.data[at]=(vermilion ? 164 : 39)+pigment;
      pixels.data[at+1]=(vermilion ? 44 : 48)+pigment;
      pixels.data[at+2]=(vermilion ? 30 : 40)+pigment;
      pixels.data[at+3]=Math.round(alpha*255);
    }
    ctx.putImageData(pixels,0,0);
    return stamp;
  }

  function stampBloom(bloom, radius) {
    const extent = radius * 1.35;
    context.drawImage(activeStamps[bloom.stamp], bloom.x-extent, bloom.y-extent*bloom.stretch, extent*2, extent*2*bloom.stretch);
  }

  function makeBlooms(width, height, direction, seed, origin = null) {
    const random = randomSource(seed);
    const blooms = [];
    for (let i = 0; i < 38; i++) {
      const x = random();
      const y = random();
      const distance = origin ? Math.hypot(x-origin.x,y-origin.y)/1.42 : (direction > 0 ? x : 1-x);
      blooms.push({ x: x * width, y: y * height, delay: distance * .48 + random() * .08, radius: Math.max(width * .22, height * .35) * (.65 + random() * .6), stretch: .7 + random() * .65, stamp:i % 6 });
    }
    return blooms;
  }

  function spread(blooms, progress, erase, width, height) {
    context.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    for (const bloom of blooms) {
      const local = Math.max(0, (progress - bloom.delay) / (1 - bloom.delay));
      if (local === 0) continue;
      const radius = bloom.radius * Math.pow(local, .72);
      stampBloom(bloom, radius);
    }
    // One large irregular bloom guarantees full coverage before scene changes.
    // It grows from the edge; no rectangular wipe is used to cover the scene.
    if (progress > .62) {
      const last = { ...blooms[0], x: width * (blooms[0].x < width / 2 ? .1 : .9), y: height * .5, stretch: 1 };
      const radius = Math.hypot(width, height) * 2.6 * Math.pow((progress - .62) / .38, 1.4);
      stampBloom(last, radius);
    }
    context.globalCompositeOperation = 'source-over';
  }

  // Effects follow the story. Reverse navigation uses the same boundary effect.
  const extraTransitions = window.createGujiuTransitions(context, { randomSource, getPaper: () => { preparePaper(); return paperPattern; } });
  const transitionScore = extraTransitions.score.map(([effect]) => effect);
  let paperPattern = null;
  function preparePaper() {
    if (paperPattern) return;
    const sheet = document.createElement('canvas');
    sheet.width = sheet.height = 192;
    const brush = sheet.getContext('2d');
    const random = randomSource(81371);
    brush.fillStyle = '#dbccb0';
    brush.fillRect(0, 0, 192, 192);
    for (let i = 0; i < 1700; i++) {
      const x = random() * 192, y = random() * 192;
      brush.strokeStyle = random() > .5 ? 'rgba(107,89,55,.065)' : 'rgba(255,250,224,.20)';
      brush.beginPath();
      brush.moveTo(x, y);
      brush.lineTo(x + random() * 6, y + random() * 2);
      brush.stroke();
    }
    paperPattern = context.createPattern(sheet, 'repeat');
  }

  function drawScroll(coverage, width, height, direction) {
    if (coverage <= 0) return;
    preparePaper();
    const eased = coverage * coverage * (3 - 2 * coverage);
    const reach = width * .5 * eased;
    const curl = Math.sin(coverage * Math.PI) * Math.min(34, width * .025);
    const rod = Math.max(13, width * .014);
    // Two textured sheets close over the old scene, then roll outward to reveal
    // the new scene. Curved paper edges and shaded wooden rods provide volume.
    for (const side of [-1, 1]) {
      context.save();
      if (side > 0) { context.translate(width, 0); context.scale(-1, 1); }
      context.fillStyle = paperPattern;
      context.beginPath();
      context.moveTo(-2, -2);
      context.lineTo(reach + 2, -2);
      context.bezierCurveTo(reach + curl, height * .25, reach - curl, height * .75, reach + 2, height + 2);
      context.lineTo(-2, height + 2);
      context.closePath();
      context.fill();
      const shade = context.createLinearGradient(reach - rod * 2, 0, reach + rod, 0);
      shade.addColorStop(0, '#4b3f2700'); shade.addColorStop(.6, '#4b3f272e'); shade.addColorStop(1, '#4b3f2700');
      context.fillStyle = shade;
      context.fillRect(reach - rod * 2, 0, rod * 3, height);
      const wood = context.createLinearGradient(reach - rod / 2, 0, reach + rod / 2, 0);
      wood.addColorStop(0, '#5a4932'); wood.addColorStop(.35, '#b49a6b'); wood.addColorStop(.55, '#c8ae7c'); wood.addColorStop(1, '#59452e');
      context.fillStyle = wood;
      context.fillRect(reach - rod / 2, -2, rod, height + 4);
      context.fillStyle = '#443a2a';
      context.fillRect(reach - rod * .65, 0, rod * 1.3, 6);
      context.fillRect(reach - rod * .65, height - 6, rod * 1.3, 6);
      context.strokeStyle = '#9e8a6133';
      context.lineWidth = 1;
      for (let line = 1; line <= 3; line++) {
        context.beginPath(); context.moveTo(reach - rod * line * 1.8, 0); context.lineTo(reach - rod * line * 1.8, height); context.stroke();
      }
      context.restore();
    }
    // A passing calligraphic stroke belongs to the moving paper, not a UI label.
    context.save();
    context.globalAlpha = Math.sin(coverage * Math.PI) * .11;
    context.fillStyle = '#514b34';
    context.font = `${Math.min(height * .45, 280)}px "KaiTi", "SimSun", serif`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText('酿', width * (direction > 0 ? .2 : .8), height * .5);
    context.restore();
  }

  function prepareData(width, height, seed) {
    const random = randomSource(seed);
    const size = Math.max(34, Math.ceil(width / 25));
    const cells = [];
    const glyphs = ['米', '麴', '酿', '水', '温', '时', '曲', '原料', '工序'];
    for (let y = 0; y < height; y += size) for (let x = 0; x < width; x += size) {
      const distance = Math.hypot(x / width - .26, y / height - .48) / 1.2;
      cells.push({x, y, size, delay: distance * .52 + random() * .16, glyph:glyphs[Math.floor(random() * glyphs.length)], label:random() > .62, tone:random()});
    }
    return cells;
  }

  function drawData(cells, progress, opening, direction) {
    context.textAlign = 'center'; context.textBaseline = 'middle';
    for (const cell of cells) {
      const local = Math.max(0, Math.min(1, (progress - cell.delay) / (1 - cell.delay)));
      const amount = opening ? 1 - local : local;
      if (amount <= 0) continue;
      const {x, y, size} = cell;
      context.globalAlpha = Math.min(1, amount * 2.8);
      context.fillStyle = cell.tone > .55 ? '#303e35' : '#344239';
      // The full grid is opaque at the handoff; afterwards each cell disperses
      // independently into a character, a line and a small research node.
      const tileScale = Math.min(1, amount * 3.4);
      const extent = (size + 1) * tileScale;
      context.fillRect(x + (size - extent) / 2, y + (size - extent) / 2, extent, extent);
      context.globalAlpha = Math.min(1, amount * 2) * .65;
      context.strokeStyle = '#a2b28a'; context.lineWidth = .6;
      context.beginPath();
      context.moveTo(x + size * .5, y + size * .5);
      context.lineTo(x + size * .5 + size * direction, y + size * .5);
      context.stroke();
      if (cell.label) {
        context.font = `${Math.round(size * .38)}px "KaiTi", "SimSun", serif`;
        context.fillStyle = '#d6c69a';
        context.fillText(cell.glyph, x + size / 2, y + size / 2);
      } else {
        context.fillStyle = '#c8b17b';
        context.beginPath(); context.arc(x + size / 2, y + size / 2, 1.4, 0, Math.PI * 2); context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  function ripplePath(x, y, radius) {
    context.beginPath();
    for (let i = 0; i <= 180; i++) {
      const angle = i / 180 * Math.PI * 2;
      const r = radius * (1 + Math.sin(angle * 7 + .7) * .009 + Math.sin(angle * 19) * .003);
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r * .76;
      if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.closePath();
  }

  function drawRipple(closing, opening, width, height, direction) {
    const x = width * (direction > 0 ? .71 : .29), y = height * .62;
    const limit = Math.hypot(width, height) * 1.65;
    const radius = Math.pow(closing, .86) * limit;
    if (radius <= 0) return;
    const liquid = context.createRadialGradient(x, y, 0, x, y, radius);
    liquid.addColorStop(0, '#6b482c'); liquid.addColorStop(.5, '#9a7039'); liquid.addColorStop(.9, '#b79250'); liquid.addColorStop(1, '#806439');
    context.fillStyle = liquid;
    ripplePath(x, y, radius); context.fill();
    context.lineWidth = 2;
    for (let ring = 1; ring < 7; ring++) {
      const r = radius * ring / 7;
      context.strokeStyle = `rgba(238,216,165,${.11 + ring * .025})`;
      ripplePath(x, y, r); context.stroke();
      context.strokeStyle = 'rgba(59,47,29,.10)';
      ripplePath(x, y, r + 3); context.stroke();
    }
    if (opening > 0) {
      const reveal = Math.pow(opening, .8) * limit;
      context.globalCompositeOperation = 'destination-out';
      const edge = context.createRadialGradient(x, y, Math.max(0, reveal - 12), x, y, reveal);
      edge.addColorStop(0, '#000'); edge.addColorStop(1, '#0000');
      context.fillStyle = edge; ripplePath(x, y, reveal); context.fill();
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = `rgba(194,161,94,${(1-opening)*.8})`; context.lineWidth = 1.5;
      ripplePath(x, y, reveal + 3); context.stroke();
    }
  }

  function inkTransition(target) {
    if (motion.matches || !context) { activate(target); return; }
    if (!stamps.length) for(let i=0;i<6;i++) stamps.push(makeStamp(813+i*117));
    const vermilion = target === 1 || (index === 1 && target === 0);
    if (vermilion && !vermilionStamps.length) for(let i=0;i<6;i++) vermilionStamps.push(makeStamp(913+i*117,true));
    activeStamps = vermilion ? vermilionStamps : stamps;
    busy = true;
    document.body.classList.add('transitioning');
    document.querySelector('#deck').setAttribute('aria-busy', 'true');
    const scale = Math.min(1, 1280 / innerWidth);
    const width = canvas.width = Math.round(innerWidth * scale);
    const height = canvas.height = Math.round(innerHeight * scale);
    const direction = target > index ? 1 : -1;
    const boundary = Math.abs(target-index) === 1 ? Math.max(target,index) : target;
    const effect = transitionScore[boundary] || 'ink';
    canvas.dataset.effect = effect;
    const isInk = effect === 'ink' || effect === 'vermilion';
    const prepared = extraTransitions.prepare(effect,width,height,target*193+79);
    const chapterChange = scenes[index].dataset.chapter !== scenes[target].dataset.chapter;
    const origin = vermilion ? {x:.73,y:.45} : chapterChange ? {x:.5,y:.5} : null;
    const ink = makeBlooms(width, height, direction, target * 913 + 71, origin);
    const water = makeBlooms(width, height, direction, target * 773 + 19, origin);
    const dataCells = effect === 'data' ? prepareData(width,height,target*117+93) : null;
    const random = randomSource(target * 37 + 913);
    const flecks = Array.from({ length: 100 }, () => ({ x: random() * width, y: random() * height, radius: .5 + random() * 4, at: .05 + random() * .5 }));
    let started = null;
    let switched = false;
    const duration = {ink:2200,vermilion:2200,scroll:2100,data:2300,ripple:2250}[effect] || 2250;
    const finish = () => {
      cancelAnimationFrame(frame);
      if (!switched) activate(target);
      context.clearRect(0, 0, width, height);
      document.body.classList.remove('transitioning');
      document.querySelector('#deck').removeAttribute('aria-busy');
      completeTransition = null;
      busy = false;
    };
    completeTransition = finish;
    function draw(time) {
      started ??= time;
      const t = Math.min(1, (time - started) / duration);
      context.clearRect(0, 0, width, height);
      const closing = Math.min(1,t/.46);
      const opening = Math.max(0,(t-.51)/.49);
      if (effect === 'scroll') drawScroll(t <= .51 ? closing : 1-opening,width,height,direction);
      else if (effect === 'data') drawData(dataCells,t <= .51 ? closing : opening,t > .51,direction);
      else if (effect === 'ripple') drawRipple(closing,opening,width,height,direction);
      else if (isInk) spread(ink,closing,false,width,height);
      else extraTransitions.render(effect,t <= .51 ? closing : 1-opening,width,height,direction,prepared);
      if (isInk && t < .46) {
        context.fillStyle = vermilion ? 'rgba(164,44,30,.65)' : 'rgba(40,50,40,.65)';
        flecks.forEach(fleck => {
          if (t / .46 < fleck.at) return;
          context.beginPath();
          context.ellipse(fleck.x, fleck.y, fleck.radius * 1.8, fleck.radius, -.5, 0, Math.PI * 2);
          context.fill();
        });
      }
      if (t >= .46 && !switched) { activate(target); switched = true; }
      if (isInk && t > .51) spread(water,opening,true,width,height);
      if (t < 1) frame = requestAnimationFrame(draw);
      else finish();
    }
    frame = requestAnimationFrame(draw);
  }

  function go(target) {
    if (busy || !Number.isInteger(target)) return;
    target = Math.min(scenes.length - 1, Math.max(0, target));
    if (target !== index) inkTransition(target);
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-go],[data-next],.identity');
    if (!action) return;
    event.preventDefault();
    go(action.matches('[data-next]') ? index + 1 : action.matches('.identity') ? 0 : Number(action.dataset.go));
  });
  previous.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  document.addEventListener('keydown', event => {
    if (filmActive) {
      if (event.key === 'Escape') { event.preventDefault(); closeFilm(); }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    // Leave Enter and Space to focused controls, links and FAQ summaries.
    if ((event.key === ' ' || event.key === 'Enter') && event.target.closest('button,a,summary')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); go(index + 1); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(index - 1); }
    if (event.key === 'Home') { event.preventDefault(); go(0); }
    if (event.key === 'End') { event.preventDefault(); go(scenes.length - 1); }
    if (event.key.toLowerCase() === 'f') toggleFullscreen();
  });
  document.querySelector('#deck').addEventListener('touchstart', event => {
    if (event.target.closest('[data-game-controls]')) { touchStart = null; return; }
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  document.querySelector('#deck').addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.8) go(index + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else announce.textContent = '当前浏览器不支持网页全屏，可使用浏览器的全屏功能。';
    } catch { announce.textContent = '浏览器未允许全屏，可使用浏览器的全屏功能。'; }
  }
  document.querySelector('#fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    const button = document.querySelector('#fullscreen');
    button.setAttribute('aria-label', active ? '退出全屏演示' : '进入全屏演示');
    button.querySelector('span').textContent = active ? '退出全屏' : '全屏展演';
  });
  // Release the animation lock when changing windows, resizing or restoring a tab.
  document.addEventListener('visibilitychange', () => { if (document.hidden) completeTransition?.(); });
  addEventListener('resize', () => completeTransition?.());
  addEventListener('pagehide', () => completeTransition?.());
  addEventListener('hashchange', () => {
    completeTransition?.();
    go(readPosition());
  });
  motion.addEventListener('change', () => completeTransition?.());
  const film = document.querySelector('#film-intro');
  const video = document.querySelector('#opening-film');
  const playFilm = document.querySelector('#film-play');
  function openFilm() {
    completeTransition?.();
    filmActive = true;
    film.hidden = false;
    document.querySelectorAll('#deck,.masthead,.controls,.scene-rail').forEach(element => { element.inert = true; });
    video.currentTime = 0;
    playFilm.focus({preventScroll:true});
  }
  function closeFilm() {
    video.pause();
    if (document.fullscreenElement === video) document.exitFullscreen().catch(() => {});
    filmActive = false;
    film.hidden = true;
    document.querySelectorAll('#deck,.masthead,.controls,.scene-rail').forEach(element => { element.inert = false; });
    activate(index);
    const heading = scenes[index].querySelector('h1,h2');
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
  }
  playFilm.addEventListener('click', async () => {
    if (!video.paused) { video.pause(); return; }
    try { await video.play(); }
    catch { document.querySelector('#film-status').textContent = '视频暂时无法播放，可以直接进入展演。'; }
  });
  video.addEventListener('play', () => { playFilm.firstChild.textContent = '暂停影像 '; });
  video.addEventListener('pause', () => { playFilm.firstChild.textContent = '播放影像 '; });
  video.addEventListener('ended', closeFilm);
  video.addEventListener('error', () => { document.querySelector('#film-status').textContent = '视频暂时无法加载，可以直接进入展演。'; });
  document.querySelector('#film-continue').addEventListener('click', closeFilm);
  document.querySelector('#film-replay').addEventListener('click', openFilm);
  document.addEventListener('visibilitychange', () => { if (document.hidden && filmActive) video.pause(); });
  const homeFilm = !location.hash || location.hash === '#1';
  activate(homeFilm ? 0 : readPosition());
  if (homeFilm) openFilm(); else film.hidden = true;
})();
