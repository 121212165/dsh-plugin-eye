/**
 * 窗口清单解析器（纯函数）：Windows 端输出 TSV 行 `pid\tactive\ttitle`，
 * 解析为结构化窗口列表并保持前台第一位。
 */
export function parseWindowList(text) {
    const rows = [];
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
        if (!line.trim())
            continue;
        const [pidRaw, activeRaw, ...titleParts] = line.split('\t');
        const pid = Number(pidRaw);
        const title = (titleParts.join('\t') ?? '').trim();
        if (!Number.isInteger(pid) || pid <= 0 || !title)
            continue;
        const key = `${pid}:${title}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        rows.push({ pid, active: activeRaw === '1', title: title.slice(0, 120) });
    }
    if (rows.length > 1) {
        const activeIndex = rows.findIndex((row) => row.active);
        if (activeIndex > 0) {
            const [active] = rows.splice(activeIndex, 1);
            rows.unshift(active);
        }
    }
    return rows;
}
export function renderWindowList(rows) {
    if (!rows.length)
        return 'eye 没有看到任何窗口（可能是桌面无窗口或权限受限）。';
    const active = rows.find((row) => row.active);
    const rest = rows.filter((row) => !row.active);
    const line = (row) => `  [${row.pid}] ${row.active ? '▶ ' : ''}${row.title}`;
    return [
        `前台：${active ? active.title : '未识别'}`,
        `其余窗口 ${rest.length} 个：`,
        ...rows.map(line),
    ].join('\n');
}
//# sourceMappingURL=windows.js.map