// GoatCounter 配置。site code 本身会出现在页面 HTML 里，不是秘密。
const code = (import.meta.env.PUBLIC_GOATCOUNTER_CODE ?? 'sander').trim();
const hosts = (import.meta.env.PUBLIC_GOATCOUNTER_HOSTS ?? 'sander.cloudzyro.app,sander-i.github.io')
  .split(',')
  .map((host: string) => host.trim())
  .filter(Boolean);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 把站内路径归一化：去掉部署 base 前缀，保证主站与备用站同一篇文章得到同一个 key。 */
function normalizePath(pathname: string): string {
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname || '/';
}

export const analytics = {
  code,
  hosts,
  basePath,
  enabled: Boolean(code),
  normalizePath,
};
