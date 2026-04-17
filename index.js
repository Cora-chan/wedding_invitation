
// ══════════════════════════════════
// 0. 启动与安全检查
// ══════════════════════════════════
console.log("🚀 index.js 已连接，准备启动预加载...");

document.addEventListener('DOMContentLoaded', () => {
    // 将所有依赖 DOM 的逻辑包裹在这里
    initWeddingApp();
});

function initWeddingApp() {
    //gsap.registerPlugin(ScrollToPlugin);

    // 1. 初始化所有全局变量（带空检查）
    const mainVideo = document.getElementById('main-video');
    const bgm = document.getElementById('bgm');
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
    { id: 'bgm', url: './assets/bgm.wav', type: 'audio' }
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
                console.log(`⏳ 加载中: ${asset.id} - ${overallProgress}%`);
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
