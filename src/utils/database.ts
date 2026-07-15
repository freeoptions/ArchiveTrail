import { invoke } from '@tauri-apps/api/core';

export interface Field {
  id: string;
  name: string;
  type: 'text' | 'link' | 'number' | 'date' | 'image';
  defaultValue?: string;
  required?: boolean;
  showCopyIcon?: boolean;
  sortable?: boolean;
}

export interface TagGroup {
  id: string;
  name: string;
}

export interface Platform {
  id: string;
  name: string;
  color: string;
  icon?: string;
  fields: Field[];
  subcategories: { id: string; name: string; groupId?: string }[];
  tagGroups?: TagGroup[];
  tagMode?: 'single' | 'multi';
  recordTagMode?: 'single' | 'multi';
  createdAt: Date;
}

export interface FieldValue {
  fieldId: string;
  value: string | number;
}

export interface Record {
  id: string;
  platformId: string;
  subcategoryId?: string;
  subcategoryIds?: string[];
  values: FieldValue[];
  favorite?: boolean;
  favoriteOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColumnWidthsMap {
  [platformId: string]: {
    [fieldId: string]: number;
  };
}

export interface AppData {
  platforms: Platform[];
  records: Record[];
  columnWidths: ColumnWidthsMap;
}

const FIELD_TYPES = new Set<Field['type']>(['text', 'link', 'number', 'date', 'image']);
const TAG_MODES = new Set<NonNullable<Platform['tagMode']>>(['single', 'multi']);

function isPlainObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} 缺失或格式不正确`);
  }
  return value;
}

function ensureOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 格式不正确`);
  }
  return value;
}

function ensureBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} 格式不正确`);
  }
  return value;
}

function ensureOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return ensureBoolean(value, fieldName);
}

function ensureDate(value: unknown, fieldName: string): Date {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} 不是有效时间`);
  }
  return date;
}

function normalizeField(field: unknown, index: number): Field {
  if (!isPlainObject(field)) {
    throw new Error(`字段 ${index + 1} 格式不正确`);
  }

  const type = ensureString(field.type, `字段 ${index + 1} 的类型`);
  if (!FIELD_TYPES.has(type as Field['type'])) {
    throw new Error(`字段 ${index + 1} 的类型不受支持`);
  }

  return {
    id: ensureString(field.id, `字段 ${index + 1} 的 ID`),
    name: ensureString(field.name, `字段 ${index + 1} 的名称`),
    type: type as Field['type'],
    defaultValue: ensureOptionalString(field.defaultValue, `字段 ${index + 1} 的默认值`),
    required: ensureOptionalBoolean(field.required, `字段 ${index + 1} 的必填配置`),
    showCopyIcon: ensureOptionalBoolean(field.showCopyIcon, `字段 ${index + 1} 的复制配置`),
    sortable: ensureOptionalBoolean(field.sortable, `字段 ${index + 1} 的排序配置`),
  };
}

function normalizeSubcategory(
  subcategory: unknown,
  index: number
): { id: string; name: string; groupId?: string } {
  if (!isPlainObject(subcategory)) {
    throw new Error(`子分类 ${index + 1} 格式不正确`);
  }

  return {
    id: ensureString(subcategory.id, `子分类 ${index + 1} 的 ID`),
    name: ensureString(subcategory.name, `子分类 ${index + 1} 的名称`),
    groupId: ensureOptionalString(subcategory.groupId, `子分类 ${index + 1} 的分组 ID`),
  };
}

function normalizeTagGroup(tagGroup: unknown, index: number): TagGroup {
  if (!isPlainObject(tagGroup)) {
    throw new Error(`标签分组 ${index + 1} 格式不正确`);
  }

  return {
    id: ensureString(tagGroup.id, `标签分组 ${index + 1} 的 ID`),
    name: ensureString(tagGroup.name, `标签分组 ${index + 1} 的名称`),
  };
}

