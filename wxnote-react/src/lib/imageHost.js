/**
 * 图床上传管线
 *
 * 统一流程：压缩 -> 按配置上传 -> 返回可访问链接；任一步失败由调用方降级为本地内嵌。
 * 各家图床接口实测结论见仓库 docs/image-hosting.md。
 */

export const BEEIMG_ENDPOINT = 'https://www.beeimg.cn/api/v2/upload';
export const HDR_ENDPOINT = 'https://www.hd-r.cn/api/upfile';
export const TELEGRAPH_ENDPOINT = 'https://telegra.ph/upload';
export const MAX_FILE_SIZE = 15 * 1024 * 1024;

export function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(',');
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(parts[1] || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** 压缩到长边 1600px，优先 WebP，不支持时退回 JPEG */
export function compressImage(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (Math.max(w, h) > maxSide) {
        const ratio = maxSide / Math.max(w, h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      let dataUrl = canvas.toDataURL('image/webp', quality);
      if (dataUrl.indexOf('data:image/webp') !== 0) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
      URL.revokeObjectURL(url);
      resolve({ dataUrl, width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解析失败'));
    };
    img.src = url;
  });
}

/** 兼容 PicGo / 兰空 / Chevereto / SM.MS 等常见返回结构 */
export function pickLink(json, path) {
  if (!json) return '';
  if (typeof json === 'string') return json;

  if (path) {
    const v = path.split('.').reduce((acc, key) => {
      if (acc == null) return undefined;
      const m = key.match(/^(\w*)\[(\d+)\]$/);
      if (m) {
        const base = m[1] ? acc[m[1]] : acc;
        return base ? base[Number(m[2])] : undefined;
      }
      return acc[key];
    }, json);
    if (typeof v === 'string' && v) return v;
  }

  const candidates = [
    json.link,
    json.url,
    json.data_url,
    json.image,
    json.imgurl,
    json.data && json.data.url,
    json.data && json.data.link,
    json.data && json.data.image,
    json.data && json.data.public_url,
    Array.isArray(json.data) && json.data[0] && (json.data[0].url || json.data[0].src),
    Array.isArray(json) && json[0] && json[0].src,
    json.data && json.data.data && json.data.data.url
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
  }
  return '';
}

function absolutize(link, endpoint) {
  if (link.indexOf('//') === 0 || link.indexOf(':') >= 0) return link;
  try {
    return new URL(link, endpoint).href;
  } catch (e) {
    return link;
  }
}

/** 通用接口：POST multipart 字段 file，可选 Bearer Token */
export function uploadViaEndpoint(endpoint, blob, filename, token, path) {
  const fd = new FormData();
  fd.append('file', blob, filename);
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;

  return fetch(endpoint, { method: 'POST', body: fd, headers })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then((text) => {
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        const t = text.trim();
        if (/^https?:\/\/\S+$/.test(t)) return t;
        throw new Error('图床返回非 JSON');
      }
      const link = pickLink(json, path);
      if (!link) throw new Error('未识别到图片链接');
      return absolutize(link, endpoint);
    });
}

/** 蜜蜂图床：file + storage_id，返回 data.public_url */
export function uploadToBeeimg(blob, filename, token, storageId) {
  const fd = new FormData();
  fd.append('file', blob, filename);
  fd.append('storage_id', String(storageId || 4));
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

  return fetch(BEEIMG_ENDPOINT, { method: 'POST', body: fd, headers })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((j) => {
      if (!j) throw new Error('图床无返回');
      if (j.status === 'error') throw new Error(j.message || '上传失败');
      const url = (j.data && (j.data.public_url || j.data.url)) || '';
      if (!url) throw new Error('未返回图片地址');
      return url;
    });
}

export function uploadToTelegraph(blob, filename) {
  const fd = new FormData();
  fd.append('file', blob, filename);
  return fetch(TELEGRAPH_ENDPOINT, { method: 'POST', body: fd })
    .then((r) => r.json())
    .then((res) => {
      if (res && res[0] && res[0].src) return 'https://telegra.ph' + res[0].src;
      throw new Error((res && res.error) || '图床返回异常');
    });
}

/**
 * 按配置上传单张图片。
 * @returns {Promise<string>} 可直接写进 Markdown 的图片地址（本地模式为 dataURL）
 */
export function uploadImage(file, cfg) {
  if (cfg.type === 'local') {
    return compressImage(file).then((r) => r.dataUrl);
  }

  const prepared = compressImage(file).then((r) => ({
    blob: dataUrlToBlob(r.dataUrl),
    name: (file.name || 'image').replace(/\.[^.]+$/, '') + '.webp'
  }));

  if (cfg.type === 'beeimg') {
    return prepared.then((c) => uploadToBeeimg(c.blob, c.name, cfg.beeimgToken, cfg.storage));
  }
  if (cfg.type === 'telegraph') {
    return prepared.then((c) => uploadToTelegraph(c.blob, c.name));
  }
  if (cfg.type === 'hdr') {
    if (!cfg.proxy) return Promise.reject(new Error('HD-R 未配置跨域代理'));
    const endpoint =
      cfg.proxy.indexOf('{url}') >= 0
        ? cfg.proxy.replace('{url}', encodeURIComponent(HDR_ENDPOINT))
        : cfg.proxy + HDR_ENDPOINT;
    return prepared.then((c) => uploadViaEndpoint(endpoint, c.blob, c.name, '', ''));
  }
  if (cfg.type === 'custom') {
    if (!cfg.url) return Promise.reject(new Error('未填写图床接口地址'));
    return prepared.then((c) => uploadViaEndpoint(cfg.url, c.blob, c.name, cfg.token, cfg.field));
  }
  return Promise.reject(new Error('未知图床类型'));
}
