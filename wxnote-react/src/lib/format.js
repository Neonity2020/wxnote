/** 时间显示：今天只显示时分，其他显示日期 */
export function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const pad = (n) => (n < 10 ? '0' : '') + n;
  if (d.toDateString() === now.toDateString()) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
