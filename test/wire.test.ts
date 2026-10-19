/** 接线测试：/eye 命令分支 + 3 工具存在性；win 下真跑一次截屏（写到临时目录）。 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';

import { apply } from '../src/plugin.ts';

const dataDir = mkdtempSync(join(tmpdir(), 'eye-wire-'));
after(() => rmSync(dataDir, { recursive: true, force: true }));

interface Command { name: string; handler: (args: { rawInput?: string }) => Promise<{ kind: string; text: string }> | { kind: string; text: string } }
interface Tool { name: string; execute: (args?: Record<string, unknown>) => Promise<string> }

const commands: Command[] = [];
const tools: Tool[] = [];
const ctx = {
  logger: () => ({ info() {}, warn() {} }),
  commands: { register(definition: never) { commands.push(definition as never); } },
  tools: { register(definition: never) { tools.push(definition as never); } },
} as never;
apply(ctx, { enabled: true, dataDir, maxCaptures: 2, allowScreen: true, allowCamera: false, order: 780 });

const command = () => commands.find((entry) => entry.name === 'eye')!;

test('3 工具 + 1 命令装配', () => {
  for (const expected of ['eye_windows', 'eye_screenshot', 'eye_capture']) {
    assert.ok(tools.find((entry) => entry.name === expected), expected);
  }
  assert.ok(command());
});

test('/eye clear 清 captures', async () => {
  const out = await command().handler({ rawInput: 'clear' });
  assert.match(String(out.text), /清 0 张/);
});

test('/eye 默认返回清单（win 真跑；非 win 报限制说明）', async () => {
  const out = await command().handler({ rawInput: '' });
  if (process.platform === 'win32') assert.match(String(out.text), /前台：/);
  else assert.match(String(out.text), /Windows/);
});

test('eye_capture stub：默认禁用提示', async () => {
  const capture = tools.find((entry) => entry.name === 'eye_capture')!;
  assert.match(await capture.execute({}), /默认禁用/);
});

if (process.platform === 'win32') {
  test('eye_screenshot：真实生成 PNG 并轮转（max=2）', async () => {
    const shot = tools.find((entry) => entry.name === 'eye_screenshot')!;
    const first = await shot.execute({});
    assert.match(first, /截图已存：.*\.png/);
    const second = await shot.execute({});
    assert.match(second, /\.png/);
    const captures = readdirSync(join(dataDir, 'captures'));
    assert.ok(captures.length <= 2, `轮转最多 2 张，实际 ${captures.length}`);
    assert.equal(justPath(first).length > 10, true);
  });
}

function justPath(text: string): string {
  return text.split('\n')[0] ?? '';
}
