/**
 * 本地内嵌图片的「显示折叠」
 *
 * 笔记内容里存的是完整 dataURL（很长），编辑器里只显示短标记：
 *   ![截图](data:image/webp;base64,AAAA...)  ->  ![截图](editor-local://local1)
 * 这样 Markdown 结构不会被几千字符冲乱，同时预览/发布仍能用真实图片。
 */

const LOCAL_SRC = /!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/g;
const LOCAL_TAG = /!\[([^\]]*)\]\(editor-local:\/\/([A-Za-z0-9_-]+)\)/g;

export function createLocalImageStore() {
  const byTag = new Map(); // tag  -> dataURL
  const byUrl = new Map(); // dataURL -> tag
  let seq = 0;

  return {
    /** 存储态 -> 编辑态 */
    toDisplay(md) {
      return String(md || '').replace(LOCAL_SRC, (m, alt, dataUrl) => {
        let tag = byUrl.get(dataUrl);
        if (!tag) {
          seq += 1;
          tag = 'local' + seq;
          byTag.set(tag, dataUrl);
          byUrl.set(dataUrl, tag);
        }
        return '![' + alt + '](editor-local://' + tag + ')';
      });
    },

    /** 编辑态 -> 存储态（未知 tag 原样保留，绝不静默删内容） */
    toReal(md) {
      return String(md || '').replace(LOCAL_TAG, (m, alt, tag) => {
        const dataUrl = byTag.get(tag);
        return dataUrl ? '![' + alt + '](' + dataUrl + ')' : m;
      });
    },

    /** 已登记的本地图片数量 */
    size() {
      return byTag.size;
    }
  };
}

/** 全局单例：同一篇笔记在切换、重载时能复用已有 tag */
export const localImages = createLocalImageStore();
