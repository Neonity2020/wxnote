# 图床接入与实测记录

图片外链这件事上，"免费"和"浏览器能直传"往往不能同时成立。下面是 2026-10 实际打接口测出来的结论，供选型和接入参考。

## 结论速览

| 图床 | 免登录上传 | 浏览器可读返回（CORS） | 长期保存 | 结论 |
|---|---|---|---|---|
| **蜜蜂图床 beeimg.cn** | ✅ | ✅ 开放 | 游客 1 小时 / 会员永久 | **默认方案** |
| 本地压缩内嵌 | — | — | 存在浏览器本地 | 零配置兜底 |
| 自定义接口（PicGo/兰空/OSS…） | 取决于你的图床 | 取决于你的图床 | ✅ | 长期首选 |
| HD-R hd-r.cn | ✅ | ❌ 无 ACAO | ✅ | 需跨域代理 |
| Telegraph | ✅ | ✅ | ✅ | 海外，国内不稳 |
| PICUI | ❌ 403 / 已下线 | — | — | 不可用 |
| SM.MS | — | — | — | 测试环境不可达 |

关键点：**国内免登录图床大多能收图，但不给跨域头**——服务端 curl 能成功，浏览器 `fetch` 却读不到返回值，等于用不了。选图床时先看 `Access-Control-Allow-Origin`。

## 蜜蜂图床（默认）

### 接口

```
POST https://www.beeimg.cn/api/v2/upload
Content-Type: multipart/form-data

file        <二进制>   必填
storage_id  4          必填，4 = 游客通道（1/2/3 返回「不存在的储存驱动」）
Authorization: Bearer <API令牌>   可选，填了走会员通道
```

### 成功返回

```json
{
  "status": "success",
  "message": "successful",
  "data": {
    "id": 204557,
    "filename": "test_px.png",
    "pathname": "6ad95d0293dda.png",
    "mimetype": "image/png",
    "width": 4,
    "height": 4,
    "is_public": false,
    "public_url": "https://beeimg.us.ci/temp/6ad95d0293dda.png"
  }
}
```

取 `data.public_url` 即可，实测该地址返回 `200 image/webp`，可直接用于 `<img>` 和公众号。

### 失败返回（注意 HTTP 状态码是 200）

```json
{ "status": "error", "message": "一分钟内你只能上传 1 张图片" }
```

所以客户端不能只看 `response.ok`，必须判断 `status === "error"` 并把 `message` 透出给用户，否则会显示成"上传成功但没图"。

### 跨域

```
OPTIONS /api/v2/upload          → 204
access-control-allow-origin:    <回显请求 Origin>
access-control-allow-credentials: true
access-control-allow-methods:   POST
```

POST 响应同样带 `Access-Control-Allow-Origin`，浏览器可以读到 JSON。

### 限制（服务端策略，非本项目可控）

- **游客图片仅保存 1 小时**（站点公告原文），到点外链失效
- **每 IP 每分钟 1 张**，连贴多张时后续会报限流
- 注册后在「个人中心 → API令牌」生成 Token 填入即可解除上述限制

### 在项目里怎么配

打开右上角「图床」→ 选「蜜蜂图床」：

- 不填 Token：游客通道，上传成功会提示「游客图 1 小时后失效」
- 填 Token：`Authorization: Bearer <token>`，永久保存
- `storage_id` 默认 4，账号通道若不同可自行改

## 自定义接口

「兼容 PicGo / 兰空 / Chevereto / 七牛中转」的意思是：只要满足下面三点就能直接接：

1. `POST multipart/form-data`，文件字段名 `file`
2. 可选的 `Authorization: Bearer <token>`
3. 返回 JSON 里带图片链接

链接提取由 `pickLink()` 负责，支持这些结构，无需配置：

```
{ "url": "..." }              { "link": "..." }
{ "data": { "url": "..." } }  { "data": [ { "url": "..." } ] }
[ { "src": "..." } ]          纯文本 URL
```

返回嵌套很深时可填「返回字段路径」，如 `data.image_url`、`result[0].src`。若返回相对路径（`/files/a.png`），会自动按接口域名补全。

## HD-R（需代理）

```
POST https://www.hd-r.cn/api/upfile     →  { "code": 200, "link": "https://i.hd-r.cn/xxx.png" }
```

本身可匿名上传、国内速度快，但响应**不带任何 CORS 头**，`OPTIONS` 直接 404，浏览器直传必失败。项目里保留这个选项是为了让有代理的人能用：填一个 `https://你的代理/?url={url}` 前缀，请求会先打到代理再转发。

## Telegraph

```
POST https://telegra.ph/upload   →  [ { "src": "/file/xxx.jpg" } ]
```

免鉴权、跨域开放，但域名在国内不稳定，仅作备用；返回的是相对路径，需要拼上 `https://telegra.ph`。

## 新增一个图床要改哪里

1. `DEFAULT_HOST` 加该图床需要的字段（如 `token`、`storage`）
2. 设置面板加一个 `<input type="radio" name="hostType" value="xxx">` 与对应字段组
3. `uploadImage()` 里加一个分支，返回 `Promise<图片URL>`
4. 若返回结构特殊，优先复用 `uploadViaEndpoint()` + `pickLink()`

失败一律 `reject(new Error('可读的中文原因'))`，`handleImageFile()` 会把它拼进 toast，并降级为本地内嵌。

## 公众号对图片的处理

外链图片在粘贴进公众号后台时会被**自动转存**到微信自己的 CDN，此后与源图床脱钩。这意味着：

- 转存成功后，即使图床 1 小时后失效，文章里的图也不会丢
- 但转存不是 100% 成功，图片多时建议粘完**逐张检查**
- 本地内嵌（`data:` URL）的图无法被转存，必须手动重传——发布弹窗里会按数量提示
