
// ══════════════════════════════════
// 0. 启动与安全检查
// ══════════════════════════════════
console.log("🚀 index.js 已连接，准备启动预加载...");

document.addEventListener('DOMContentLoaded', () => {
    // 将所有依赖 DOM 的逻辑包裹在这里
    initWeddingApp();
});

function initWeddingApp() {
    gsap.registerPlugin(ScrollToPlugin);

    // 1. 初始化所有全局变量（带空检查）
    const mainVideo = document.getElementById('main-video');
    const bgm = document.getElementById('global-bgm');
    const copyBtn = document.getElementById('btn-copy-info');

    // 2. 绑定视频进度逻辑
    if (mainVideo) {
        mainVideo.ontimeupdate = () => {
            const progress = (mainVideo.currentTime / mainVideo.duration) * 100;
            const progressBar = document.getElementById('video-mini-progress');
            if (progressBar) progressBar.style.width = `${progress}%`;
        };
    }

    // 3. 启动预加载
    console.log("📦 开始预加载资源...");
    preloadAssets();

    // 4. 绑定复制功能
    if (copyBtn) {
        initCopyFunction(copyBtn);
    }
}

// ══════════════════════════════════
// 3. 核心预加载逻辑 (Blob 模式)
// ══════════════════════════════════
const assets = [
    { id: 'video1', url: './assets/header_banner_video_ver2.mp4', type: 'video' },
    { id: 'video2', url: './assets/ending-video-ver2.mp4', type: 'video' },
    { id: 'bgm', url: './assets/bgm.mp3', type: 'audio' }
];

const blobStorage = {};

async function preloadAssets() {
    const total = assets.length;
    let loadedCount = 0;

    try {
        const promises = assets.map(async (asset) => {
            const response = await fetch(asset.url);
            if (!response.ok) throw new Error(`Network response was not ok: ${asset.url}`);
            
            // 使用更高级的读取器来追踪真实百分比
            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length');
            let receivedLength = 0;
            let chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                
                // 这里计算的是单文件的进度，我们可以累加到全局
                // 为了简单，我们先用已加载文件数来做大进度
                let fileProgress = (receivedLength / contentLength) / total;
                let overallProgress = Math.round(((loadedCount / total) + fileProgress) * 100);
                updateProgressUI(overallProgress);
            }

            const blob = new Blob(chunks);
            blobStorage[asset.id] = URL.createObjectURL(blob);
            loadedCount++;
        });

        await Promise.all(promises);
        console.log("✅ 所有资源加载完毕");
        onPreloadComplete();
    } catch (e) {
        console.error("❌ 预加载过程中出错:", e);
        // 出错也要进页面，不然就卡死了
        onPreloadComplete();
    }
}

function updateProgressUI(percent) {
    const bar = document.getElementById('load-progress-bar');
    const text = document.getElementById('load-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.innerText = `正在缝制邀请函... ${percent}%`;
}

function onPreloadComplete() {
    const video = document.getElementById('main-video');
    if (video && blobStorage['video1']) {
        video.src = blobStorage['video1'];
    }

    // 执行进场动画
    gsap.to("#loading-overlay", { 
        opacity: 0, 
        duration: 0.8, 
        onComplete: () => {
            document.getElementById('loading-overlay').style.display = 'none';
            gsap.to("#app-wrapper", { autoAlpha: 1, duration: 1 });
        }
    });
}

function initCopyFunction(btn) {
    btn.addEventListener('click', function() {
        const text = "【黄啸宇 & 康越 婚礼邀请】时间：2026年5月1日 12:00；地点：北京香格里拉饭店；地址：海淀区中关村南大街33号。";
        navigator.clipboard.writeText(text).then(() => {
            const originText = btn.innerText;
            btn.innerText = "✅ 已复制";
            setTimeout(() => btn.innerText = originText, 2000);
        });
    });
}
// ══════════════════════════════════
// URL PARAMS — Guest Name
// ══════════════════════════════════
(function() {
  try {
    const params = new URLSearchParams(window.location.search);
    const toName = params.get('to');
    if (toName) {
      document.getElementById('guest-name').textContent = toName;
    }
  } catch(e) {}
})();

// ══════════════════════════════════
// FLOATING PETALS
// ══════════════════════════════════
(function createPetals() {
  const container = document.getElementById('petals-container');
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.left  = Math.random() * 100 + '%';
    p.style.top   = Math.random() * 100 + '%';
    container.appendChild(p);

    gsap.set(p, { x: 0, y: 0, rotation: Math.random() * 360, opacity: 0 });
    gsap.to(p, {
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      rotation: '+=' + (Math.random() * 360),
      opacity: Math.random() * 0.4 + 0.1,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }
})();

// ══════════════════════════════════
// LOADING ANIMATION
// ══════════════════════════════════
(function runLoading() {
  const tl = gsap.timeline({ onComplete: hideLoading });

  tl.to('#logo-mono',  { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.3)
    .to('#logo-div',   { width: 80, duration: 0.6, ease: 'power2.out' }, 0.7)
    .to('#logo-names', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.0)
    .to('#loading-bar',{ width: '100%', duration: 1.2, ease: 'power2.inOut' }, 1.2)
    .to('#loading',    { opacity: 0, duration: 0.6, ease: 'power2.in' }, 2.8);

  function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    initFadeObserver();
    // Trigger fade-up for envelope section items
    document.querySelectorAll('#envelope-section .fade-up').forEach(el => {
      el.classList.add('visible');
    });
  }
})();

// ══════════════════════════════════
// ENVELOPE OPEN ANIMATION
// ══════════════════════════════════
let envelopeOpened = false;

function openEnvelope() {
  if (envelopeOpened) return;
  envelopeOpened = true;

  const flap    = document.getElementById('env-flap');
  const wrapper = document.getElementById('envelope-wrapper');
  const content = document.getElementById('content');
  const hint    = document.querySelector('.env-hint');

  const tl = gsap.timeline();

  // 1. Slight envelope lift
  tl.to('#envelope', {
    y: -12, scale: 1.03,
    duration: 0.3, ease: 'power2.out'
  })
  // 2. Flap opens (rotateX 0 → -180 — flip up)
  .to(flap, {
    rotationX: -180,
    duration: 0.7, ease: 'power2.inOut',
    transformOrigin: 'top center'
  })
  // 3. Shake the envelope
  .to('#envelope', {
    x: 8, duration: 0.06, ease: 'power2.inOut', yoyo: true, repeat: 5
  })
  // 4. Envelope scale out and fade
  .to(wrapper, {
    scale: 0.85, opacity: 0,
    duration: 0.4, ease: 'power2.in'
  }, '+=0.2')
  .to(hint, {
    opacity: 0, duration: 0.3
  }, '<')
  // 5. Show content
  .call(function() {
    content.style.display = 'block';
    gsap.set(content, { opacity: 0, y: 40 });
  })
  .to(content, {
    opacity: 1, y: 0,
    duration: 0.5, ease: 'power2.out'
  })
  // 6. Smooth scroll down to #cover
  .call(function() {
    gsap.to(window, {
      scrollTo: { y: '#cover', offsetY: 0 },
      duration: 1.2, ease: 'power2.inOut'
    });
    document.getElementById('scroll-hint').style.display = 'none';
  });
}

// Touch event (no 300ms delay on mobile)
const envWrapper = document.getElementById('envelope-wrapper');
let touchMoved = false;
envWrapper.addEventListener('touchstart', function(e) {
  touchMoved = false;
}, { passive: true });
envWrapper.addEventListener('touchmove', function() {
  touchMoved = true;
}, { passive: true });
envWrapper.addEventListener('touchend', function(e) {
  if (!touchMoved) {
    e.preventDefault();
    openEnvelope();
  }
}, { passive: false });
envWrapper.addEventListener('click', openEnvelope);

// ══════════════════════════════════
// FADE-UP OBSERVER
// ══════════════════════════════════
function initFadeObserver() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-up').forEach(function(el) {
    obs.observe(el);
  });
}

