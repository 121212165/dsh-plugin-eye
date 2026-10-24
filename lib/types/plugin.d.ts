/**
 * dsh wiring for eye：eye_windows（窗口清单，只读）+ eye_screenshot（截屏给
 * agent 看）+ /eye 命令。摄像头 capture 一期 no-op stub，默认禁用。
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "eye";
export declare const inject: string[];
export interface Config {
    enabled: boolean;
    dataDir?: string;
    maxCaptures: number;
    allowScreen: boolean;
    allowCamera: boolean;
    order: number;
}
export declare const Config: Schema<Schemastery.ObjectS<{
    enabled: Schema<boolean, boolean>;
    dataDir: Schema<string, string>;
    maxCaptures: Schema<number, number>;
    allowScreen: Schema<boolean, boolean>;
    allowCamera: Schema<boolean, boolean>;
    order: Schema<number, number>;
}>, Schemastery.ObjectT<{
    enabled: Schema<boolean, boolean>;
    dataDir: Schema<string, string>;
    maxCaptures: Schema<number, number>;
    allowScreen: Schema<boolean, boolean>;
    allowCamera: Schema<boolean, boolean>;
    order: Schema<number, number>;
}>>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=plugin.d.ts.map