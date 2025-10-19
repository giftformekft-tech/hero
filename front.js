(function(){
  function shouldShowSlide(slideEl){
    const enabled = slideEl.getAttribute('data-schedule-enabled') === 'true';
    if (!enabled) return true;
    try {
      const now = new Date();
      const start = slideEl.getAttribute('data-schedule-start');
      const end   = slideEl.getAttribute('data-schedule-end');
      const days  = (slideEl.getAttribute('data-schedule-days') || '').split(',').filter(Boolean);
      if (start){ const s = new Date(start); if (now < s) return false; }
      if (end){ const e = new Date(end); if (now > e) return false; }
      if (days.length){
        const map = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const dn = map[now.getDay()];
        if (!days.includes(dn)) return false;
      }
      return true;
    } catch(e){ return true; }
  }

  function applySmartContrast(slideEl, img){
    const enabled = slideEl.closest('.hsb-hero')?.dataset.smart === 'true';
    if (!enabled || !img) return;
    try {
      const canvas = document.createElement('canvas');
      const w = canvas.width = 64, h = canvas.height = 64;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0,0,w,h).data;
      let r=0,g=0,b=0,count=0;
      for (let i=0;i<data.length;i+=4){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++; }
      r/=count; g/=count; b/=count;
      // Relative luminance (sRGB)
      const nl = (v)=>{ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      const L = 0.2126*nl(r)+0.7152*nl(g)+0.0722*nl(b);
      // Decide text color and overlay strength
      const text = (L > 0.5) ? '#111' : '#fff';
      const overlay = (L > 0.5) ? 0.35 : 0.2; // világos kép → erősebb overlay
      slideEl.style.setProperty('--hsb-text', text);
      slideEl.style.setProperty('--hsb-overlay', overlay);
      slideEl.classList.add('smart-contrast');
    } catch(e){ /* fail silently */ }
  }

  function addPreload(img){
    try {
      if (!img || img.dataset.preloaded) return;
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = 'image'; link.href = img.currentSrc || img.src;
      document.head.appendChild(link);
      img.setAttribute('fetchpriority','high');
      img.dataset.preloaded = 'true';
    } catch(e){}
  }

  function syncMobileRatio(slideEl, img){
    if (!slideEl || !img) return null;
    const widthAttr = parseInt(img.getAttribute('width') || '', 10);
    const heightAttr = parseInt(img.getAttribute('height') || '', 10);
    const w = img.naturalWidth || widthAttr;
    const h = img.naturalHeight || heightAttr;
    if (!w || !h) return null;
    slideEl.style.setProperty('--hsb-mobile-ratio', w + ' / ' + h);
    slideEl.dataset.mobileRatio = String(h / w);
    return h / w;
  }

  function buildDots(root, slidesLen, controlsType){
    const dots = Array.from({length: slidesLen}).map((_,i)=>{
      const b = document.createElement('button');
      b.setAttribute('aria-label','Ugrás a(z) ' + (i+1) + '. diára');
      if (controlsType === 'arrows-numbers' || controlsType === 'minimal'){ b.textContent = (i+1); }
      return b;
    });
    const wrap = document.createElement('div');
    wrap.className = 'hsb-dots ' + ((controlsType === 'arrows-numbers' || controlsType === 'minimal') ? 'numbers' : 'dots');
    dots.forEach(d=>wrap.appendChild(d));
    return {wrap, dots};
  }

  function init(root){
    if (!root || root.dataset.hsbReady === 'true') return false;
    const viewportEl = root.querySelector('.hsb-viewport');
    const track = root.querySelector('.hsb-track');
    let slides = Array.from(root.querySelectorAll('.hsb-slide')).filter(shouldShowSlide);
    if (!track || slides.length === 0) return false;

    // Remove hidden slides from DOM flow (schedule)
    Array.from(root.querySelectorAll('.hsb-slide')).forEach(el=>{ if (!slides.includes(el)) el.style.display = 'none'; });

    const autoplay = root.dataset.autoplay === 'true' && root.dataset.safe !== 'true';
    const delay = parseInt(root.dataset.delay || '5000', 10);
    const showDots = root.dataset.showDots === 'true';
    const showArrows = root.dataset.showArrows === 'true';
    const controlsType = root.dataset.controls || 'arrows-dots';
    const arrowStyle = root.dataset.arrowStyle || 'circle';
    const arrowIcon = root.dataset.arrowIcon || 'chevron';
    const controlsColor = root.dataset.ctrlColor || '#ffffff';
    const controlsBg = root.dataset.ctrlBg || 'rgba(0,0,0,0.4)';
    const arrowSize = parseInt(root.dataset.arrowSize || '44', 10);
    const enableSwipe = root.dataset.swipe !== 'false';
    const smart = root.dataset.smart === 'true';

    root.style.setProperty('--hsb-ctrl-color', controlsColor);
    root.style.setProperty('--hsb-ctrl-bg', controlsBg);
    root.style.setProperty('--hsb-arrow', arrowSize + 'px');
    root.classList.remove('hsb-theme-circle','hsb-theme-square','hsb-theme-ghost','hsb-layout-center','hsb-layout-left','hsb-layout-center-mask');
    root.classList.add('hsb-theme-' + (arrowStyle || 'circle'));
    const layout = root.dataset.layout || 'center';
    root.classList.add('hsb-layout-' + layout);

    const adjustMobileAspect = root.classList.contains('hsb-mobile-full') && root.dataset.mobileCrop === 'false';

    // State
    let index = 0;
    let timer = null;
    let dotsWrap = null;
    let dots = null;

    function updateActiveHeight(targetIndex = index){
      if (!adjustMobileAspect) return;
      const slideEl = slides[targetIndex];
      if (!slideEl) return;
      const viewportWidth = (viewportEl && viewportEl.clientWidth) || root.clientWidth || window.innerWidth || 0;
      if (!viewportWidth) return;
      let ratio = parseFloat(slideEl.dataset.mobileRatio || '');
      if (!ratio || !isFinite(ratio)){
        const img = slideEl.querySelector('img.bg-img');
        if (!img) return;
        const computed = syncMobileRatio(slideEl, img);
        if (!computed) return;
        ratio = computed;
      }
      const heightPx = viewportWidth * ratio;
      if (heightPx > 0){
        root.style.setProperty('--hsb-mobile-active-height', heightPx + 'px');
      }
    }

    // LCP-boost: preload + blur-up + smart contrast on first visible slide
    slides.forEach((s, i)=>{
      const img = s.querySelector('img.bg-img');
      const lqip = s.querySelector('.lqip');
      if (img){
        if (i===0){ addPreload(img); }
        if (lqip){
          if (img.complete) s.classList.add('loaded');
          img.addEventListener('load', ()=>{ s.classList.add('loaded'); });
        }
        if (smart){
          if (img.complete) applySmartContrast(s, img);
          else img.addEventListener('load', ()=>applySmartContrast(s, img));
        }
        if (adjustMobileAspect){
          const applyRatio = ()=>{ syncMobileRatio(s, img); if (i === index) updateActiveHeight(i); };
          if (img.complete) applyRatio();
          else img.addEventListener('load', applyRatio, { once: true });
        }
      }
    });

    function goto(i, animate=true){
      index = (i + slides.length) % slides.length;
      if (!animate) track.style.transition = 'none';
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (!animate){ void track.offsetWidth; track.style.transition = ''; }
      if (dots) dots.forEach((d, di)=>d.setAttribute('aria-current', di===index ? 'true' : 'false'));
      if (adjustMobileAspect) updateActiveHeight(index);
    }

    function next(){ goto(index+1); }
    function prev(){ goto(index-1); }

    // Arrows
    if (showArrows && slides.length > 1 && controlsType !== 'none' && controlsType !== 'minimal'){
      const arrows = document.createElement('div');
      arrows.className = 'hsb-arrows';
      const makeIcon = (dir)=>{
        const span = document.createElement('span'); span.className='icon';
        span.innerHTML = (arrowIcon === 'arrow') ? (dir==='prev' ? '&larr;' : '&rarr;') : (dir==='prev' ? '&#10094;' : '&#10095;');
        return span;
      };
      const bPrev = document.createElement('button'); bPrev.className='prev'; bPrev.setAttribute('aria-label','Előző'); bPrev.appendChild(makeIcon('prev'));
      const bNext = document.createElement('button'); bNext.className='next'; bNext.setAttribute('aria-label','Következő'); bNext.appendChild(makeIcon('next'));
      bPrev.addEventListener('click', ()=>{ stop(); prev(); start(); });
      bNext.addEventListener('click', ()=>{ stop(); next(); start(); });
      arrows.appendChild(bPrev); arrows.appendChild(bNext);
      root.appendChild(arrows);
    }

    // Dots
    if (slides.length > 1 && controlsType !== 'none'){
      const built = buildDots(root, slides.length, controlsType);
      dotsWrap = built.wrap; dots = built.dots;
      dots.forEach((b, i)=> b.addEventListener('click', ()=>{ stop(); goto(i); start(); }));
      root.appendChild(dotsWrap);
    }

    function start(){ if (!autoplay || slides.length < 2) return; stop(); timer = setInterval(next, delay); }
    function stop(){ if (timer) { clearInterval(timer); timer = null; } }
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);

    // Swipe
    if (enableSwipe && slides.length > 1){
      const viewport = viewportEl || root;
      let startX=0, startY=0, dx=0, dy=0, dragging=false, lockedAxis=null;
      const threshold = 30, vertTol=0.58;
      function onStart(x,y){ dragging=true; startX=x; startY=y; dx=0; dy=0; lockedAxis=null; stop(); }
      function onMove(x,y){
        if(!dragging) return;
        dx=x-startX; dy=y-startY;
        if(!lockedAxis){
          if (Math.abs(dx)>6 || Math.abs(dy)>6){
            const ratio=Math.abs(dy)/Math.max(1,Math.abs(dx));
            lockedAxis=(ratio>vertTol)?'y':'x';
          }
        }
        if(lockedAxis==='x'){
          const width=viewport.clientWidth||1, percent=(dx/width)*100;
          track.style.transition='none';
          track.style.transform='translateX(' + ( -index*100 + percent ) + '%)';
        }
      }
      function onEnd(){
        if(!dragging) return;
        dragging=false;
        const width=viewport.clientWidth||1, passed=Math.abs(dx)>Math.max(threshold,width*0.12);
        if(lockedAxis==='x' && passed){ if(dx<0) next(); else prev(); } else { goto(index,false); }
        start(); track.style.transition=''; dx=dy=0; lockedAxis=null;
      }
      const hasPointer='PointerEvent' in window;
      if(hasPointer){
        viewport.addEventListener('pointerdown', e=>{ if(e.isPrimary) onStart(e.clientX,e.clientY); }, {passive:true});
        viewport.addEventListener('pointermove', e=>{ if(e.isPrimary) onMove(e.clientX,e.clientY); }, {passive:true});
        viewport.addEventListener('pointerup',   e=>{ if(e.isPrimary) onEnd(); }, {passive:true});
        viewport.addEventListener('pointercancel', onEnd, {passive:true});
        viewport.addEventListener('pointerleave', onEnd, {passive:true});
      } else {
        viewport.addEventListener('touchstart', e=>{ const t=e.touches[0]; if(t) onStart(t.clientX,t.clientY); }, {passive:true});
        viewport.addEventListener('touchmove',  e=>{ const t=e.touches[0]; if(t) onMove(t.clientX,t.clientY); }, {passive:true});
        viewport.addEventListener('touchend', onEnd, {passive:true});
        viewport.addEventListener('touchcancel', onEnd, {passive:true});
      }
    }

    if (adjustMobileAspect){
      updateActiveHeight(0);
      const resizeHandler = ()=>updateActiveHeight(index);
      window.addEventListener('resize', resizeHandler);
    }

    goto(0); start();
    root.dataset.hsbReady = 'true';
    return true;
  }

  function findAllAndInit(){ document.querySelectorAll('.hsb-hero').forEach(init); }

  if (document.readyState !== 'loading') { findAllAndInit(); }
  document.addEventListener('DOMContentLoaded', findAllAndInit);
  window.addEventListener('load', findAllAndInit);
  setTimeout(findAllAndInit, 0);
  const mo = new MutationObserver(findAllAndInit);
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();
