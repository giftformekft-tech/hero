(function(wp){
  const { registerBlockType } = wp.blocks;
  const { __ } = wp.i18n;
  const be = wp.blockEditor || {};
  const { MediaUpload, MediaUploadCheck, URLInputButton, InspectorControls } = be;
  const { Button, PanelBody, TextControl, ToggleControl, RangeControl, SelectControl, DateTimePicker } = wp.components || {};

  function bestMedia(media){
    if (!media) return {};
    const full = media?.sizes?.full?.url || media?.url || media?.source_url || '';
    const large = media?.sizes?.large?.url || '';
    const medium = media?.sizes?.medium_large?.url || media?.sizes?.medium?.url || '';
    const thumb = media?.sizes?.thumbnail?.url || '';
    const w = media?.width || media?.media_details?.width || null;
    const h = media?.height || media?.media_details?.height || null;
    let srcset = [];
    if (thumb) srcset.push(thumb + ' 150w');
    if (medium) srcset.push(medium + ' 768w');
    if (large) srcset.push(large + ' 1024w');
    if (full) srcset.push(full + ' ' + (w||1920) + 'w');
    return { full, large, medium, thumb, w, h, srcset: srcset.join(', ') };
  }

  function SlideWarning({slide, layoutPreset}){
    const w = slide.imageW || 0;
    let minW = 1400;
    if (layoutPreset === 'wide') minW = 1600;
    if (layoutPreset === 'full') minW = 1920;
    if (w && w < minW){
      return wp.element.createElement('div', { className:'hsb-warn' },
        `Figyelem: a kép szélessége ${w}px (ajánlott legalább ${minW}px ehhez az elrendezéshez).`
      );
    }
    return null;
  }

  registerBlockType('hsb/hero-slider', {
    title: __('Hero Slider', 'hsb'),
    icon: 'images-alt2',
    category: 'design',
    attributes: {
      slides: { type: 'array', default: [] },
      autoplay: { type: 'boolean', default: true },
      autoplayDelay: { type: 'number', default: 5000 },
      height: { type: 'string', default: '60vh' },
      showDots: { type: 'boolean', default: true },
      showArrows: { type: 'boolean', default: true },
      darkOverlay: { type: 'number', default: 30 },
      layoutPreset: { type: 'string', default: 'boxed' },
      debugMode: { type: 'boolean', default: false },
      safeMode: { type: 'boolean', default: false },
      controlsType: { type: 'string', default: 'arrows-dots' },
      arrowStyle: { type: 'string', default: 'circle' },
      arrowIcon: { type: 'string', default: 'chevron' },
      controlsColor: { type: 'string', default: '#ffffff' },
      controlsBg: { type: 'string', default: 'rgba(0,0,0,0.4)' },
      arrowSize: { type: 'number', default: 44 },
      mobileFocalX: { type: 'number', default: 50 },
      mobileFocalY: { type: 'number', default: 50 },
      showMobileGuide: { type: 'boolean', default: false },
      enableSwipe: { type: 'boolean', default: true },
      smartContrast: { type: 'boolean', default: true },
      layoutStyle: { type: 'string', default: 'center' },
      mobileFullWidth: { type: 'boolean', default: false },
      mobileCrop: { type: 'boolean', default: true },
      scheduleEnabled: { type: 'boolean', default: false },
      scheduleDays: { type: 'array', default: [] },
      scheduleStart: { type: 'string', default: "" },
      scheduleEnd: { type: 'string', default: "" }
    },
    edit: ({ attributes, setAttributes }) => {
      const A = attributes;
      const slides = A.slides || [];

      const addSlide = () => setAttributes({ slides: [...slides, {
        imageUrl:'', imageW:null, imageH:null, imageThumb:'', imageMedium:'', imageLarge:'', imageSrcset:'',
        heading:'Hero címsor', subheading:'Alcím', ctaText:'Tovább', ctaUrl:'#',
        focalX: null, focalY: null, lqip:'',
        scheduleEnabled:false, scheduleDays:[], scheduleStart:'', scheduleEnd:''
      }] });
      const updateSlide = (i, patch) => { const next = slides.slice(); next[i] = { ...next[i], ...patch }; setAttributes({ slides: next }); };
      const removeSlide = (i) => { const next = slides.slice(); next.splice(i,1); setAttributes({ slides: next }); };

      function applyPreset(val){
        let newHeight = A.height;
        let align;
        if (val === 'full'){ newHeight = '90vh'; align = 'full'; }
        else if (val === 'wide'){ newHeight = '70vh'; align = 'wide'; }
        else if (val === 'boxed'){ newHeight = '50vh'; align = undefined; }
        const patch = { layoutPreset: val, height: newHeight };
        if (typeof align !== 'undefined') patch.align = align;
        setAttributes(patch);
      }

      function SlideItem({slide, index}){
        const bg = slide.imageUrl ? `url(${slide.imageUrl})` : 'none';
        return wp.element.createElement('div', { className: 'hsb-slide hsb-editor' },
          wp.element.createElement('div', { className: 'preview', style: { backgroundImage: bg, backgroundColor: '#eaeaea' } },
            wp.element.createElement('div', { className:'thirds-grid' },
              ...Array.from({length:9}).map(()=> wp.element.createElement('div', null))
            ),
            A.mobileCrop && A.showMobileGuide && slide.imageUrl ? wp.element.createElement('div', { className:'hsb-mobile-guide' },
              wp.element.createElement('div', { className:'mask', style: { backgroundImage: bg, backgroundPosition: `${(slide.focalX ?? A.mobileFocalX)}% ${(slide.focalY ?? A.mobileFocalY)}%` } }),
              wp.element.createElement('div', { className:'hsb-guide-label' }, 'Mobil előnézet ~390×700')
            ) : null
          ),
          wp.element.createElement(SlideWarning, { slide, layoutPreset: A.layoutPreset }),
          wp.element.createElement('div', { className: 'slide-row' },
            wp.element.createElement(TextControl, { label: __('Címsor', 'hsb'), value: slide.heading || '', onChange: (v)=>updateSlide(index, { heading: v }) }),
            wp.element.createElement(TextControl, { label: __('Alcím', 'hsb'), value: slide.subheading || '', onChange: (v)=>updateSlide(index, { subheading: v }) })
          ),
          wp.element.createElement('div', { className: 'slide-row' },
            wp.element.createElement(TextControl, { label: __('CTA szöveg', 'hsb'), value: slide.ctaText || '', onChange: (v)=>updateSlide(index, { ctaText: v }) }),
            wp.element.createElement(URLInputButton, { label: __('CTA link', 'hsb'), url: slide.ctaUrl || '', onChange: (v)=>updateSlide(index, { ctaUrl: v }) })
          ),
          wp.element.createElement('div', { className: 'slide-row' },
            wp.element.createElement(SelectControl, { label: __('Fókuszpont forrása (mobil)', 'hsb'),
              value: (slide.focalX!=null || slide.focalY!=null) ? 'per-slide' : 'global',
              options: [
                { label: __('Globális (blokk beállítás)', 'hsb'), value: 'global' },
                { label: __('Per-dia (egyedi)', 'hsb'), value: 'per-slide' }
              ],
              disabled: A.mobileCrop === false,
              onChange: (v)=>{
                if (v==='global'){ updateSlide(index, { focalX: null, focalY: null }); }
                else { updateSlide(index, { focalX: A.mobileFocalX, focalY: A.mobileFocalY }); }
              }
            }),
            wp.element.createElement(SelectControl, { label: __('Megjelenés időzítése – napok', 'hsb'),
              value: slide.scheduleDays || [], multiple: true,
              options: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>({label:d, value:d})),
              onChange: (v)=>updateSlide(index, { scheduleDays: v })
            })
          ),
          wp.element.createElement('div', { className:'slide-row' },
            wp.element.createElement(ToggleControl, { label: __('Időzítés bekapcsolása', 'hsb'), checked: !!slide.scheduleEnabled, onChange:(v)=>updateSlide(index, { scheduleEnabled: v }) }),
            wp.element.createElement(TextControl, { label: __('LQIP (opcionális kis kép URL)', 'hsb'), value: slide.lqip || '', onChange:(v)=>updateSlide(index, { lqip: v }) })
          ),
          wp.element.createElement('div', { className:'slide-row' },
            wp.element.createElement(TextControl, { label: __('Kezdet (ISO, pl. 2025-10-17T08:00)'), value: slide.scheduleStart || '', onChange:(v)=>updateSlide(index, { scheduleStart: v }) }),
            wp.element.createElement(TextControl, { label: __('Vége (ISO, pl. 2025-10-20T23:59)'), value: slide.scheduleEnd || '', onChange:(v)=>updateSlide(index, { scheduleEnd: v }) })
          ),
          wp.element.createElement(MediaUploadCheck, {},
            wp.element.createElement(MediaUpload, {
              onSelect: (media)=>{
                const m = bestMedia(media);
                updateSlide(index, { imageUrl: m.full, imageW: m.w, imageH: m.h, imageThumb: m.thumb, imageMedium: m.medium, imageLarge: m.large, imageSrcset: m.srcset, lqip: m.thumb || slide.lqip });
              },
              allowedTypes: ['image'],
              render: ({ open }) => wp.element.createElement(Button, { onClick: open, variant: 'secondary' }, slide.imageUrl ? __('Kép cseréje', 'hsb') : __('Kép feltöltése', 'hsb'))
            })
          ),
          wp.element.createElement(Button, { onClick: ()=>{ const next=slides.slice(); next.splice(index,1); setAttributes({ slides: next }); }, variant: 'link', isDestructive: true, style: { marginTop: '8px' } }, __('Dia törlése', 'hsb'))
        );
      }

      return [
        wp.element.createElement(InspectorControls, {},
          wp.element.createElement(PanelBody, { title: __('Hero layout', 'hsb'), initialOpen: true },
            wp.element.createElement(SelectControl, { label: __('Elrendezés (magasság)', 'hsb'),
              value: A.layoutPreset || 'boxed',
              options: [
                { label: __('Teljes szélesség (90vh)', 'hsb'), value: 'full' },
                { label: __('Széles (70vh)', 'hsb'), value: 'wide' },
                { label: __('Normál (50vh)', 'hsb'), value: 'boxed' },
                { label: __('Egyedi magasság', 'hsb'), value: 'custom' },
              ],
              onChange: applyPreset
            }),
            wp.element.createElement(TextControl, { label: __('Egyedi magasság', 'hsb'), value: A.height, onChange: (v)=>setAttributes({ height: v }) }),
            wp.element.createElement(ToggleControl, { label: __('Mobilon teljes szélesség', 'hsb'),
              help: __('Bekapcsolva a slider kitölti a teljes képernyőszélességet mobil nézetben.', 'hsb'),
              checked: !!A.mobileFullWidth,
              onChange: (v)=>setAttributes({ mobileFullWidth: v })
            }),
            wp.element.createElement(ToggleControl, { label: __('Mobil fókuszált kivágás', 'hsb'),
              help: __('Bekapcsolva mobilon a fókuszponttal kivágott nézet használható. Kikapcsolva a kép középre igazítva jelenik meg.', 'hsb'),
              checked: A.mobileCrop !== false,
              onChange: (v)=>setAttributes({ mobileCrop: v })
            }),
            wp.element.createElement(SelectControl, { label: __('Sablon (szöveg elrendezés)', 'hsb'),
              value: A.layoutStyle || 'center',
              options: [
                { label: __('Középre igazított', 'hsb'), value: 'center' },
                { label: __('Balra igazított', 'hsb'), value: 'left' },
                { label: __('Közép + maszk (gradient)', 'hsb'), value: 'center-mask' },
              ],
              onChange: (v)=>setAttributes({ layoutStyle: v })
            })
          ),
          wp.element.createElement(PanelBody, { title: __('Vezérlők & Stílus', 'hsb'), initialOpen: false },
            wp.element.createElement(SelectControl, { label: __('Vezérlők típusa', 'hsb'),
              value: A.controlsType,
              options: [
                { label: __('Nyilak + pöttyök', 'hsb'), value: 'arrows-dots' },
                { label: __('Nyilak + számok', 'hsb'), value: 'arrows-numbers' },
                { label: __('Csak számok (minimal)', 'hsb'), value: 'minimal' },
                { label: __('Semmi', 'hsb'), value: 'none' },
              ],
              onChange: (v)=>setAttributes({ controlsType: v })
            }),
            wp.element.createElement(SelectControl, { label: __('Nyíl stílus', 'hsb'),
              value: A.arrowStyle,
              options: [
                { label: __('Kör', 'hsb'), value: 'circle' },
                { label: __('Négyzet', 'hsb'), value: 'square' },
                { label: __('Ghost', 'hsb'), value: 'ghost' },
              ],
              onChange: (v)=>setAttributes({ arrowStyle: v })
            }),
            wp.element.createElement(SelectControl, { label: __('Nyíl ikon', 'hsb'),
              value: A.arrowIcon,
              options: [
                { label: __('Chevron', 'hsb'), value: 'chevron' },
                { label: __('Nyíl', 'hsb'), value: 'arrow' },
              ],
              onChange: (v)=>setAttributes({ arrowIcon: v })
            }),
            wp.element.createElement(RangeControl, { label: __('Nyíl méret (px)', 'hsb'), min:32, max:72, step:2, value: A.arrowSize, onChange:(v)=>setAttributes({ arrowSize: v }) }),
            wp.element.createElement(TextControl, { label: __('Vezérlők színe (CSS szín)', 'hsb'), value: A.controlsColor, onChange:(v)=>setAttributes({ controlsColor: v }) }),
            wp.element.createElement(TextControl, { label: __('Vezérlők háttér (CSS szín)', 'hsb'), value: A.controlsBg, onChange:(v)=>setAttributes({ controlsBg: v }) }),
          ),
          wp.element.createElement(PanelBody, { title: __('Viselkedés & hozzáadott mágia', 'hsb'), initialOpen: false },
            wp.element.createElement(ToggleControl, { label: __('Autoplay', 'hsb'), checked: !!A.autoplay, onChange: (v)=>setAttributes({ autoplay: v }) }),
            wp.element.createElement(RangeControl, { label: __('Autoplay késleltetés (ms)', 'hsb'), min:1500, max:15000, step:500, value: A.autoplayDelay, onChange: (v)=>setAttributes({ autoplayDelay: v }) }),
            wp.element.createElement(RangeControl, { label: __('Alap overlay (%)', 'hsb'), min:0, max:80, step:5, value: A.darkOverlay, onChange: (v)=>setAttributes({ darkOverlay: v }) }),
            wp.element.createElement(ToggleControl, { label: __('Swipe engedélyezése (mobil/touch)', 'hsb'), checked: !!A.enableSwipe, onChange: (v)=>setAttributes({ enableSwipe: v }) }),
            wp.element.createElement(ToggleControl, { label: __('Okos kontraszt (auto szín/overlay)', 'hsb'), checked: !!A.smartContrast, onChange: (v)=>setAttributes({ smartContrast: v }) }),
            wp.element.createElement(ToggleControl, { label: __('Safe mód (nincs autoplay)', 'hsb'), checked: !!A.safeMode, onChange: (v)=>setAttributes({ safeMode: v }) }),
            wp.element.createElement(ToggleControl, { label: __('Debug mód', 'hsb'), checked: !!A.debugMode, onChange: (v)=>setAttributes({ debugMode: v }) }),
          )
        ),
        wp.element.createElement('div', { className: 'hsb-editor' },
          wp.element.createElement('h3', null, __('Hero Slider diák', 'hsb')),
          slides.map((s, i)=> wp.element.createElement(SlideItem, { key: i, slide: s, index: i })),
          wp.element.createElement(Button, { variant: 'primary', onClick: addSlide }, __('+ Dia hozzáadása', 'hsb'))
        )
      ];
    },
    save: ({ attributes }) => {
      const A = attributes;
      const slides = A.slides || [];
      const overlayOpacity = (typeof A.darkOverlay === 'number' ? A.darkOverlay : 30) / 100;

      const classNames = ['hsb-hero'];
      if (A.mobileFullWidth) classNames.push('hsb-mobile-full');

      return wp.element.createElement('div', { className: classNames.join(' '),
        'data-mobile-crop': A.mobileCrop === false ? 'false' : undefined,
        'data-autoplay': String(!!A.autoplay),
        'data-delay': String(A.autoplayDelay || 5000),
        'data-show-dots': String(!!A.showDots),
        'data-show-arrows': String(!!A.showArrows),
        'data-debug': String(!!A.debugMode),
        'data-safe': String(!!A.safeMode),
        'data-controls': A.controlsType || 'arrows-dots',
        'data-arrow-style': A.arrowStyle || 'circle',
        'data-arrow-icon': A.arrowIcon || 'chevron',
        'data-ctrl-color': A.controlsColor || '#ffffff',
        'data-ctrl-bg': A.controlsBg || 'rgba(0,0,0,0.4)',
        'data-arrow-size': String(A.arrowSize || 44),
        'data-swipe': String(!!A.enableSwipe),
        'data-smart': String(!!A.smartContrast),
        'data-layout': A.layoutStyle || 'center',
        style: { '--hsb-height': A.height || '60vh', '--hsb-overlay': overlayOpacity }
      },
        A.debugMode ? wp.element.createElement('div', { className: 'hsb-debug' }, 'HSB debug') : null,
        wp.element.createElement('div', { className: 'hsb-viewport' },
          wp.element.createElement('div', { className: 'hsb-track' },
            slides.map((s, i)=> {
              const hasDimensions = Number(s.imageW) > 0 && Number(s.imageH) > 0;
              const slideStyle = hasDimensions ? { '--hsb-mobile-ratio': `${s.imageW} / ${s.imageH}` } : undefined;
              const mobileRatio = hasDimensions ? String(Number(s.imageH) / Number(s.imageW)) : undefined;
              return wp.element.createElement('div', {
                className: 'hsb-slide',
                key: i,
                style: slideStyle,
                'data-mobile-ratio': mobileRatio,
                'data-schedule-enabled': String(!!s.scheduleEnabled),
                'data-schedule-days': (s.scheduleDays||[]).join(','),
                'data-schedule-start': s.scheduleStart || '',
                'data-schedule-end': s.scheduleEnd || ''
              },
                // LQIP blur-up réteg
                (s.lqip ? wp.element.createElement('div', { className:'lqip', style:{ backgroundImage: `url(${s.lqip})` } } ) : null),
                s.imageUrl ? wp.element.createElement('img', {
                  className: 'bg-img',
                  src: s.imageUrl,
                  srcSet: s.imageSrcset || undefined,
                  sizes: '100vw',
                  alt: s.heading || ('Slide ' + (i+1)),
                  loading: i===0 ? 'eager' : 'lazy',
                  decoding: 'async',
                  fetchpriority: i===0 ? 'high' : undefined,
                  'data-fx': String( (s.focalX!=null ? s.focalX : A.mobileFocalX) || 50 ),
                  'data-fy': String( (s.focalY!=null ? s.focalY : A.mobileFocalY) || 50 )
                }) : null,
                wp.element.createElement('div', { className: 'overlay' }),
                wp.element.createElement('div', { className: 'content' },
                  wp.element.createElement('div', { className: 'inner' },
                    wp.element.createElement('h2', null, s.heading || ''),
                    wp.element.createElement('p', null, s.subheading || ''),
                    (s.ctaText && s.ctaUrl) ? wp.element.createElement('a', { className: 'hsb-btn', href: s.ctaUrl }, s.ctaText) : null
                  )
                )
              );
            })
          )
        )
      );
    }
  });
})(window.wp);
