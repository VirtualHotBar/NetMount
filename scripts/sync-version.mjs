#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function syncVersion() {
  try {
    // 读取 package.json
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const newVersion = packageJson.version;
    
    if (!newVersion) {
      throw new Error('未找到 package.json 中的 version 字段');
    }
    
    console.log(`从 package.json 读取版本: ${newVersion}`);
    
    // 读取 Cargo.toml
    const cargoTomlPath = join(process.cwd(), 'src-tauri', 'Cargo.toml');
    let cargoTomlContent = await readFile(cargoTomlPath, 'utf8');
    
    // 替换 version 行
    // 匹配 [package] 部分下的 version = "x.x.x"
    const versionRegex = /^(\s*version\s*=\s*")[^"]*(")/gm;
    const matches = versionRegex.exec(cargoTomlContent);
    if (!matches) {
      throw new Error('在 Cargo.toml 中未找到 version 字段');
    }
    
    cargoTomlContent = cargoTomlContent.replace(versionRegex, `$1${newVersion}$2`);
    
    // 写回文件
    await writeFile(cargoTomlPath, cargoTomlContent, 'utf8');
    console.log(`已更新 Cargo.toml 版本为: ${newVersion}`);
  } catch (error) {
    console.error('同步版本时出错:', error);
    process.exit(1);
  }
}

syncVersion();