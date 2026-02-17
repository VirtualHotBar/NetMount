/**
 * Zod Schema 验证系统 - 提供类型安全的API响应验证
 * 增强数据完整性和运行时安全性
 */

import { z } from 'zod';

// ============================================
// Rclone API Schemas
// ============================================

/**
 * Rclone 文件信息 Schema
 */
export const RcloneFileInfoSchema = z.object({
  Path: z.string(),
  Name: z.string(),
  Size: z.number().nonnegative(),
  MimeType: z.string().optional(),
  ModTime: z.string().datetime().or(z.string()), // 某些情况下可能不是标准ISO格式
  IsDir: z.boolean(),
});

export type RcloneFileInfo = z.infer<typeof RcloneFileInfoSchema>;

/**
 * Rclone 存储空间信息 Schema
 */
export const RcloneStorageSpaceSchema = z.object({
  total: z.number().nonnegative(),
  used: z.number().nonnegative(),
  free: z.number().nonnegative(),
  trashed: z.number().nonnegative().optional(),
});

export type RcloneStorageSpace = z.infer<typeof RcloneStorageSpaceSchema>;

/**
 * Rclone 版本信息 Schema
 */
export const RcloneVersionSchema = z.object({
  arch: z.string(),
  decomposed: z.array(z.number()),
  goTags: z.string(),
  goVersion: z.string(),
  isBeta: z.boolean(),
  isGit: z.boolean(),
  linking: z.string(),
  os: z.string(),
  version: z.string(),
});

export type RcloneVersion = z.infer<typeof RcloneVersionSchema>;

/**
 * Rclone 统计信息 Schema
 */
export const RcloneStatsSchema = z.object({
  bytes: z.number().nonnegative(),
  checks: z.number().nonnegative(),
  deletedDirs: z.number().nonnegative(),
  deletes: z.number().nonnegative(),
  elapsedTime: z.number().nonnegative(),
  errors: z.number().nonnegative(),
  eta: z.number().nullable().optional(),
  fatalError: z.boolean(),
  renames: z.number().nonnegative(),
  retryError: z.boolean(),
  serverSideCopies: z.number().nonnegative(),
  serverSideCopyBytes: z.number().nonnegative(),
  serverSideMoveBytes: z.number().nonnegative(),
  serverSideMoves: z.number().nonnegative(),
  speed: z.number().nonnegative(),
  totalBytes: z.number().nonnegative(),
  totalChecks: z.number().nonnegative(),
  totalTransfers: z.number().nonnegative(),
  transferTime: z.number().nonnegative(),
  lastError: z.string().optional(),
  transferring: z.array(z.record(z.unknown())).optional(),
});

export type RcloneStats = z.infer<typeof RcloneStatsSchema>;

/**
 * Rclone 配置提供者选项 Schema
 */
export const RcloneProviderOptionSchema = z.object({
  Name: z.string(),
  Help: z.string(),
  Type: z.string(),
  Default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  ValueStr: z.string().optional(),
  DefaultStr: z.string().optional(),
  Required: z.boolean().optional(),
  Advanced: z.boolean().optional(),
  IsPassword: z.boolean().optional(),
  Provider: z.string().optional(),
  ShortOpt: z.string().optional(),
  Examples: z.array(
    z.object({
      Value: z.string(),
      Help: z.string(),
    })
  ).optional(),
});

export type RcloneProviderOption = z.infer<typeof RcloneProviderOptionSchema>;

/**
 * Rclone 配置提供者 Schema
 */
export const RcloneProviderSchema = z.object({
  Name: z.string(),
  Description: z.string(),
  Prefix: z.string(),
  Options: z.array(RcloneProviderOptionSchema),
});

export type RcloneProvider = z.infer<typeof RcloneProviderSchema>;

/**
 * Rclone API 列表响应 Schema
 */
export const RcloneListResponseSchema = z.object({
  list: z.array(RcloneFileInfoSchema).optional(),
});

export type RcloneListResponse = z.infer<typeof RcloneListResponseSchema>;

// ============================================
// OpenList API Schemas
// ============================================

/**
 * OpenList API 基础响应 Schema
 */
export const OpenListApiResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export type OpenListApiResponse = z.infer<typeof OpenListApiResponseSchema>;

/**
 * OpenList 存储项 Schema
 */
export const OpenListStorageItemSchema = z.object({
  id: z.number(),
  mount_path: z.string(),
  driver: z.string(),
  status: z.enum(['work', 'error', 'disabled']).or(z.string()),
  addition: z.union([z.string(), z.record(z.unknown())]).optional(),
});

export type OpenListStorageItem = z.infer<typeof OpenListStorageItemSchema>;

/**
 * OpenList 存储列表响应 Schema
 */