function normalizePlatform(platform: unknown, index: number): Platform {
  if (!isPlainObject(platform)) {
    throw new Error(`平台 ${index + 1} 格式不正确`);
  }

  if (!Array.isArray(platform.fields)) {
    throw new Error(`平台 ${index + 1} 的字段列表格式不正确`);
  }

  const subcategories = Array.isArray(platform.subcategories) ? platform.subcategories : [];
  const tagGroups = Array.isArray(platform.tagGroups) ? platform.tagGroups : [];
  const tagMode = platform.tagMode ?? 'single';
  const recordTagMode = platform.recordTagMode ?? 'single';

  if (!TAG_MODES.has(tagMode as NonNullable<Platform['tagMode']>)) {
    throw new Error(`平台 ${index + 1} 的标签模式不正确`);
  }
  if (!TAG_MODES.has(recordTagMode as NonNullable<Platform['recordTagMode']>)) {
    throw new Error(`平台 ${index + 1} 的记录标签模式不正确`);
  }

  return {
    id: ensureString(platform.id, `平台 ${index + 1} 的 ID`),
    name: ensureString(platform.name, `平台 ${index + 1} 的名称`),
    color: ensureString(platform.color, `平台 ${index + 1} 的颜色`),
    icon: ensureOptionalString(platform.icon, `平台 ${index + 1} 的图标`),
    fields: platform.fields.map((field, fieldIndex) => normalizeField(field, fieldIndex)),
    subcategories: subcategories.map((item, subIndex) => normalizeSubcategory(item, subIndex)),
    tagGroups: tagGroups.map((item, groupIndex) => normalizeTagGroup(item, groupIndex)),
    tagMode: tagMode as Platform['tagMode'],
    recordTagMode: recordTagMode as Platform['recordTagMode'],
    createdAt: ensureDate(platform.createdAt, `平台 ${index + 1} 的创建时间`),
  };
}

function normalizeFieldValue(fieldValue: unknown, index: number, fallbackFieldId?: string): FieldValue {
  if (!isPlainObject(fieldValue)) {
    throw new Error(`字段值 ${index + 1} 格式不正确`);
  }

  const value = fieldValue.value;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`字段值 ${index + 1} 的内容格式不正确`);
  }

  return {
    fieldId:
      typeof fieldValue.fieldId === 'string' && fieldValue.fieldId.trim()
        ? fieldValue.fieldId
        : ensureString(fallbackFieldId, `字段值 ${index + 1} 的字段 ID`),
    value,
  };
}

function normalizeRecord(record: unknown, index: number, platformsById: Map<string, Platform>): Record {
  if (!isPlainObject(record)) {
    throw new Error(`记录 ${index + 1} 格式不正确`);
  }

  if (!Array.isArray(record.values)) {
    throw new Error(`记录 ${index + 1} 的字段值列表格式不正确`);
  }

  const subcategoryIdsRaw =
    record.subcategoryIds ??
    (typeof record.subcategoryId === 'string' && record.subcategoryId ? [record.subcategoryId] : []);

  if (!Array.isArray(subcategoryIdsRaw) || subcategoryIdsRaw.some(item => typeof item !== 'string')) {
    throw new Error(`记录 ${index + 1} 的标签列表格式不正确`);
  }

  const favoriteOrder = record.favoriteOrder;
  if (favoriteOrder !== undefined && favoriteOrder !== null && !Number.isFinite(favoriteOrder)) {
    throw new Error(`记录 ${index + 1} 的收藏顺序格式不正确`);
  }

  return {
    id: ensureString(record.id, `记录 ${index + 1} 的 ID`),
    platformId: ensureString(record.platformId, `记录 ${index + 1} 的平台 ID`),
    subcategoryId: ensureOptionalString(record.subcategoryId, `记录 ${index + 1} 的单选标签 ID`),
    subcategoryIds: subcategoryIdsRaw.map((item, itemIndex) =>
      ensureString(item, `记录 ${index + 1} 的标签 ${itemIndex + 1}`)
    ),
    values: record.values.map((value, valueIndex) =>
      normalizeFieldValue(value, valueIndex, platformsById.get(String(record.platformId))?.fields[valueIndex]?.id)
    ),
    favorite: record.favorite === undefined ? false : ensureBoolean(record.favorite, `记录 ${index + 1} 的收藏状态`),
    favoriteOrder: favoriteOrder === undefined || favoriteOrder === null ? undefined : Number(favoriteOrder),
    createdAt: ensureDate(record.createdAt, `记录 ${index + 1} 的创建时间`),
    updatedAt: ensureDate(record.updatedAt, `记录 ${index + 1} 的更新时间`),
  };
}

