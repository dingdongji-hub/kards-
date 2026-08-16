// 最小全局类型声明：避免工程强依赖 miniprogram-api-typings 也能编译运行。
// 如已安装 miniprogram-api-typings，可删除本文件以获得更完整的类型提示。
declare const wx: any;
declare function App(options: any): void;
declare function Page(options: any): void;
declare function Component(options: any): void;
declare function getApp<T = any>(): T;
declare function getCurrentPages(): any[];

// 小程序运行时全局 API
declare function setTimeout(fn: (...args: any[]) => void, ms?: number): number;
declare function clearTimeout(id: number): void;
declare function setInterval(fn: (...args: any[]) => void, ms?: number): number;
declare function clearInterval(id: number): void;
declare const console: any;