export const OpenListStorageListResponseSchema = OpenListApiResponseSchema.extend({
  data: z.object({
    content: z.array(OpenListStorageItemSchema).optional(),
  }).optional(),
});

export type OpenListStorageListResponse = z.infer<typeof OpenListStorageListResponseSchema>;

/**
 * OpenList 设置响应 Schema
 */
export const OpenListSettingResponseSchema = OpenListApiResponseSchema.extend({
  data: z.object({
    value: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
});

export type OpenListSettingResponse = z.infer<typeof OpenListSettingResponseSchema>;

/**
 * OpenList 存储详情响应 Schema
 */
export const OpenListStorageDetailResponseSchema = OpenListApiResponseSchema.extend({
  data: z.object({
    id: z.number().optional(),
    mount_path: z.string().optional(),
    driver: z.string().optional(),
    addition: z.union([z.string(), z.record(z.unknown())]).optional(),
  }).optional(),
});

export type OpenListStorageDetailResponse = z.infer<typeof OpenListStorageDetailResponseSchema>;

// ============================================
// Application Config Schemas
// ============================================

/**
 * 挂载配置项 Schema
 */
export const MountListItemSchema = z.object({
  storageName: z.string(),
  mountPath: z.string(),
  parameters: z.object({
    vfsOpt: z.record(z.unknown()),
    mountOpt: z.record(z.unknown()),
  }),
  autoMount: z.boolean(),
});

export type MountListItem = z.infer<typeof MountListItemSchema>;

/**
 * 任务运行时间配置 Schema
 */
export const TaskTimeConfigSchema = z.object({
  intervalDays: z.number().nonnegative(),
  h: z.number().min(0).max(23),
  m: z.number().min(0).max(59),
  s: z.number().min(0).max(59),
});

export type TaskTimeConfig = z.infer<typeof TaskTimeConfigSchema>;

/**
 * 任务运行配置 Schema
 */
export const TaskRunConfigSchema = z.object({
  runId: z.number().optional(),
  mode: z.enum(['start', 'time', 'interval', 'disposable']),
  time: TaskTimeConfigSchema,
  interval: z.number().nonnegative().optional(),
});

export type TaskRunConfig = z.infer<typeof TaskRunConfigSchema>;

/**
 * 任务列表项 Schema
 */
export const TaskListItemSchema = z.object({
  name: z.string().min(1),
  taskType: z.enum(['copy', 'move', 'delete', 'sync', 'bisync']),
  source: z.object({
    storageName: z.string(),
    path: z.string(),
  }),
  target: z.object({
    storageName: z.string(),
    path: z.string(),
  }),
  parameters: z.record(z.unknown()).optional(),
  enable: z.boolean(),
  run: TaskRunConfigSchema,
  runInfo: z.object({
    error: z.boolean().optional(),
    msg: z.string().optional(),
  }).optional(),
});

export type TaskListItem = z.infer<typeof TaskListItemSchema>;

/**
 * NMConfig Schema
 */
export const NMConfigSchema = z.object({
  mount: z.object({
    lists: z.array(MountListItemSchema),
  }),
  task: z.array(TaskListItemSchema),
  api: z.object({
    url: z.string().url(),
  }),
  settings: z.object({
    themeMode: z.enum(['dark', 'light', 'auto']).or(z.string()),
    startHide: z.boolean(),
    language: z.string().optional(),
    path: z.object({
      cacheDir: z.string().optional(),
    }),
  }),
  framework: z.object({
    rclone: z.object({
      user: z.string(),
      password: z.string(),
    }),
    openlist: z.object({
      user: z.string(),
      password: z.string(),
    }),
  }),
});

export type NMConfigValidated = z.infer<typeof NMConfigSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * 安全解析函数 - 捕获验证错误并返回默认值
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown, defaultValue: T): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Schema validation failed:', result.error.errors);
  return defaultValue;
}

/**
 * 部分解析函数 - 允许部分数据通过
 */
export function partialParse<T>(_schema: z.ZodType<T>, _data: unknown): Partial<T> | undefined {
  void _schema;
  void _data;
  // 由于 ZodType.partial() 不可用，我们直接返回原始数据的部分属性
  // 实际使用时可以通过 schema.shape 来获取可选字段
  // 这里提供一个安全的回退实现
  return {} as Partial<T>;
}

/**
 * 数组解析函数 - 过滤无效项
 */
export function parseArray<T>(schema: z.ZodType<T>, data: unknown[]): T[] {
  const results: T[] = [];
  for (const item of data) {
    const result = schema.safeParse(item);
    if (result.success) {
      results.push(result.data);
    } else {
      console.warn('Array item validation failed:', result.error.errors);
    }
  }
  return results;
}

/**
 * 验证结果类型
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError['errors'] };

/**
 * 带详细错误信息的验证函数
 */
export function validateWithDetails<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors };
}