function normalizeColumnWidthsMap(columnWidths: unknown): ColumnWidthsMap {
  if (columnWidths === undefined || columnWidths === null) {
    return {};
  }

  if (!isPlainObject(columnWidths)) {
    throw new Error('列宽配置格式不正确');
  }

  const normalized: ColumnWidthsMap = {};

  for (const [platformId, fields] of Object.entries(columnWidths)) {
    if (!isPlainObject(fields)) {
      throw new Error(`平台 ${platformId} 的列宽配置格式不正确`);
    }

    normalized[platformId] = {};
    for (const [fieldId, width] of Object.entries(fields)) {
      if (typeof width !== 'number' || !Number.isFinite(width)) {
        throw new Error(`平台 ${platformId} 字段 ${fieldId} 的列宽格式不正确`);
      }
      normalized[platformId][fieldId] = width;
    }
  }

  return normalized;
}

function normalizeAppData(raw: unknown): AppData {
  if (!isPlainObject(raw)) {
    throw new Error('数据文件不是有效的数据对象');
  }

  if (!Array.isArray(raw.platforms)) {
    throw new Error('数据文件缺少 platforms 列表');
  }

  if (!Array.isArray(raw.records)) {
    throw new Error('数据文件缺少 records 列表');
  }

  const platforms = raw.platforms.map((platform, index) => normalizePlatform(platform, index));
  const platformsById = new Map(platforms.map(platform => [platform.id, platform]));

  return {
    platforms,
    records: raw.records.map((record, index) => normalizeRecord(record, index, platformsById)),
    columnWidths: normalizeColumnWidthsMap(raw.columnWidths),
  };
}

export class Database {
  private data: AppData = { platforms: [], records: [], columnWidths: {} };
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const dataStr = await invoke<string>('read_data');
      this.data = normalizeAppData(JSON.parse(dataStr));
      console.log(
        '数据加载成功，共',
        this.data.platforms.length,
        '个平台，',
        this.data.records.length,
        '条记录'
      );
    } catch (error) {
      console.error('数据加载失败，使用空数据初始化:', error);
      this.data = { platforms: [], records: [], columnWidths: {} };
    }

    this.initialized = true;
  }

  private async saveToFile(): Promise<void> {
    try {
      const dataStr = JSON.stringify(this.data);
      await invoke('write_data', { data: dataStr });
      console.log('数据保存成功');
    } catch (error) {
      console.error('保存数据失败:', error);
      throw error;
    }
  }

  async getPlatforms(): Promise<Platform[]> {
    await this.init();
    return this.data.platforms;
  }

  async getPlatform(id: string): Promise<Platform | null> {
    await this.init();
    return this.data.platforms.find(platform => platform.id === id) || null;
  }

  async savePlatform(platform: Platform): Promise<void> {
    await this.init();

    const index = this.data.platforms.findIndex(item => item.id === platform.id);
    if (index >= 0) {
      this.data.platforms[index] = platform;
    } else {
      this.data.platforms.push(platform);
    }

    await this.saveToFile();
    console.log('平台保存成功:', platform.name);
  }

  async deletePlatform(id: string): Promise<void> {
    await this.init();
    this.data.platforms = this.data.platforms.filter(platform => platform.id !== id);
    this.data.records = this.data.records.filter(record => record.platformId !== id);
    await this.saveToFile();
  }

  async getRecords(): Promise<Record[]> {
    await this.init();
    return this.data.records;
  }

  async getRecordsByPlatform(platformId: string): Promise<Record[]> {
    await this.init();
    return this.data.records.filter(record => record.platformId === platformId);
  }

  async addRecord(record: Record): Promise<void> {
    await this.init();
    this.data.records.push(record);
    await this.saveToFile();
  }

  async updateRecord(record: Record): Promise<void> {
    await this.init();

    const index = this.data.records.findIndex(item => item.id === record.id);
    if (index >= 0) {
      this.data.records[index] = record;
    }

    await this.saveToFile();
  }

  async saveRecords(records: Record[]): Promise<void> {
    await this.init();
    this.data.records = records;
    await this.saveToFile();
  }

  async deleteRecord(id: string): Promise<void> {
    await this.init();
    this.data.records = this.data.records.filter(record => record.id !== id);
    await this.saveToFile();
  }

  async getColumnWidths(): Promise<ColumnWidthsMap> {
    await this.init();
    return this.data.columnWidths;
  }

  async saveColumnWidths(columnWidths: ColumnWidthsMap): Promise<void> {
    await this.init();
    this.data.columnWidths = columnWidths;
    await this.saveToFile();
  }

}
