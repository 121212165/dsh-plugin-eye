/**
 * 截屏落盘 + 轮转：PowerShell System.Drawing 抓全屏 → PNG，返回路径。
 * captures 目录轮转保留最近 maxCaptures 张；路径不进日志摘要。
 */
import { statSync, unlinkSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseJsonPs, runPs, isWindows } from './ps.js';
export class Shots {
    dir;
    maxCaptures;
    constructor(dataDir, maxCaptures) {
        this.dir = dataDir?.startsWith('~')
            ? join(homedir(), dataDir.slice(1), 'captures')
            : dataDir
                ? join(dataDir, 'captures')
                : join(homedir(), '.dsh', 'eye', 'captures');
        this.maxCaptures = Math.max(1, maxCaptures);
    }
    /** 截屏（主屏）。非 Windows 或截屏失败返回错误说明。 */
    async capture() {
        if (!isWindows())
            return { error: '截屏仅支持 Windows（System.Drawing）。' };
        const ps = `
Add-Type -AssemblyName System.Windows.Forms ;
Add-Type -AssemblyName System.Drawing ;
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds ;
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height) ;
$g = [System.Drawing.Graphics]::FromImage($bmp) ;
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size) ;
$dir = '${this.dir.replace(/\\/g, '\\\\')}' ;
New-Item -ItemType Directory -Force -Path $dir | Out-Null ;
$file = Join-Path $dir ('cap-{0}.png' -f (Get-Date -Format 'yyyyMMdd-HHmmss-fff')) ;
$bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png) ;
$g.Dispose() ; $bmp.Dispose() ;
ConvertTo-Json -Compress @{ file = $file ; bytes = (Get-Item $file).Length } | Write-Output
`;
        const { value, error } = parseJsonPs(await runPs(ps, 30_000));
        if (!value || !value.file)
            return { error: error ?? '截屏失败（无输出）' };
        const info = statSync(value.file);
        this.rotate();
        return { path: value.file, bytes: info.size };
    }
    /** 轮转：删除最旧的，保留最近 maxCaptures 张。 */
    rotate() {
        let removed = 0;
        let entries = [];
        try {
            entries = readdirSync(this.dir)
                .filter((name) => /^cap-\d{8}-\d{6}-\d{3}\.png$/.test(name))
                .map((name) => {
                const full = join(this.dir, name);
                return { path: full, mtime: statSync(full).mtimeMs };
            })
                .sort((a, b) => b.mtime - a.mtime);
        }
        catch {
            return { removed: 0 };
        }
        for (const entry of entries.slice(this.maxCaptures)) {
            try {
                unlinkSync(entry.path);
                removed++;
            }
            catch {
                // 占用中：下次再删
            }
        }
        return { removed };
    }
    clear() {
        let removed = 0;
        try {
            for (const name of readdirSync(this.dir).filter((name) => /\.png$/.test(name))) {
                try {
                    unlinkSync(join(this.dir, name));
                    removed++;
                }
                catch {
                    // 忽略占用
                }
            }
        }
        catch {
            // 目录不存在：无事
        }
        return removed;
    }
    latest() {
        try {
            const files = readdirSync(this.dir).filter((name) => /\.png$/.test(name)).sort();
            return files.length ? join(this.dir, files[files.length - 1]) : undefined;
        }
        catch {
            return undefined;
        }
    }
}
//# sourceMappingURL=shots.js.map