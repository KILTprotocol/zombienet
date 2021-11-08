import { randomBytes } from "crypto";
import fs from "fs";
import { format } from "util";
import { LaunchConfig } from "./types";
import toml from "toml";

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateNamespace(): string {
  const buf = randomBytes(16);
  return buf.toString("hex");
}

export function readDataFile(filepath: string): string {
  try {
    const fileData = fs.readFileSync(filepath, "utf8");
    return fileData.trim();
  } catch (err) {
    throw Error(`Cannot read ${filepath}: ` + err);
  }
}

export function addMinutes(howMany: number, baseDate?: Date): number {
  const baseHours = baseDate
    ? baseDate.getUTCMinutes()
    : new Date().getUTCMinutes();
  return (baseHours + 59 + howMany) % 59;
}

export function filterConsole(excludePatterns: string[], options?: any) {
  options = {
    console,
    methods: ["log", "debug", "info", "warn", "error"],
    ...options,
  };

  const { console: consoleObject, methods } = options;
  const originalMethods = methods.map((method: any) => consoleObject[method]);

  const check = (output: string) => {
    for (const pattern of excludePatterns) {
      if (output.includes(pattern)) return true;
    }

    return false;
  };

  for (const method of methods) {
    const originalMethod = consoleObject[method];

    consoleObject[method] = (...args: any) => {
      if (check(format(...args))) {
        return;
      }

      originalMethod(...args);
    };
  }

  return () => {
    for (const [index, method] of methods.entries()) {
      consoleObject[method] = originalMethods[index];
    }
  };
}

export function readNetworkConfig(filepath: string): LaunchConfig {
  let content = fs.readFileSync(filepath).toString();
  let replacements = getReplacementInText(content);

  for(const replacement of replacements) {

    const replacementValue = process.env[replacement];
    if(replacementValue === undefined) throw new Error(`Environment not set for : ${replacement}`);
    content = content.replace(new RegExp(`{{${replacement}}}`, "gi"), replacementValue);
  }

  // TODO: add better file recognition
  const fileType = filepath.split(".").pop();
  const config: LaunchConfig =
    fileType?.toLocaleLowerCase() === "json"
      ? JSON.parse(content) //require(filepath)
      : toml.parse(content);

  return config;
}

export function getCredsFilePath(credsFile: string): string|undefined {
  if (fs.existsSync(credsFile)) return credsFile;

  const possiblePaths = [".", "..", `${process.env.HOME}/.kube`];
  let credsFileExistInPath: string | undefined = possiblePaths.find(
    (path) => {
      const t = `${path}/${credsFile}`;
      return fs.existsSync(t);
    }
  );
  if (credsFileExistInPath) return `${credsFileExistInPath}/${credsFile}`;
}

function getReplacementInText(content:string): string[] {
  const replacements: string[] = [];
  // allow to replace with env vars, to make more dynamic usage of ci.
  const replacementRegex = /{{([A-Za-z-_\.]+)}}/gmi;
  for( const match of content.matchAll(replacementRegex)) {
    replacements.push(match[1]);
  }

  return replacements;
}

export function writeLocalJsonFile(path: string, fileName: string, content: any) {
  fs.writeFileSync(`${path}/${fileName}`, JSON.stringify(content, null, 4));
}