import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { PRICE_PER_FILE_SUI } from '../config';

const IGNORED_DIRS = new Set(['build', 'node_modules', '.git', 'dist', '.turbo']);

export interface AuditPlan {
  files: string[];
  totalCostSui: number;
}

/** Recursively collect every `.move` file under `root`, skipping build dirs. */
export function findMoveFiles(root: string): string[] {
  const out: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (IGNORED_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && extname(full) === '.move') out.push(full);
    }
  };

  walk(root);
  return out.sort();
}

/** Build a plan for a single file. Throws if it is missing or not a `.move`. */
export function planForFile(filePath: string): AuditPlan {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  if (extname(filePath) !== '.move') {
    throw new Error(`Not a .move file: ${filePath}`);
  }
  return { files: [filePath], totalCostSui: PRICE_PER_FILE_SUI };
}

/** Build a plan for a whole codebase rooted at `dir`. */
export function planForCodebase(dir: string): AuditPlan {
  if (!existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }
  const files = findMoveFiles(dir);
  return { files, totalCostSui: files.length * PRICE_PER_FILE_SUI };
}

export function reportFileName(movePath: string): string {
  return `${basename(movePath, '.move')}.audit.md`;
}
