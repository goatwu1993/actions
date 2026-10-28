import { promises as fs } from "node:fs";
import { parseStringPromise } from "xml2js";
import glob from "glob-promise";
import { coberturaDocumentSchema } from "./schemas";
import type { XmlRates, XmlClass, XmlPackage, XmlPackages } from "./schemas";

export interface LineRange {
  start: number;
  end: number;
}
interface Rates {
  total: number;
  line: number;
  branch: number;
}
export interface CoverageFile extends Rates {
  filename: string;
  name: string;
  missing: LineRange[];
}
export interface CoveragePackage extends Rates {
  name: string;
}
export interface CoverageReport extends Rates {
  files: CoverageFile[];
  packages?: CoveragePackage[];
  folder?: string;
}
export type CoverageManifest = CoverageReport[];
interface CoverageOptions {
  skipCovered?: boolean;
}

async function readCoverageFromFile(path: string, options: CoverageOptions): Promise<CoverageReport> {
  const xml = await fs.readFile(path, "utf-8");
  const { coverage } = coberturaDocumentSchema.parse(await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
  }));
  const { packages } = coverage;
  const classes = processPackages(packages);
  const packageReports = packages.package.flatMap((packageObj) => {
    const { name, "line-rate": lineRate, "branch-rate": branchRate } = packageObj;
    if (!name || lineRate === undefined || branchRate === undefined) return [];
    return [{
      name,
      ...calculateRates({ "line-rate": lineRate, "branch-rate": branchRate }),
    }];
  });
  const files = classes
    .map((klass) => {
      return {
        ...calculateRates(klass),
        filename: klass.filename,
        name: klass.name,
        missing: missingLines(klass),
      };
    })
    .filter((file) => !options.skipCovered || file.total < 100);
  return {
    ...calculateRates(coverage),
    files,
    packages: packageReports,
  };
}

function trimFolder(path: string, positionOfFirstDiff: number) {
  const lastFolder = path.lastIndexOf("/") + 1;
  if (positionOfFirstDiff >= lastFolder) {
    return path.substr(lastFolder);
  } else {
    const startOffset = Math.min(positionOfFirstDiff - 1, lastFolder);
    const length = path.length - startOffset - lastFolder - 2; // remove filename
    return path.substr(startOffset, length);
  }
}

async function processCoverage(
  path: string,
  options: CoverageOptions = {},
): Promise<CoverageManifest> {
  const paths = glob.hasMagic(path) ? await glob(path) : [path];
  const positionOfFirstDiff = longestCommonPrefix(paths);
  return await Promise.all(
    paths.map(async (path) => {
      const report = await readCoverageFromFile(path, options);
      const folder = trimFolder(path, positionOfFirstDiff);
      return {
        ...report,
        folder,
      };
    }),
  );
}

function processPackages(packages: XmlPackages): XmlClass[] {
  return packages.package.length > 0
    ? packages.package.flatMap(processPackage)
    : processPackage(packages);
}

function processPackage(packageObj: XmlPackage): XmlClass[] {
  return packageObj.classes?.class ?? packageObj.class;
}

function calculateRates(element: XmlRates): Rates {
  const line = element["line-rate"] * 100;
  const branch = element["branch-rate"] * 100;
  const total = line && branch ? (line + branch) / 2 : line;
  return {
    total,
    line,
    branch,
  };
}

function missingLines(klass: XmlClass): LineRange[] {
  // Bail if line-rate says fully covered
  if (klass["line-rate"] >= 1.0) return [];

  const lines = [...(klass.lines?.line ?? [])].sort((a, b) => a.number - b.number);
  const statements = lines.map((line) => line.number);
  const misses = lines
    .filter((line) => line.hits < 1)
    .map((line) => line.number);
  return partitionLines(statements, misses);
}

function partitionLines(statements: number[], lines: number[]): LineRange[] {
  /*
   * Detect sequences, with gaps according to 'statements',
   * in 'lines' and compress them in to a range format.
   *
   * Example:
   *
   * statements = [1,2,3,4,5,10,11,12,13,14,15,16]
   * lines =      [1,2,    5,10,11,   13,14,  ,16]
   * Returns: [{ start: 1, end: 2 }, { start: 5, end: 11 },
   *           { start: 13, end: 14 }, { start: 16, end: 16 }]
   */
  const ranges: LineRange[] = [];
  let start: number | null = null;
  let linesCursor = 0;
  let end = 0;
  for (const statement of statements) {
    if (linesCursor >= lines.length) break;

    if (statement === lines[linesCursor]) {
      // (Consecutive) element from 'statements' matches
      // element from 'lines' at 'linesCursor'
      linesCursor += 1;
      if (start === null) start = statement;
      end = statement;
    } else if (start !== null) {
      // Consecutive elements are broken, an element from
      // 'statements' is missing from 'lines'
      ranges.push({ start, end });
      start = null;
    }
  }
  // (Eventually) close range running last iteration
  if (start !== null) ranges.push({ start, end });

  return ranges;
}

function longestCommonPrefix(paths: readonly string[] | null): number {
  let prefix = "";
  if (paths === null || paths.length === 0) return 0;

  for (let i = 0; i < paths[0].length; i++) {
    const char = paths[0][i]; // loop through all characters of the very first string.

    for (let j = 1; j < paths.length; j++) {
      // loop through all other strings in the array
      if (paths[j][i] !== char) return prefix.length;
    }
    prefix = prefix + char;
  }

  return prefix.length;
}

export {
  processCoverage,
  trimFolder,
  longestCommonPrefix,
};
