/**
 * 窗口清单解析器（纯函数）：Windows 端输出 TSV 行 `pid\tactive\ttitle`，
 * 解析为结构化窗口列表并保持前台第一位。
 */
export interface WinRow {
    pid: number;
    title: string;
    active: boolean;
}
export declare function parseWindowList(text: string): WinRow[];
export declare function renderWindowList(rows: WinRow[]): string;
//# sourceMappingURL=windows.d.ts.map