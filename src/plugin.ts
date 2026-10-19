/**
 * dsh wiring for eye：eye_windows（窗口清单，只读）+ eye_screenshot（截屏给
 * agent 看）+ /eye 命令。摄像头 capture 一期 no-op stub，默认禁用。
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import type {} from '@deepseek-ai/dsh-commands';

import { runPs, isWindows } from './ps.ts';
import { parseWindowList, renderWindowList, type WinRow } from './windows.ts';
import { Shots } from './shots.ts';

export const name = 'eye';
export const inject = ['commands', 'tools'];

export interface Config {
  enabled: boolean;
  dataDir?: string;
  maxCaptures: number;
  allowScreen: boolean;
  allowCamera: boolean;
  order: number;
}

export const Config = Schema.object({
  enabled: Schema.boolean().default(true),
  dataDir: Schema.string(),
  maxCaptures: Schema.natural().default(20),
  allowScreen: Schema.boolean().default(true),
  allowCamera: Schema.boolean().default(false),
  order: Schema.number().default(780),
});

const WINDOWS_PS = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinEnum {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder sb, int max);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  delegate bool EnumWindowsProc(IntPtr h, IntPtr lp);
  public static string[] List() {
    var fg = GetForegroundWindow();
    var lines = new System.Collections.Generic.List<string>();
    EnumWindows((h, lp) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512);
      GetWindowText(h, sb, 512);
      var title = sb.ToString();
      if (string.IsNullOrWhiteSpace(title)) return true;
      uint pid; GetWindowThreadProcessId(h, out pid);
      lines.Add(pid + "\\t" + (h == fg ? "1" : "0") + "\\t" + title);
      return true;
    }, IntPtr.Zero);
    return lines.ToArray();
  }
}
'@ ;
[WinEnum]::List() | Write-Output
`;

async function windowList(): Promise<{ rows: WinRow[]; error?: string }> {
  if (!isWindows()) return { rows: [], error: '窗口清单仅支持 Windows。' };
  const result = await runPs(WINDOWS_PS, 15_000);
  if (!result.ok) return { rows: [], error: result.stderr || 'powershell 非零退出' };
  return { rows: parseWindowList(result.stdout) };
}

export function apply(ctx: Context, config: Config): void {
  const log = ctx.logger(name);
  if (!config.enabled) return void log.info('disabled by config');
  if (config.maxCaptures < 1) throw new TypeError('eye: maxCaptures 必须 ≥ 1');
  const shots = new Shots(config.dataDir, config.maxCaptures);

  ctx.commands.register({
    name: 'eye',
    description: '电脑的眼睛：/eye 窗口清单 + 最新截图 | /eye shot 现截一张 | /eye clear 清 screenshots',
    input: { hint: '[shot|clear]' },
    handler: async ({ rawInput }) => {
      const verb = String(rawInput ?? '').trim().split(/\s+/)[0] ?? '';
      const { rows, error } = await windowList();
      if (error) return { kind: 'error', text: error };
      const list = renderWindowList(rows);
      if (verb === 'clear') return { kind: 'success', text: `[${name}] 已清 ${shots.clear()} 张截图。` };
      if (verb === 'shot') {
        if (!config.allowScreen) return { kind: 'error', text: 'config.allowScreen=false：截屏已关闭。' };
        const cap = await shots.capture();
        if (cap.error) return { kind: 'error', text: cap.error };
        return { kind: 'success', text: `${list}\n截图已存：${cap.path}（${Math.round((cap.bytes ?? 0) / 1024)} KB）` };
      }
      const latest = shots.latest();
      return { kind: 'success', text: `${list}\n最新截图：${latest ?? '（还没有，用 /eye shot 现截一张）'}` };
    },
  });

  ctx.tools.register(
    defineTool({
      name: 'eye_windows',
      description: '看一眼这台电脑此刻开了哪些窗口（pid/前台标记/标题）。判断用户在什么场景、找正在工作哪个文件前先用。',
      parameters: {},
      output: { schema: { type: 'string' } as const, render: (_args, value) => [{ type: 'text', text: value }] },
      presentCall: () => ({ card: 'generic' as const, title: '看窗口', kind: 'search' as const }),
      presentResult: (_args, value) => ({ card: 'generic' as const, title: String(value).split('\n')[0]!.slice(0, 60), kind: 'search' as const, rawInput: value }),
      async execute() {
        const { rows, error } = await windowList();
        if (error) return error;
        return renderWindowList(rows);
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: 'eye_screenshot',
      description: '全屏截一张 PNG 存到 ~/.dsh/eye/captures 并返回文件路径（可以引用本地图片查看）。截到的不只是窗口文字。看不懂窗口标题、或需要画面细节时用。',
      parameters: {},
      output: { schema: { type: 'string' } as const, render: (_args, value) => [{ type: 'text', text: value }] },
      presentCall: () => ({ card: 'generic' as const, title: '截屏', kind: 'edit' as const }),
      presentResult: (_args, value) => ({ card: 'generic' as const, title: String(value).split('\n')[0]!.slice(0, 60), kind: 'edit' as const, rawInput: value }),
      async execute() {
        if (!config.allowScreen) return 'allowScreen=false：截屏已禁用。';
        const cap = await shots.capture();
        if (cap.error) return cap.error;
        return `截图已存：${cap.path}（${Math.round((cap.bytes ?? 0) / 1024)} KB）——用引用本地文件的方式查看。`;
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: 'eye_capture',
      description: '（二期接口，当前默认禁用）摄像头抓一帧。allowCamera=false 时永远 no-op 提示。',
      parameters: {},
      output: { schema: { type: 'string' } as const, render: (_args, value) => [{ type: 'text', text: value }] },
      presentCall: () => ({ card: 'generic' as const, title: '摄像头', kind: 'edit' as const }),
      presentResult: (_args, value) => ({ card: 'generic' as const, title: String(value).split('\n')[0]!.slice(0, 40), kind: 'edit' as const, rawInput: value }),
      async execute() {
        if (!config.allowCamera) return '摄像头 capture 默认禁用（allowCamera=false）。启用后此工具才具备一期实现（外部二进制；装了才开）。';
        return '摄像头 capture 二期实现：当前 build 未内置。保持提示与安全红线一致。';
      },
    }),
  );

  log.info(`mounted · captures=${shots.dir} max=${config.maxCaptures} camera=${config.allowCamera ? 'on' : 'off'}`);
}