// ══════════════════════════════════
// MAP — 高德地图 URL Scheme
// ══════════════════════════════════
function openMap() {
  // 替换为真实经纬度和酒店名
  var lat  = 39.9912;   // 纬度 latitude
  var lng  = 116.3095;  // 经度 longitude
  var name = encodeURIComponent('北京香格里拉饭店');

  // 高德地图
  var amapUrl = 'https://uri.amap.com/marker?position=' + lng + ',' + lat
              + '&name=' + name
              + '&src=wedding-invitation&coordinate=gaode&callnative=1';

  // 腾讯地图 fallback
  var qqmapUrl = 'https://apis.map.qq.com/uri/v1/marker?marker=coord:'
               + lat + ',' + lng + ';title:' + name
               + '&referer=wedding-invitation';

  // 判断环境
  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('micromessenger') > -1) {
    // 微信内用高德
    window.location.href = amapUrl;
  } else if (/iphone|ipad|ipod/.test(ua)) {
    window.location.href = amapUrl;
  } else {
    window.location.href = amapUrl;
  }
}

// ══════════════════════════════════
// MUSIC — WeChat + General
// ══════════════════════════════════
var bgm      = document.getElementById('bgm');
var musicBtn = document.getElementById('music-btn');
var isPlaying = false;

function tryPlayMusic() {
  var playPromise = bgm.play();
  if (playPromise !== undefined) {
    playPromise.then(function() {
      isPlaying = true;
      musicBtn.classList.add('playing');
    }).catch(function() {
      isPlaying = false;
    });
  }
}

function toggleMusic() {
  if (isPlaying) {
    bgm.pause();
    isPlaying = false;
    musicBtn.classList.remove('playing');
  } else {
    tryPlayMusic();
  }
}

// WeChat auto-play
if (typeof WeixinJSBridge === 'undefined') {
  document.addEventListener('WeixinJSBridgeReady', function() {
    tryPlayMusic();
  }, false);
} else {
  tryPlayMusic();
}

// General auto-play attempt (after user interaction)
document.addEventListener('touchstart', function autoplay() {
  if (!isPlaying) tryPlayMusic();
  document.removeEventListener('touchstart', autoplay);
}, { once: true, passive: true });

document.addEventListener('click', function autoplayClick() {
  if (!isPlaying) tryPlayMusic();
  document.removeEventListener('click', autoplayClick);
}, { once: true });

// ══════════════════════════════════
// PREVENT ZOOM — double-tap & pinch
// ══════════════════════════════════
var lastTouch = 0;
document.addEventListener('touchend', function(e) {
  var now = Date.now();
  if (now - lastTouch < 300) {
    e.preventDefault();
  }
  lastTouch = now;
}, { passive: false });

document.addEventListener('gesturestart', function(e) {
  e.preventDefault();
}, { passive: false });
