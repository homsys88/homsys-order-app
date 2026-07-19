const CACHE_VERSION = 'v14-1';
const CACHE_NAME = `homsys-order-pwa-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/storage.js',
  '/style.css',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

/**
 * 앱 설치
 * 브라우저의 오래된 HTTP 캐시를 사용하지 않고
 * 서버에서 최신 파일을 다시 받아 저장합니다.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await Promise.all(
          APP_SHELL.map(async path => {
            try {
              const response = await fetch(path, {
                cache: 'reload'
              });

              if (response.ok) {
                await cache.put(path, response);
              }
            } catch (error) {
              console.warn('초기 캐시 실패:', path, error);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * 새 서비스워커 활성화
 * 이전 버전 캐시를 모두 삭제합니다.
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => (
              name.startsWith('homsys-order-pwa-') &&
              name !== CACHE_NAME
            ))
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * 페이지에서 즉시 업데이트 명령을 받을 수 있도록 합니다.
 */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames =>
        Promise.all(cacheNames.map(name => caches.delete(name)))
      )
    );
  }
});

/**
 * 네트워크 요청 처리
 */
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  /**
   * Supabase, Solapi 및 외부 API 요청은 캐시하지 않습니다.
   */
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/functions/v1/') ||
    url.hostname.includes('solapi') ||
    url.hostname.includes('kakao') ||
    url.origin !== self.location.origin
  ) {
    event.respondWith(fetch(request));
    return;
  }

  /**
   * 화면 이동은 네트워크 우선
   * 인터넷이 안 될 때만 저장된 index.html을 사용합니다.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async response => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/index.html', response.clone());
          }

          return response;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html');
          return cachedIndex || caches.match('/');
        })
    );

    return;
  }

  /**
   * manifest는 항상 최신 서버 파일을 우선 사용합니다.
   * 앱 이름과 아이콘 변경이 빨리 반영되도록 합니다.
   */
  if (
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/sw.js')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async response => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  /**
   * CSS, JS, 이미지 등 정적 파일:
   * 저장된 파일을 빠르게 보여주면서
   * 뒤에서는 최신 파일로 교체합니다.
   */
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const networkResponse = fetch(request, {
        cache: 'no-cache'
      })
        .then(async response => {
          if (
            response &&
            response.ok &&
            response.type !== 'opaque'
          ) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;
        })
        .catch(() => null);

      return cachedResponse || networkResponse;
    })
  );
});
