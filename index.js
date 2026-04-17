// ══════════════════════════════════
// 1. 资源配置与权重
// ══════════════════════════════════
const mandatoryAssets = [
    { id: 'bgm', url: './assets/bgm.mp3', type: 'audio' },
    { id: 'video1', url: './assets/header_banner_video_ver2.mp4', type: 'video' }
];

const backgroundAssets = [
    { id: 'video2', url: './assets/ending-video-ver2.mp4', type: 'video' }
];

const blobStorage = {};
const progressTracking = {};

async function startOptimizedPreload() {
    console.log("📦 启动深度预加载...");
    
    // 初始化进度追踪
    mandatoryAssets.forEach(a => progressTracking[a.id] = 0);

    // 并行下载必要资源
    const mandatoryPromises = mandatoryAssets.map(asset => fetchWithProgress(asset));

    // 等待所有必要文件下载完成
    await Promise.all(mandatoryPromises);
    
    // --- 关键步骤：视频解码预热 ---
    console.log("🎬 正在同步解码器...");
    await primeMainVideo();
    
    // 全部就绪，进入页面
    onPreloadComplete();

    // 后台加载次要资源
    backgroundAssets.forEach(asset => fetchWithProgress(asset, true));
}

// 带有进度反馈的下载函数
async function fetchWithProgress(asset, isBackground = false) {
    try {
        const response = await fetch(asset.url);
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        
        let receivedLength = 0;
        let chunks = [];
        
        while(true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            
            if (!isBackground && contentLength > 0) {
                progressTracking[asset.id] = (receivedLength / contentLength) * 100;
                updateGlobalProgress();
            }
        }

        const blob = new Blob(chunks);
        blobStorage[asset.id] = URL.createObjectURL(blob);
        
        if (!isBackground) {
            progressTracking[asset.id] = 100;
            updateGlobalProgress();
        }
    } catch (e) {
        console.error(`资源加载失败: ${asset.url}`, e);
        if (!isBackground) progressTracking[asset.id] = 100; 
    }
}

// 视频解码预热：确保视频首帧已加载并可播放
function primeMainVideo() {
    return new Promise((resolve) => {
        const v = document.getElementById('main-video');
        if (!v || !blobStorage['video1']) return resolve();

        v.oncanplaythrough = () => {
            console.log("✅ 视频解码就绪，可以秒开");
            v.oncanplaythrough = null;
            resolve();
        };

        // 提前赋值 src，让浏览器开始解码
        v.src = blobStorage['video1'];
        v.load(); // 强制触发加载
        
        // 兜底方案：如果 3 秒后还没触发 canplaythrough（某些机型限制），也直接进入
        setTimeout(resolve, 3000);
    });
}

function updateGlobalProgress() {
    const values = Object.values(progressTracking);
    // 进度条只计算必要资源 (BGM + Video1)
    // 假设下载占 90% 权重，最后 10% 留给解码预热（模拟效果）
    const downloadProgress = values.reduce((a, b) => a + b, 0) / values.length;
    const finalProgress = Math.min(downloadProgress * 0.95, 95); 

    const progressBar = document.getElementById('loading-bar');
    if (progressBar) {
        gsap.to(progressBar, { width: `${finalProgress}%`, duration: 0.2 });
    }
}

function onPreloadComplete() {
    // 进度条强行补满
    gsap.to('#loading-bar', { width: '100%', duration: 0.2, onComplete: () => {
        gsap.to("#loading", { opacity: 0, duration: 0.6, delay: 0.3, onComplete: () => {
            document.getElementById('loading').style.display = 'none';
            // 启动后续逻辑
            initEnvelopeEvents();
            initPetals();
        }});
    }});
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
