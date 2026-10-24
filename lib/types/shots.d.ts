/**
 * 截屏落盘 + 轮转：PowerShell System.Drawing 抓全屏 → PNG，返回路径。
 * captures 目录轮转保留最近 maxCaptures 张；路径不进日志摘要。
 */
export declare class Shots {
    readonly dir: string;
    readonly maxCaptures: number;
    constructor(dataDir: string | undefined, maxCaptures: number);
    /** 截屏（主屏）。非 Windows 或截屏失败返回错误说明。 */
    capture(): Promise<{
        path?: string;
        bytes?: number;
        error?: string;
    }>;
    /** 轮转：删除最旧的，保留最近 maxCaptures 张。 */
    rotate(): {
        removed: number;
    };
    clear(): number;
    latest(): string | undefined;
}
//# sourceMappingURL=shots.d.ts.map