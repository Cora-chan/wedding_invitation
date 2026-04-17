// ══════════════════════════════════
// 0. 全局状态与监控
// ══════════════════════════════════
const DEBUG_PREFIX = "[Wedding-H5]";
console.log(`${DEBUG_PREFIX} 脚本初始化开始...`);

// 资源配置
const mandatoryAssets = [
    { id: 'bgm', url: './assets/bgm.wav', type: 'audio' },
    { id: 'video1', url: './assets/header_banner_video_ver2.mp4', type: 'video' },
    { id: 'video2', url: './assets/ending-video-ver2.mp4', type: 'video' }
];

const blobStorage = {};
const progressTracking = {};
mandatoryAssets.forEach(a => progressTracking[a.id] = 0);

document.addEventListener('DOMContentLoaded', () => {
    console.log(`${DEBUG_PREFIX} DOM 已就绪，启动核心逻辑`);
    startOptimizedPreload();
});

// ══════════════════════════════════
// 1. 深度预加载逻辑 (核心优化)
// ══════════════════════════════════
async function startOptimizedPreload() {
    console.time(`${DEBUG_PREFIX} 总预加载耗时`);
    console.log(`${DEBUG_PREFIX} 阶段 1: 开始并行下载必要资源...`, mandatoryAssets.map(a => a.id));

    try {
        // 并行下载必要资源
        const mandatoryPromises = mandatoryAssets.map(asset => fetchWithProgress(asset));
        await Promise.all(mandatoryPromises);
        console.log(`${DEBUG_PREFIX} 阶段 1 完成: 所有核心文件已下载至内存 (Blob)`);

        // 阶段 2: 视频解码预热
        console.log(`${DEBUG_PREFIX} 阶段 2: 启动视频解码预热 (Prime)...`);
        await primeMainVideo();

        // 阶段 3: 进入应用
        console.log(`${DEBUG_PREFIX} 阶段 3: 预加载流程全部完成，准备进入开启页`);
        console.timeEnd(`${DEBUG_PREFIX} 总预加载耗时`);
        onPreloadComplete();

    } catch (err) {
        console.error(`${DEBUG_PREFIX} 预加载流程崩溃:`, err);
        onPreloadComplete(); // 强制进入，防止用户卡死
    }
}

// 带有真实字节监控的下载函数
async function fetchWithProgress(asset, isBackground = false) {
    const logTag = isBackground ? "[Background]" : "[Mandatory]";
    console.log(`${DEBUG_PREFIX}${logTag} 开始请求: ${asset.id}`);

    try {
        // 核心修改：添加 cache: 'no-cache' 或 'no-store' 
        // 这样可以绕过浏览器的磁盘缓存尝试，直接获取数据流
        const response = await fetch(asset.url, {
            cache: 'no-cache', 
            mode: 'cors'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length') || 0;
        
        if (contentLength === 0) {
            console.warn(`${DEBUG_PREFIX}${logTag} 警告: ${asset.id} 未返回 Content-Length`);
        }

        let receivedLength = 0;
        let chunks = [];
        
        while(true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            
            if (!isBackground && contentLength > 0) {
                progressTracking[asset.id] = (receivedLength / contentLength) * 100;
                updateGlobalProgressUI();
            }
        }

        const blob = new Blob(chunks);
        blobStorage[asset.id] = URL.createObjectURL(blob);
        console.log(`${DEBUG_PREFIX}${logTag} 下载并转为 Blob 成功: ${asset.id}`);
        
        if (!isBackground) {
            progressTracking[asset.id] = 100;
            updateGlobalProgressUI();
        }
    } catch (e) {
        console.error(`${DEBUG_PREFIX}${logTag} 加载失败: ${asset.id}`, e);
        // 如果 fetch 彻底失败，尝试直接赋值 src 作为 fallback
        if (!isBackground) {
            console.log(`${DEBUG_PREFIX}${logTag} 尝试 Fallback 模式`);
            blobStorage[asset.id] = asset.url; 
            progressTracking[asset.id] = 100;
            updateGlobalProgressUI();
        }
    }
}

// 视频解码预热函数
function primeMainVideo() {
    return new Promise((resolve) => {
        const v = document.getElementById('main-video');
        if (!v || !blobStorage['video1']) {
            console.warn(`${DEBUG_PREFIX}[Video] 未找到 video 标签或 Blob，跳过预热`);
            return resolve();
        }

        console.time(`${DEBUG_PREFIX}[Video] 解码预热耗时`);
        
        v.oncanplaythrough = () => {
            console.log(`${DEBUG_PREFIX}[Video] canplaythrough 触发：解码器已就绪`);
            console.timeEnd(`${DEBUG_PREFIX}[Video] 解码预热耗时`);
            v.oncanplaythrough = null;
            resolve();
        };

        v.onerror = (e) => {
            console.error(`${DEBUG_PREFIX}[Video] 视频预热出错:`, e);
            resolve();
        };

        // 关键：在这里将 Blob 注入，并强迫浏览器读取首帧
        v.src = blobStorage['video1'];
        v.load(); 
        
        // 微信兜底：防止某些环境不触发 canplaythrough
        setTimeout(() => {
            console.log(`${DEBUG_PREFIX}[Video] 预热超时兜底触发`);
            resolve();
        }, 4000);
    });
}

// ══════════════════════════════════
// 2. UI 状态管理
// ══════════════════════════════════
function updateGlobalProgressUI() {
    const values = Object.values(progressTracking);
    const avgProgress = values.reduce((a, b) => a + b, 0) / values.length;
    
    // 进度条只跑到 95%，最后 5% 留给解码完成后的平滑过渡
    const visualProgress = Math.min(avgProgress * 0.95, 95);

    const progressBar = document.getElementById('loading-bar');
    if (progressBar) {
        gsap.to(progressBar, { width: `${visualProgress}%`, duration: 0.2, ease: "none" });
    }
    
    const loadText = document.getElementById('load-text');
    if (loadText) {
        loadText.innerText = `正在缝制邀请函... ${Math.round(visualProgress)}%`;
    }
}

function onPreloadComplete() {
    console.log(`${DEBUG_PREFIX}[UI] 准备移除 Loading 遮罩`);
    
    gsap.to('#loading-bar', { width: '100%', duration: 0.3 });
    gsap.to("#loading", { 
        opacity: 0, 
        duration: 0.8, 
        delay: 0.4, 
    });
}


function initCopyFunction() {
    const btn = document.getElementById('btn-copy-info');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const text = "【黄啸宇 & 康越 婚礼邀请】时间：2026年9月5日 18:00；地点：上海苏词蟹宴；地址：上海市黄浦区外滩中山东一路外滩18号4楼。";
        console.log(`${DEBUG_PREFIX}[Event] 触发复制功能`);
        navigator.clipboard.writeText(text).then(() => {
            const old = btn.innerText;
            btn.innerText = "✅ 已复制";
            setTimeout(() => btn.innerText = old, 2000);
        });
    });
}

function initCopyFunction(btn) {
    btn.addEventListener('click', function() {
        const text = "【黄啸宇 & 康越 婚礼邀请】时间：2026年9月5日 18:00；地点：上海苏词蟹宴；地址：上海市黄浦区外滩中山东一路外滩18号4楼。";
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
const LNG =  121.48964372611456, LAT = 31.238456340956624;
  var lng = LNG;
  var lat = LAT;
  var name = encodeURIComponent('上海外滩18号');

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
