/** Failed requests are evicted so Retry can load the same URL again. */
export function createImageLoader() {
  const cache = new Map();
  function request(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("Scene image could not be loaded."));
      image.src = src;
    });
  }
  return function loadImage(src, cached = true) {
    if (!cached) return request(src);
    if (!cache.has(src)) {
      const task = request(src);
      cache.set(src, task);
      task.catch(() => cache.delete(src));
    }
    return cache.get(src);
  };
}
