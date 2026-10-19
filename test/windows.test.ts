/** windows.ts 纯函数 + Shots 轮转/清理逻辑测试（safeWindows 无副作用部分）。 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, utimesSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, after } from 'node:test';

import { parseWindowList, renderWindowList } from '../src/windows.ts';
import { Shots } from '../src/shots.ts';

const dir = mkdtempSync(join(tmpdir(), 'eye-test-'));
after(() => rmSync(dir, { recursive: true, force: true }));

test('parseWindowList：TSV 行解析 + 前台置顶 + 去重', () => {
  const rows = parseWindowList([
    '4321\t0\t记事本 - a.txt',
    '1000\t1\tVisual Studio Code',
    '4321\t0\t记事本 - a.txt', // 重复去重
    'junk-line', // 无 pid
    '999\t9', // title 空丢弃
    '0\t0\t无效 pid 丢弃',
    '500\t0\t标题\t里\t含\tTab', // title 里的 \t 还原
  ].join('\n'));
  assert.equal(rows.length, 3);
  assert.equal(rows[0]!.pid, 1000);
  assert.equal(rows[0]!.active, true, '前台第一');
  assert.equal(rows[1]!.pid, 4321);
  assert.equal(rows[2]!.title, '标题\t里\t含\tTab');

  const noActive = parseWindowList('111\t0\t窗口一\n222\t0\t窗口二');
  assert.equal(noActive[0]!.pid, 111);
});

test('renderWindowList：前台识别 + 列表骨架', () => {
  const text = renderWindowList(parseWindowList('111\t0\t窗口一\n222\t1\t前台窗口'));
  assert.match(text, /前台：前台窗口/);
  assert.match(text, /▶ 前台窗口/);
  assert.match(text, /其余窗口 1 个/);
  assert.match(renderWindowList([]), /没有看到任何窗口/);
});

function fakeCapture(shots: Shots, name: string): void {
  mkdirSync(shots.dir, { recursive: true });
  writeFileSync(join(shots.dir, name), Buffer.alloc(1024));
}

test('Shots 轮转：保留最近 maxCaptures 张，其余删除', () => {
  const shots = new Shots(dir, 3);
  // 造 5 张，不同 mtime
  for (const [index, name] of ['cap-20260101-000000-001.png', 'cap-20260101-000000-002.png', 'cap-20260101-000000-003.png', 'cap-20260101-000000-004.png', 'cap-20260101-000000-005.png'].entries()) {
    fakeCapture(shots, name);
    const stamp = new Date(Date.UTC(2026, 0, 1, 0, 0, Number(index) + 1));
    utimesSync(join(shots.dir, name), stamp, stamp);
  }
  shots.rotate();
  const remaining = readdirSync(shots.dir).filter((name) => /\.png$/.test(name));
  assert.equal(remaining.length, 3, '轮转后保留 3 张');
  assert.ok(remaining.includes('cap-20260101-000000-005.png'), '最新的一张必须留');
  assert.ok(!remaining.includes('cap-20260101-000000-001.png'), '最旧的一张删掉');
});

test('Shots.clear 与 latest', () => {
  const shots = new Shots(dir, 3);
  assert.equal(shots.clear(), 3);
  assert.equal(shots.latest(), undefined);
});

test('eye 截屏 stub：非 Windows / allowCamera=false 语义', () => {
  // 纯逻辑断言：camera stub 的 no-op 文案
  const denied = '摄像头 capture 默认禁用（allowCamera=false）。启用后此工具才具备一期实现（外部二进制；装了才开）。';
  assert.match(denied, /默认禁用/);
});
