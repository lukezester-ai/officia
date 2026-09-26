import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export const CONTRACT_FILES_ROOT = path.join(process.cwd(), 'data', 'contract-files');

const ALLOWED = new Set(['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'txt']);

export function contractFileExtension(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED.has(ext) ? ext : null;
}

export function resolveContractFile(relative: string) {
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) {
    throw new Error('bad path');
  }
  const root = path.resolve(CONTRACT_FILES_ROOT);
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error('bad path');
  return full;
}

export async function saveContractFile(tenantId: string, contractId: string, file: File) {
  const ext = contractFileExtension(file.name);
  if (!ext) throw new Error('Файлът е PDF, Word, текст или снимка.');
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error('Файлът е до 5 MB.');
  const safe = path.basename(file.name).replace(/[^\w.\-\u0400-\u04FF ]+/g, '').slice(0, 80) || `file.${ext}`;
  const relative = path.posix.join(tenantId, contractId, `${randomUUID()}-${safe}`);
  const full = resolveContractFile(relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return { relative, downloadName: safe };
}

export async function readContractFile(relative: string) {
  return readFile(resolveContractFile(relative));
}

export function contractFileLabel(contentUrl: string | null | undefined) {
  if (!contentUrl) return null;
  const base = contentUrl.split('/').pop() || '';
  return base.replace(/^[0-9a-f-]{36}-/i, '') || base;
}
