declare module 'ai' {
  export function streamText(options: {
    model: unknown;
    system?: string;
    messages: unknown[];
    tools?: Record<string, unknown>;
    maxSteps?: number;
    stopWhen?: (a: unknown, b: unknown) => boolean;
    onFinish?: (result: { text: string; totalUsage: { inputTokens: number; outputTokens: number }; finishReason: string }) => Promise<void>;
  }): {
    toUIMessageStreamResponse: (opts: { originalMessages: unknown[] }) => Response;
  };

  export function generateObject<T = any>(options: {
    model: unknown;
    schema?: unknown;
    temperature?: number;
    prompt?: string;
    messages?: unknown[];
  }): Promise<{ object: T }>;

  export function generateText(options: {
    model: unknown;
    system?: string;
    prompt?: string;
    messages?: unknown[];
    tools?: Record<string, unknown>;
    maxSteps?: number;
  }): Promise<{ text: string; toolCalls?: unknown[] }>;

  export function tool(options: {
    description: string;
    inputSchema?: unknown;
    parameters?: unknown;
    execute: (...args: any[]) => any;
  }): {
    description: string;
    parameters: unknown;
    execute: (...args: any[]) => Promise<any>;
  };

  export function convertToModelMessages(messages: unknown[]): Promise<unknown[]>;

  export function stepCountIs(n: number): (a: unknown, b: unknown) => boolean;

  export type UIMessage = { id: string; role: string; content?: string; parts?: { type: string; text?: string }[] };

  export class DefaultChatTransport {
    constructor(options: Record<string, unknown>);
    onResponse?: (response: Response) => void;
  }
}

declare module 'framer-motion' {
  import type { ComponentType, ReactNode, RefObject } from 'react';

  export const motion: Record<string, ComponentType<Record<string, unknown>>>;
  export const AnimatePresence: ComponentType<{ children?: ReactNode; mode?: string }>;
  export function useReducedMotion(): boolean;
  export function useInView(options?: Record<string, unknown>): boolean & { ref: RefObject<unknown> };
  export function useInView(ref?: unknown, options?: Record<string, unknown>): boolean & { ref: RefObject<unknown> };
}

declare module 'jspdf' {
  class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    setFillColor(r: number, g: number, b: number): void;
    setDrawColor(r: number, g: number, b: number): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    setTextColor(gray: number): void;
    setTextColor(r: number, g: number, b: number): void;
    setTextColor(color: number[]): void;
    setFont(font: string, style?: string): void;
    setFontSize(size: number): void;
    text(text: string, x: number, y: number, options?: { align?: string; maxWidth?: number }): void;
    addImage(imageData: string, format: string, x: number, y: number, w: number, h: number, alias?: string, compression?: string, rotation?: number): void;
    addImage(imageData: ArrayBuffer, format: string, x: number, y: number, w: number, h: number, alias?: string, compression?: string, rotation?: number): void;
    addPage(format?: string): void;
    deletePage(n: number): void;
    save(filename: string): void;
    output(type: string, options?: Record<string, unknown>): string;
    output(type: 'arraybuffer'): ArrayBuffer;
    getNumberOfPages(): number;
    setPage(n: number): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    getFontList(): Record<string, string>;
    setGState(gState: unknown): void;
  }
  export { jsPDF };
}

declare module 'jspdf-autotable' {
  export default function autoTable(doc: unknown, options: Record<string, unknown>): void;
}
