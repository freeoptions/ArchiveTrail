<template>
  <div class="app-shell">
    <div ref="topPanelRef" class="top-panel">
      <header class="header">
        <div class="header-left">
          <img src="/icons/archive-trail.png" alt="ArchiveTrail 图标" class="app-brand-icon" />
          <h1>ArchiveTrail</h1>
        </div>
        <div class="header-right">
          <button class="btn btn-secondary" @click="showPlatformModal = true">管理平台</button>
        </div>
      </header>

      <div class="toolbar">
        <div class="platform-row">
          <div class="platform-tabs">
            <button
              v-for="platform in platforms"
              :key="platform.id"
              class="tab-btn"
              :class="{
                active: currentPlatform?.id === platform.id,
                'has-search-matches': isGlobalSearchEnabled && globalPlatformMatchCounts[platform.id] > 0,
              }"
              :title="getPlatformTabTitle(platform)"
              @mousedown.prevent
              @click="currentPlatform = platform"
              @dblclick="editPlatformById(platform.id)"
              @contextmenu.prevent="editPlatformById(platform.id)"
            >
              <img
                v-if="platform.icon"
                :src="getPlatformIconUrlSync(platform.icon)"
                class="platform-icon-tab"
                alt=""
              />
              <span>{{ platform.name }}</span>
              <span
                v-if="isGlobalSearchEnabled && globalPlatformMatchCounts[platform.id] > 0"
                class="tab-match-count"
                aria-label="搜索命中数量"
              >
                {{ globalPlatformMatchCounts[platform.id] }}
              </span>
            </button>
            <button class="tab-btn add-platform" @click="showPlatformModal = true">+</button>
          </div>
        </div>

        <div v-if="currentPlatform && currentPlatform.subcategories.length > 0" class="filter-panel">
          <div class="filter-panel-body">
            <div class="subcategory-row">
              <template v-if="currentPlatform.tagGroups && currentPlatform.tagGroups.length > 0">
                <div
                  v-for="group in currentPlatform.tagGroups"
                  :key="group.id"
                  class="subcategory-group"
                >
                  <div class="subcategory-group-main">
                    <span class="group-label">{{ group.name }}</span>
                    <div class="subcategory-tabs subcategory-scrollable" @wheel.prevent="handleHorizontalWheel">
                      <button
                        v-for="subcategory in currentPlatform.subcategories.filter(s => s.groupId === group.id)"
                        :key="subcategory.id"
                        type="button"
                        class="sub-tab"
                        :class="{ active: selectedSubcategoryIds.includes(subcategory.id) }"
                        @mousedown.prevent
                        @click="toggleSubcategory(subcategory.id)"
                      >
                        {{ subcategory.name }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="subcategory-group">
                  <div class="subcategory-group-main subcategory-group-main-plain">
                    <div class="subcategory-tabs subcategory-scrollable" @wheel.prevent="handleHorizontalWheel">
                      <button
                        v-for="subcategory in currentPlatform.subcategories"
                        :key="subcategory.id"
                        type="button"
                        class="sub-tab"
                        :class="{ active: selectedSubcategoryIds.includes(subcategory.id) }"
                        @mousedown.prevent
                        @click="toggleSubcategory(subcategory.id)"
                      >
                        {{ subcategory.name }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <button type="button" class="sub-tab sub-tab-reset" @click="selectedSubcategoryIds = []">
              重置
            </button>
          </div>
        </div>

        <div class="meta-row">
          <div class="stats">
            <span v-if="displayRecords.length > 0" class="stat-item">共 {{ displayRecords.length }} 条记录</span>
          </div>

          <div class="meta-search">
            <div class="search-box">
              <span class="search-icon" aria-hidden="true"></span>
              <input ref="searchInputRef" v-model="activeSearchQuery" type="text" placeholder="搜索记录或输入拼音..." />
              <button v-if="activeSearchQuery" class="search-clear" @click="clearSearch" title="清空">✕</button>
              <label
                class="global-search-toggle"
                :class="{ active: isGlobalSearchEnabled }"
                title="开启后切换平台会保留当前搜索词"
              >
                <input
                  type="checkbox"
                  :checked="isGlobalSearchEnabled"
                  @change="handleGlobalSearchToggle"
                />
                <span>全局</span>
              </label>
            </div>
          </div>

          <div class="actions">
            <select v-model="fontSize" class="font-size-select" title="字体大小">
              <option value="12">小</option>
              <option value="13">标准</option>
              <option value="14">中</option>
              <option value="15">大</option>
              <option value="16">特大</option>
            </select>
            <button class="btn btn-primary" @click="showRecordModal = true">新建记录</button>
          </div>
        </div>
      </div>
    </div>

    <main class="main">
      <div ref="tableContainerRef" class="table-container card">
        <template v-if="displayRecords.length > 0">
          <table class="record-table" :style="{ minWidth: `${tableMinWidth}px` }">
            <colgroup>
              <col class="col-platform" :style="getPlatformColumnStyle()" />
              <col
                v-for="field in currentFields"
                :key="'col-' + field.id"
                :class="getFieldColumnClass(field)"
                :style="getFieldColumnStyle(field)"
              />
              <col class="col-actions" />
            </colgroup>

            <thead>
              <tr>
                <th
                  class="th-platform column-resizable"
                  :class="{ 'is-resizing': resizingColumnId === PLATFORM_COLUMN_KEY }"
                >
                  <div class="th-content">
                    <span class="th-label">平台</span>
                  </div>
                  <span
                    class="column-resize-handle"
                    title="拖动调整列宽，双击自适应"
                    @mousedown.stop.prevent="startPlatformColumnResize($event)"
                    @dblclick.stop.prevent="autoFitPlatformColumn"
                  ></span>
                </th>
                <th
                  v-for="field in currentFields"
                  :key="field.id"
                  :class="[getFieldHeaderClass(field), 'column-resizable', { 'is-resizing': resizingColumnId === field.id }]"
                >
                  <div class="th-content">
                    <button
                      v-if="field.sortable"
                      type="button"
                      class="sort-header-btn"
                      @click="toggleFieldSort(field.id)"
                    >
                      <span class="th-label">{{ field.name }}</span>
                      <span class="sort-arrow" :class="getSortArrowClass(field.id)">{{ getSortArrow(field.id) }}</span>
                    </button>
                    <span v-else class="th-label">{{ field.name }}</span>
                  </div>
                  <span
                    v-if="canResizeField(field)"
                    class="column-resize-handle"
                    title="拖动调整列宽，双击自适应"
                    @mousedown.stop.prevent="startColumnResize(field, $event)"
                    @dblclick.stop.prevent="autoFitColumn(field)"
                  ></span>
                </th>
                <th class="th-actions">操作</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="record in displayRecords" :key="record.id" class="table-row">
                <td class="platform-cell">
                  <span class="platform-tag">
                    <img
                      v-if="getPlatform(record.platformId)?.icon"
                      :src="getPlatformIconUrlSync(getPlatform(record.platformId)?.icon || '')"
                      class="platform-icon"
                      alt=""
                    />
                    <span v-else>{{ getPlatform(record.platformId)?.name }}</span>
                  </span>
                </td>

                <td
                  v-for="field in currentFields"
                  :key="field.id"
                  :class="getFieldCellClass(field)"
                >
                  <div class="field-value" :class="'field-type-' + field.type">
                    <template v-if="field.type === 'link' && getFieldValue(record, field.id)">
                      <button
                        class="link-field"
                        @click.stop.prevent="openExternalLink(String(getFieldValue(record, field.id)))"
                        :title="String(getFieldValue(record, field.id))"
                        v-html="highlightText(String(getFieldValue(record, field.id)))"
                      >
                      </button>
                    </template>

                    <template v-else-if="field.type === 'date'">
                      <span
                        class="date-field"
                        v-html="highlightText(formatDateShort(getFieldValue(record, field.id)))"
                      ></span>
                    </template>

                    <template v-else-if="field.type === 'image'">
                      <div v-if="getFieldValue(record, field.id)" class="image-cell">
                        <img
                          :src="getImageUrlSync(String(getFieldValue(record, field.id)))"
                          alt="??"
                          class="table-image"
                          loading="lazy"
                          decoding="async"
                          @click="showImagePreview(String(getFieldValue(record, field.id)))"
                        />
                      </div>
                      <span v-else class="muted-text">-</span>
                    </template>

                    <template v-else>
                      <span
                        class="text-field"
                        v-html="highlightText(String(getFieldValue(record, field.id) || '-'))"
                      ></span>
                    </template>

                    <button
                      v-if="field.showCopyIcon && hasFieldValue(record, field.id)"
                      class="copy-btn"
                      :class="{ copied: copiedFieldKey === record.id + '-' + field.id }"
                      @click="copyFieldValue(record, field.id)"
                    >
                      <span v-if="copiedFieldKey === record.id + '-' + field.id" class="copy-check-icon"></span>
                      <img v-else :src="quickerCopyIcon" alt="" class="copy-image-icon" />
                    </button>
                  </div>
                </td>

                <td class="actions-cell">
                  <div class="action-buttons">
                    <button class="btn-icon btn-edit" @click="editRecord(record)" title="编辑">✏️</button>
                    <button
                      type="button"
                      class="btn-icon btn-favorite"
                      :class="{ active: !!record.favorite }"
                      @click.stop.prevent="toggleFavorite(record)"
                      title="收藏"
                    >
                      {{ record.favorite ? '🌟' : '☆' }}
                    </button>
                    <button class="btn-icon btn-delete" @click="deleteRecord(record.id)" title="删除">✕</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <div v-else class="empty-state">
          <div class="empty-icon">📭</div>
          <p class="empty-text">暂无记录</p>
          <p class="empty-hint">点击下方按钮创建第一条记录</p>
          <button class="btn btn-primary btn-large" @click="showRecordModal = true">新建记录</button>
        </div>
      </div>
    </main>

    <PlatformModal
      v-if="showPlatformModal"
      :platforms="platforms"
      :initialPlatformId="editingPlatformId"
      @close="showPlatformModal = false; editingPlatformId = undefined"
      @save="savePlatformsBatch"
      @delete="deletePlatform"
    />

    <RecordModal
      v-if="showRecordModal"
      :record="editingRecord"
      :platforms="platforms"
      :currentPlatform="currentPlatform"
      @close="closeRecordModal"
      @save="saveRecord"
      @managePlatform="showRecordModal = false; showPlatformModal = true"
    />

    <div v-if="showImagePreviewModal" class="image-preview-modal" @click="closeImagePreview">
      <div class="image-preview-content" @click.stop>
        <button class="image-preview-close" @click.stop="closeImagePreview">✕</button>
        <img :src="previewImageUrl" alt="预览图片" class="preview-image" @click.stop="closeImagePreview" />
      </div>
    </div>

    <DialogModal
      :visible="showDeleteConfirm"
      title="删除这条记录？"
      message="删除后将立即从当前平台记录中移除，且无法自动恢复。"
      tone="danger"
      :show-cancel="true"
      confirm-text="确认删除"
      @cancel="cancelDeleteRecord"
      @confirm="confirmDeleteRecord"
    />

    <DialogModal
      :visible="noticeDialog.visible"
      :title="noticeDialog.title"
      :message="noticeDialog.message"
      :tone="noticeDialog.tone"
      @cancel="closeNotice"
      @confirm="closeNotice"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { pinyin } from 'pinyin-pro';
import PlatformModal from './components/PlatformModal.vue';
import RecordModal from './components/RecordModal.vue';
import DialogModal from './components/DialogModal.vue';
import quickerCopyIcon from './assets/icons/quicker-copy.png';
import {
  Database,
  type ColumnWidthsMap,
  type Field,
  type Platform,
  type Record as AppRecord,
} from './utils/database';

const db = new Database();
const GLOBAL_SEARCH_ENABLED_KEY = 'archiveTrail.globalSearch.enabled';
const GLOBAL_SEARCH_QUERY_KEY = 'archiveTrail.globalSearch.query';
const PLATFORM_COLUMN_KEY = '__platform__';

const platforms = ref<Platform[]>([]);
const records = ref<AppRecord[]>([]);
const currentPlatform = ref<Platform | null>(null);
const isGlobalSearchEnabled = ref(localStorage.getItem(GLOBAL_SEARCH_ENABLED_KEY) === '1');
// 全局搜索词只在当前运行期间保留，避免下次启动自动恢复上一次的关键词。
localStorage.removeItem(GLOBAL_SEARCH_QUERY_KEY);
const globalSearchQuery = ref('');
const platformSearchQueries = ref<Record<string, string>>({});
const debouncedSearchQuery = ref('');
const selectedSubcategoryIds = ref<string[]>([]);
const fontSize = ref(localStorage.getItem('fontSize') || '13');
const showPlatformModal = ref(false);
const editingPlatformId = ref<string | undefined>(undefined);
const showRecordModal = ref(false);
const editingRecord = ref<AppRecord | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const topPanelRef = ref<HTMLElement | null>(null);
const tableContainerRef = ref<HTMLElement | null>(null);
const copiedFieldKey = ref('');
const previewImageUrl = ref('');
const showImagePreviewModal = ref(false);
const showDeleteConfirm = ref(false);
const pendingDeleteRecordId = ref('');
const noticeDialog = ref<{
  visible: boolean;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
}>({
  visible: false,
  title: '提示',
  message: '',
  tone: 'info',
});
const dataDirPath = ref('');
const imageUrlCache = ref<Map<string, string>>(new Map());
const iconUrlCache = ref<Map<string, string>>(new Map());
const activeSortFieldId = ref('');
const activeSortDirection = ref<'asc' | 'desc'>('asc');
const columnWidths = ref<ColumnWidthsMap>({});
const resizingColumnId = ref('');
let topPanelResizeObserver: ResizeObserver | null = null;
let searchDebounceTimer: number | null = null;
let activeResizeState:
  | {
      platformId: string;
      columnId: string;
      startX: number;
      latestClientX: number;
      startWidth: number;
      minWidth: number;
      maxWidth: number;
      startScrollLeft: number;
    }
  | null = null;
let textMeasureContext: CanvasRenderingContext2D | null = null;
let resizeAutoScrollFrame: number | null = null;
let resizeAutoScrollDirection = 0;
let resizeAutoScrollStep = 0;

const MIN_COLUMN_WIDTHS: Record<Field['type'], number> = {
  text: 72,
  link: 120,
  number: 72,
  date: 96,
  image: 88,
};
const DEFAULT_PLATFORM_COLUMN_WIDTH = 136;
const MIN_PLATFORM_COLUMN_WIDTH = 96;
const MAX_PLATFORM_COLUMN_WIDTH = 2400;
const MAX_COLUMN_WIDTHS: Record<Field['type'], number> = {
  text: 4800,
  link: 4800,
  number: 1600,
  date: 1600,
  image: 1600,
};

function editPlatformById(platformId: string) {
  editingPlatformId.value = platformId;
  showPlatformModal.value = true;
}

const currentFields = computed(() => currentPlatform.value?.fields ?? []);

const tableMinWidth = computed(() => {
  const platformColumnWidth = getSavedPlatformColumnWidth() ?? DEFAULT_PLATFORM_COLUMN_WIDTH;
  const actionsColumnWidth = 152;
  const fieldWidths = currentFields.value.reduce((sum, field) => {
    return sum + (getSavedColumnWidth(field) ?? getDefaultColumnWidth(field));
  }, 0);
  return platformColumnWidth + actionsColumnWidth + fieldWidths;
});

function getCurrentPlatformSearchKey() {
  return currentPlatform.value?.id ?? '__empty__';
}

const activeSearchQuery = computed({
  get() {
    if (isGlobalSearchEnabled.value) {
      return globalSearchQuery.value;
    }

    return platformSearchQueries.value[getCurrentPlatformSearchKey()] ?? '';
  },
  set(value: string) {
    if (isGlobalSearchEnabled.value) {
      globalSearchQuery.value = value;
      return;
    }

    platformSearchQueries.value = {
      ...platformSearchQueries.value,
      [getCurrentPlatformSearchKey()]: value,
    };
  },
});

const pinyinSearchCache = new Map<string, { full: string; initials: string }>();

function getPinyinSearchText(value: string) {
  const cached = pinyinSearchCache.get(value);
  if (cached) return cached;

  const searchableText = {
    full: pinyin(value, {
      toneType: 'none',
      v: true,
      separator: '',
      nonZh: 'consecutive',
    }).toLowerCase(),
    initials: pinyin(value, {
      pattern: 'initial',
      toneType: 'none',
      v: true,
      type: 'array',
    }).join('').toLowerCase(),
  };

  pinyinSearchCache.set(value, searchableText);
  return searchableText;
}

function matchesSearchQuery(value: string, query: string) {
  const normalizedValue = value.toLowerCase();
  if (normalizedValue.includes(query)) return true;

  // 拼音搜索仅对包含中文的字段启用，英文/数字字段仍按原有规则匹配。
  if (!/[\u3400-\u9fff]/.test(value) || !/^[a-z0-9\s]+$/i.test(query)) return false;

  const normalizedPinyinQuery = query.replace(/\s+/g, '');
  if (!normalizedPinyinQuery) return false;

  const searchableText = getPinyinSearchText(value);
  return searchableText.full.includes(normalizedPinyinQuery)
    || searchableText.initials.includes(normalizedPinyinQuery);
}

const globalPlatformMatchCounts = computed<Record<string, number>>(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase();
  if (!isGlobalSearchEnabled.value || !query) return {};

  return platforms.value.reduce<Record<string, number>>((counts, platform) => {
    const searchableFields = platform.fields.filter(field => field.type !== 'image');
    counts[platform.id] = records.value.filter(record => {
      if (record.platformId !== platform.id) return false;
      return searchableFields.some(field =>
        matchesSearchQuery(String(getFieldValue(record, field.id)), query)
      );
    }).length;
    return counts;
  }, {});
});

function getPlatformTabTitle(platform: Platform) {
  const query = debouncedSearchQuery.value.trim();
  if (!isGlobalSearchEnabled.value || !query) return platform.name;

  const count = globalPlatformMatchCounts.value[platform.id] ?? 0;
  return count > 0
    ? `${platform.name}：命中 ${count} 条记录`
    : `${platform.name}：无匹配记录`;
}

const filteredRecords = computed(() => {
  let result = records.value;

  if (currentPlatform.value) {
    result = result.filter(record => record.platformId === currentPlatform.value?.id);
  }

  if (selectedSubcategoryIds.value.length > 0) {
    result = result.filter(record => {
      const ids = record.subcategoryIds ?? (record.subcategoryId ? [record.subcategoryId] : []);
      return selectedSubcategoryIds.value.every(id => ids.includes(id));
    });
  }

  const query = debouncedSearchQuery.value.trim().toLowerCase();
  if (query) {
    const searchableFields = currentFields.value.filter(field => field.type !== 'image');
    result = result.filter(record =>
      searchableFields.some(field => matchesSearchQuery(String(getFieldValue(record, field.id)), query))
    );
  }

  return result;
});

const displayRecords = computed(() => {
  const sortedRecords = [...filteredRecords.value].sort((a, b) => compareRecords(a, b));

  const favorites = sortedRecords
    .filter(record => record.favorite)
    .sort((a, b) => {
      const favoriteOrderDiff = (a.favoriteOrder ?? Number.MAX_SAFE_INTEGER) - (b.favoriteOrder ?? Number.MAX_SAFE_INTEGER);
      if (favoriteOrderDiff !== 0) return favoriteOrderDiff;
      return compareRecords(a, b);
    });

  const others = sortedRecords.filter(record => !record.favorite);

  return [...favorites, ...others];
});

function clearSearch() {
  activeSearchQuery.value = '';
  if (isGlobalSearchEnabled.value) {
    clearGlobalSearchQuery();
  }
}

function clearGlobalSearchQuery() {
  globalSearchQuery.value = '';
  localStorage.removeItem(GLOBAL_SEARCH_QUERY_KEY);
}

function handleGlobalSearchToggle(event: Event) {
  const enabled = event.target instanceof HTMLInputElement ? event.target.checked : false;
  const currentQuery = activeSearchQuery.value;

  if (enabled) {
    if (!globalSearchQuery.value && currentQuery) {
      globalSearchQuery.value = currentQuery;
    }
    isGlobalSearchEnabled.value = true;
    return;
  }

  isGlobalSearchEnabled.value = false;
  platformSearchQueries.value = {
    ...platformSearchQueries.value,
    [getCurrentPlatformSearchKey()]: currentQuery,
  };
  clearGlobalSearchQuery();
}

function toggleFieldSort(fieldId: string) {
  if (activeSortFieldId.value !== fieldId) {
    activeSortFieldId.value = fieldId;
    activeSortDirection.value = 'asc';
    return;
  }

  if (activeSortDirection.value === 'asc') {
    activeSortDirection.value = 'desc';
    return;
  }

  activeSortFieldId.value = '';
  activeSortDirection.value = 'asc';
}

function getSortArrow(fieldId: string) {
  if (activeSortFieldId.value !== fieldId) return '↕';
  return activeSortDirection.value === 'asc' ? '↑' : '↓';
}

function getSortArrowClass(fieldId: string) {
  return {
    active: activeSortFieldId.value === fieldId,
  };
}

function toggleSubcategory(subcategoryId: string) {
  if (currentPlatform.value?.tagMode !== 'multi') {
    selectedSubcategoryIds.value = selectedSubcategoryIds.value[0] === subcategoryId ? [] : [subcategoryId];
    return;
  }

  if (selectedSubcategoryIds.value.includes(subcategoryId)) {
    selectedSubcategoryIds.value = selectedSubcategoryIds.value.filter(id => id !== subcategoryId);
    return;
  }
  selectedSubcategoryIds.value = [...selectedSubcategoryIds.value, subcategoryId];
}

function handleHorizontalWheel(event: WheelEvent) {
  const container = event.currentTarget as HTMLElement | null;
  if (!container) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  container.scrollLeft += delta;
}

function getPlatform(platformId: string) {
  return platforms.value.find(platform => platform.id === platformId) || null;
}

function getFieldValue(record: AppRecord, fieldId: string): string | number {
  return record.values.find(value => value.fieldId === fieldId)?.value ?? '';
}

function compareRecords(a: AppRecord, b: AppRecord) {
  if (!activeSortFieldId.value) {
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  }

  const field = currentFields.value.find(item => item.id === activeSortFieldId.value);
  if (!field) {
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  }

  const aValue = getFieldValue(a, field.id);
  const bValue = getFieldValue(b, field.id);
  const direction = activeSortDirection.value === 'asc' ? 1 : -1;

  let result = 0;
  if (field.type === 'number') {
    result = Number(aValue || 0) - Number(bValue || 0);
  } else if (field.type === 'date') {
    result = new Date(String(aValue || 0)).getTime() - new Date(String(bValue || 0)).getTime();
  } else {
    result = String(aValue || '').localeCompare(String(bValue || ''), 'zh-CN');
  }

  if (result === 0) {
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  }

  return result * direction;
}

function hasFieldValue(record: AppRecord, fieldId: string) {
  return String(getFieldValue(record, fieldId)).trim() !== '';
}

function formatDateShort(value: string | number) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string) {
  const safeText = escapeHtml(text);
  const keyword = activeSearchQuery.value.trim();
  if (!keyword) return safeText;

  const escapedKeyword = escapeHtml(keyword);
  const pattern = new RegExp(escapeRegExp(escapedKeyword), 'gi');
  return safeText.replace(pattern, match => `<mark class="search-highlight">${match}</mark>`);
}

async function openExternalLink(url: string) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) return;
  try {
    await invoke('open_url', { url: normalizedUrl });
  } catch (error) {
    console.error('Failed to open URL:', error);
    showNotice(`无法打开链接：${normalizedUrl}`, '链接打开失败', 'danger');
  }
}

function showNotice(
  message: string,
  title = '提示',
  tone: 'info' | 'warning' | 'danger' | 'success' = 'danger',
) {
  noticeDialog.value = {
    visible: true,
    title,
    message,
    tone,
  };
}

function closeNotice() {
  noticeDialog.value.visible = false;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function copyFieldValue(record: AppRecord, fieldId: string) {
  const key = `${record.id}-${fieldId}`;
  const text = String(getFieldValue(record, fieldId));
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  copiedFieldKey.value = key;
  window.setTimeout(() => {
    if (copiedFieldKey.value === key) {
      copiedFieldKey.value = '';
    }
  }, 1200);
}

function showImagePreview(path: string) {
  const url = getImageUrlSync(path);
  if (!url) return;
  previewImageUrl.value = url;
  showImagePreviewModal.value = true;
}

function closeImagePreview() {
  showImagePreviewModal.value = false;
  previewImageUrl.value = '';
}

async function getDataDirPath() {
  if (dataDirPath.value) return dataDirPath.value;
  dataDirPath.value = await invoke<string>('get_data_dir_path');
  return dataDirPath.value;
}

function resolveImagePath(path: string) {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const normalized = path.replace(/\//g, '\\');
  if (normalized.startsWith('pics\\')) {
    return `${dataDirPath.value}\\${normalized}`;
  }
  return `${dataDirPath.value}\\pics\\${normalized}`;
}

function getImageUrlSync(path: string) {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const cached = imageUrlCache.value.get(path);
  if (cached) return cached;
  if (!dataDirPath.value) return '';
  const url = convertFileSrc(resolveImagePath(path));
  imageUrlCache.value.set(path, url);
  return url;
}

function isInlineImageValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/') && value.includes(';base64,');
}

function createInlineImageFileStem(record: AppRecord, fieldId: string, valueIndex: number) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${record.id}_${fieldId}_${valueIndex}_${timestamp}`;
}

async function persistInlineImageValue(record: AppRecord, fieldId: string, value: string, valueIndex: number) {
  return invoke<string>('save_inline_image', {
    dataUrl: value,
    fileStem: createInlineImageFileStem(record, fieldId, valueIndex),
  });
}

async function persistRecordInlineImages(record: AppRecord, platformList = platforms.value) {
  const platform = platformList.find(item => item.id === record.platformId);
  if (!platform) return record;

  const imageFieldIds = new Set(platform.fields.filter(field => field.type === 'image').map(field => field.id));
  if (imageFieldIds.size === 0) return record;

  let changed = false;
  const nextValues = [];
  for (let index = 0; index < record.values.length; index += 1) {
    const fieldValue = record.values[index];
    if (imageFieldIds.has(fieldValue.fieldId) && isInlineImageValue(fieldValue.value)) {
      try {
        const imagePath = await persistInlineImageValue(record, fieldValue.fieldId, fieldValue.value, index);
        nextValues.push({ ...fieldValue, value: imagePath });
        changed = true;
      } catch (error) {
        console.error('保存内嵌图片失败，已保留原始图片数据:', error);
        nextValues.push(fieldValue);
      }
    } else {
      nextValues.push(fieldValue);
    }
  }

  if (!changed) return record;
  return {
    ...record,
    values: nextValues,
  };
}

async function migrateInlineImagesToFiles() {
  let changed = false;
  const nextRecords: AppRecord[] = [];

  for (const record of records.value) {
    const nextRecord = await persistRecordInlineImages(record);
    nextRecords.push(nextRecord);
    if (nextRecord !== record) {
      changed = true;
    }
  }

  if (!changed) return;

  records.value = nextRecords;
  imageUrlCache.value.clear();
  await db.saveRecords(nextRecords);
  console.log('已将内嵌图片迁移到 pics 目录，data.json 已瘦身保存');
}

async function getPlatformIconUrl(iconPath: string) {
  if (!iconPath) return '';
  const cached = iconUrlCache.value.get(iconPath);
  if (cached) return cached;
  const dir = await getDataDirPath();
  const url = convertFileSrc(`${dir}\\${iconPath}`);
  iconUrlCache.value.set(iconPath, url);
  return url;
}

function getPlatformIconUrlSync(iconPath: string) {
  if (!iconPath) return '';
  return iconUrlCache.value.get(iconPath) || '';
}

async function hydrateAssetUrls() {
  const iconTasks = platforms.value
    .filter(platform => platform.icon)
    .map(platform => getPlatformIconUrl(platform.icon || ''));

  await Promise.allSettled(iconTasks);
}

async function loadData() {
  platforms.value = await db.getPlatforms();
  records.value = await db.getRecords();
  columnWidths.value = await db.getColumnWidths();

  const previousPlatformId = currentPlatform.value?.id;
  if (previousPlatformId) {
    currentPlatform.value = platforms.value.find(platform => platform.id === previousPlatformId) || null;
  }
  if (!currentPlatform.value && platforms.value.length > 0) {
    currentPlatform.value = platforms.value[0];
  }

  await migrateInlineImagesToFiles();
  await hydrateAssetUrls();
}

async function savePlatformsBatch(platformsToSave: Platform[], activePlatformId?: string) {
  for (const platform of platformsToSave) {
    await db.savePlatform(platform);
  }
  await loadData();

  if (activePlatformId) {
    currentPlatform.value = platforms.value.find(platform => platform.id === activePlatformId) || currentPlatform.value;
  }
}

async function deletePlatform(platformId: string) {
  await db.deletePlatform(platformId);
  await loadData();
}

function editRecord(record: AppRecord) {
  editingRecord.value = {
    ...record,
    values: record.values.map(value => ({ ...value })),
    subcategoryIds: [...(record.subcategoryIds ?? [])],
  };
  showRecordModal.value = true;
}

function closeRecordModal() {
  showRecordModal.value = false;
  editingRecord.value = null;
}

async function saveRecord(record: AppRecord) {
  const exists = records.value.some(item => item.id === record.id);
  const draftRecord: AppRecord = {
    ...record,
    values: record.values.map(value => ({ ...value })),
    subcategoryIds: [...(record.subcategoryIds ?? [])],
    updatedAt: new Date(record.updatedAt),
  };
  const nextRecord = await persistRecordInlineImages(draftRecord);

  if (exists) {
    records.value = records.value.map(item => item.id === nextRecord.id ? nextRecord : item);
    await db.updateRecord(nextRecord);
  } else {
    records.value = [...records.value, nextRecord];
    await db.addRecord(nextRecord);
  }

  closeRecordModal();

  await hydrateAssetUrls();

  // Reload once after local optimistic update so persistent data stays in sync.
  if (exists) {
    await loadData();
  }
}

function deleteRecord(recordId: string) {
  pendingDeleteRecordId.value = recordId;
  showDeleteConfirm.value = true;
}

function cancelDeleteRecord() {
  showDeleteConfirm.value = false;
  pendingDeleteRecordId.value = '';
}

async function confirmDeleteRecord() {
  if (!pendingDeleteRecordId.value) return;
  await db.deleteRecord(pendingDeleteRecordId.value);
  cancelDeleteRecord();
  await loadData();
}

function getNextFavoriteOrder() {
  const favorites = records.value.filter(record => record.favorite);
  if (favorites.length === 0) return 0;
  return Math.max(...favorites.map(record => record.favoriteOrder ?? 0)) + 1;
}

async function toggleFavorite(record: AppRecord) {
  const nextFavorite = !record.favorite;
  const nextFavoriteOrder = nextFavorite ? getNextFavoriteOrder() : undefined;

  const nextRecords = records.value.map(item => {
    if (item.id !== record.id) return item;
    return {
      ...item,
      favorite: nextFavorite,
      favoriteOrder: nextFavoriteOrder,
      updatedAt: new Date(),
    };
  });

  records.value = nextRecords;
  await db.saveRecords(nextRecords);
  await loadData();
}

function getFieldColumnClass(field: Field) {
  if (field.type === 'image') return 'col-image';
  if (field.type === 'number') return 'col-number';
  if (field.type === 'date') return 'col-date';
  if (field.type === 'link') return 'col-link';
  return 'col-text';
}

function getMinColumnWidth(field: Field) {
  return MIN_COLUMN_WIDTHS[field.type];
}

function getMaxColumnWidth(field: Field) {
  return MAX_COLUMN_WIDTHS[field.type];
}

function getDefaultColumnWidth(field: Field) {
  const defaultWidths: Record<Field['type'], number> = {
    text: 180,
    link: 260,
    number: 128,
    date: 144,
    image: 128,
  };
  return defaultWidths[field.type];
}

function clampColumnWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(Math.max(Math.round(width), minWidth), maxWidth);
}

function getSavedColumnWidth(field: Field) {
  const platformId = currentPlatform.value?.id;
  if (!platformId) return undefined;
  const width = columnWidths.value[platformId]?.[field.id];
  return typeof width === 'number' && Number.isFinite(width)
    ? clampColumnWidth(width, getMinColumnWidth(field), getMaxColumnWidth(field))
    : undefined;
}

function getSavedPlatformColumnWidth() {
  const platformId = currentPlatform.value?.id;
  if (!platformId) return undefined;
  const width = columnWidths.value[platformId]?.[PLATFORM_COLUMN_KEY];
  return typeof width === 'number' && Number.isFinite(width)
    ? clampColumnWidth(width, MIN_PLATFORM_COLUMN_WIDTH, MAX_PLATFORM_COLUMN_WIDTH)
    : undefined;
}

function getFieldColumnStyle(field: Field) {
  const savedWidth = getSavedColumnWidth(field);
  const width = savedWidth ?? getDefaultColumnWidth(field);
  return {
    width: `${width}px`,
  };
}

function getPlatformColumnStyle() {
  const width = getSavedPlatformColumnWidth() ?? DEFAULT_PLATFORM_COLUMN_WIDTH;
  return {
    width: `${width}px`,
  };
}

function setColumnWidth(platformId: string, columnId: string, width: number, minWidth: number, maxWidth: number) {
  if (!columnWidths.value[platformId]) {
    columnWidths.value = {
      ...columnWidths.value,
      [platformId]: {},
    };
  }

  columnWidths.value[platformId][columnId] = clampColumnWidth(width, minWidth, maxWidth);
}

function canResizeField(field: Field) {
  const fieldIndex = currentFields.value.findIndex(item => item.id === field.id);
  return fieldIndex >= 0;
}

function getTextMeasureContext() {
  if (textMeasureContext) return textMeasureContext;
  const canvas = document.createElement('canvas');
  textMeasureContext = canvas.getContext('2d');
  if (textMeasureContext) {
    textMeasureContext.font = '400 16px "Microsoft YaHei", "PingFang SC", sans-serif';
  }
  return textMeasureContext;
}

function measureColumnText(text: string) {
  const context = getTextMeasureContext();
  if (!context) {
    return text.length * 16;
  }
  return Math.ceil(context.measureText(text).width);
}

function getAutoFitTextWidth(texts: string[]) {
  return texts.reduce((maxWidth, text) => Math.max(maxWidth, measureColumnText(text)), 0);
}

function autoFitPlatformColumn() {
  const platformId = currentPlatform.value?.id;
  if (!platformId) return;

  const platformNames = displayRecords.value
    .map(record => getPlatform(record.platformId)?.name || '')
    .filter(Boolean);
  const textWidth = getAutoFitTextWidth(['平台', currentPlatform.value?.name || '', ...platformNames]);
  setColumnWidth(platformId, PLATFORM_COLUMN_KEY, textWidth + 72, MIN_PLATFORM_COLUMN_WIDTH, MAX_PLATFORM_COLUMN_WIDTH);
  void db.saveColumnWidths(columnWidths.value);
}

function getAutoFitFieldValue(record: AppRecord, field: Field) {
  const value = getFieldValue(record, field.id);
  if (field.type === 'image') return value ? '图片' : '-';
  if (field.type === 'date') return formatDateShort(value);
  return String(value || '-');
}

function autoFitColumn(field: Field) {
  const platformId = currentPlatform.value?.id;
  if (!platformId) return;

  const values = displayRecords.value.map(record => getAutoFitFieldValue(record, field));
  const textWidth = getAutoFitTextWidth([field.name, ...values]);
  const extraWidth = field.type === 'image' ? 48 : 72;
  setColumnWidth(platformId, field.id, textWidth + extraWidth, getMinColumnWidth(field), getMaxColumnWidth(field));
  void db.saveColumnWidths(columnWidths.value);
}

function getRenderedHeaderWidth(headerElement: Element | null, fallbackField: Field) {
  if (headerElement instanceof HTMLElement && headerElement.offsetWidth > 0) {
    return headerElement.offsetWidth;
  }

  return getSavedColumnWidth(fallbackField) ?? getDefaultColumnWidth(fallbackField);
}

function getRenderedPlatformHeaderWidth(headerElement: Element | null) {
  if (headerElement instanceof HTMLElement && headerElement.offsetWidth > 0) {
    return headerElement.offsetWidth;
  }

  return getSavedPlatformColumnWidth() ?? DEFAULT_PLATFORM_COLUMN_WIDTH;
}

function startPlatformColumnResize(event: MouseEvent) {
  const platformId = currentPlatform.value?.id;
  if (!platformId) return;

  const currentHeader = (event.currentTarget as HTMLElement | null)?.closest('th');
  activeResizeState = {
    platformId,
    columnId: PLATFORM_COLUMN_KEY,
    startX: event.clientX,
    latestClientX: event.clientX,
    startWidth: getRenderedPlatformHeaderWidth(currentHeader ?? null),
    minWidth: MIN_PLATFORM_COLUMN_WIDTH,
    maxWidth: MAX_PLATFORM_COLUMN_WIDTH,
    startScrollLeft: tableContainerRef.value?.scrollLeft ?? 0,
  };
  resizingColumnId.value = PLATFORM_COLUMN_KEY;
  document.body.classList.add('column-resizing');
  window.addEventListener('mousemove', handleColumnResizeMove);
  window.addEventListener('mouseup', handleColumnResizeEnd);
}

function startColumnResize(field: Field, event: MouseEvent) {
  const platformId = currentPlatform.value?.id;
  const fieldIndex = currentFields.value.findIndex(item => item.id === field.id);
  if (!platformId || fieldIndex < 0) return;

  const currentHeader = (event.currentTarget as HTMLElement | null)?.closest('th');

  activeResizeState = {
    platformId,
    columnId: field.id,
    startX: event.clientX,
    latestClientX: event.clientX,
    startWidth: getRenderedHeaderWidth(currentHeader ?? null, field),
    minWidth: getMinColumnWidth(field),
    maxWidth: getMaxColumnWidth(field),
    startScrollLeft: tableContainerRef.value?.scrollLeft ?? 0,
  };
  resizingColumnId.value = field.id;
  document.body.classList.add('column-resizing');
  window.addEventListener('mousemove', handleColumnResizeMove);
  window.addEventListener('mouseup', handleColumnResizeEnd);
}

function handleColumnResizeMove(event: MouseEvent) {
  if (!activeResizeState) return;

  activeResizeState.latestClientX = event.clientX;
  applyColumnResizeFromClientX(event.clientX);
  updateResizeAutoScroll(event.clientX);
}

function applyColumnResizeFromClientX(clientX: number) {
  if (!activeResizeState) return;

  activeResizeState.latestClientX = clientX;
  const scrollDelta = (tableContainerRef.value?.scrollLeft ?? activeResizeState.startScrollLeft) - activeResizeState.startScrollLeft;
  const rawDelta = clientX - activeResizeState.startX + scrollDelta;
  const minDelta = activeResizeState.minWidth - activeResizeState.startWidth;
  const maxDelta = activeResizeState.maxWidth - activeResizeState.startWidth;
  const boundedDelta = Math.min(Math.max(rawDelta, minDelta), maxDelta);
  const nextCurrentWidth = activeResizeState.startWidth + boundedDelta;

  setColumnWidth(
    activeResizeState.platformId,
    activeResizeState.columnId,
    nextCurrentWidth,
    activeResizeState.minWidth,
    activeResizeState.maxWidth
  );
}

function updateResizeAutoScroll(clientX: number) {
  const container = tableContainerRef.value;
  if (!container) {
    stopResizeAutoScroll();
    return;
  }

  const rect = container.getBoundingClientRect();
  const edgeSize = 80;
  const maxStep = 34;

  if (clientX > rect.right - edgeSize) {
    const ratio = Math.min(1, (clientX - (rect.right - edgeSize)) / edgeSize);
    resizeAutoScrollDirection = 1;
    resizeAutoScrollStep = Math.ceil(maxStep * ratio);
    scheduleResizeAutoScroll();
    return;
  }

  if (clientX < rect.left + edgeSize) {
    const ratio = Math.min(1, ((rect.left + edgeSize) - clientX) / edgeSize);
    resizeAutoScrollDirection = -1;
    resizeAutoScrollStep = Math.ceil(maxStep * ratio);
    scheduleResizeAutoScroll();
    return;
  }

  stopResizeAutoScroll();
}

function scheduleResizeAutoScroll() {
  if (resizeAutoScrollFrame !== null) return;
  resizeAutoScrollFrame = window.requestAnimationFrame(runResizeAutoScroll);
}

function runResizeAutoScroll() {
  resizeAutoScrollFrame = null;

  if (!activeResizeState || resizeAutoScrollDirection === 0 || resizeAutoScrollStep <= 0) return;

  const container = tableContainerRef.value;
  if (!container) {
    stopResizeAutoScroll();
    return;
  }

  const previousScrollLeft = container.scrollLeft;
  container.scrollLeft += resizeAutoScrollDirection * resizeAutoScrollStep;

  if (container.scrollLeft !== previousScrollLeft) {
    applyColumnResizeFromClientX(activeResizeState.latestClientX);
  }

  scheduleResizeAutoScroll();
}

function stopResizeAutoScroll() {
  resizeAutoScrollDirection = 0;
  resizeAutoScrollStep = 0;
  if (resizeAutoScrollFrame !== null) {
    window.cancelAnimationFrame(resizeAutoScrollFrame);
    resizeAutoScrollFrame = null;
  }
}

function cleanupColumnResize() {
  stopResizeAutoScroll();
  activeResizeState = null;
  resizingColumnId.value = '';
  document.body.classList.remove('column-resizing');
  window.removeEventListener('mousemove', handleColumnResizeMove);
  window.removeEventListener('mouseup', handleColumnResizeEnd);
}

function handleColumnResizeEnd() {
  if (!activeResizeState) return;

  cleanupColumnResize();
  void db.saveColumnWidths(columnWidths.value);
}

function getFieldHeaderClass(field: Field) {
  return `th-${field.type}`;
}

function getFieldCellClass(field: Field) {
  return `td-${field.type}`;
}

function applyZoom() {
  const baseSize = 13;
  document.documentElement.style.fontSize = `${(Number(fontSize.value) / baseSize) * 16}px`;
}

function syncTopPanelHeight() {
  const height = topPanelRef.value?.offsetHeight ?? 0;
  document.documentElement.style.setProperty('--top-panel-height', `${height}px`);
}

watch(activeSearchQuery, value => {
  if (searchDebounceTimer !== null) {
    window.clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = window.setTimeout(() => {
    debouncedSearchQuery.value = value;
    searchDebounceTimer = null;
  }, 100);
}, { immediate: true });

watch(isGlobalSearchEnabled, enabled => {
  localStorage.setItem(GLOBAL_SEARCH_ENABLED_KEY, enabled ? '1' : '0');
});

watch(globalSearchQuery, value => {
  if (!value) {
    localStorage.removeItem(GLOBAL_SEARCH_QUERY_KEY);
  }
});

watch(fontSize, value => {
  localStorage.setItem('fontSize', value);
  applyZoom();
  nextTick(syncTopPanelHeight);
});

watch(currentPlatform, (platform, previousPlatform) => {
  if (platform?.id !== previousPlatform?.id) {
    selectedSubcategoryIds.value = [];
    nextTick(syncTopPanelHeight);
    return;
  }

  if (platform?.tagMode !== 'multi') {
    selectedSubcategoryIds.value = selectedSubcategoryIds.value.slice(0, 1);
  }
  nextTick(syncTopPanelHeight);
});

onMounted(async () => {
  await getDataDirPath();
  await loadData();
  applyZoom();
  await nextTick();
  syncTopPanelHeight();

  if (topPanelRef.value && typeof ResizeObserver !== 'undefined') {
    topPanelResizeObserver = new ResizeObserver(() => {
      syncTopPanelHeight();
    });
    topPanelResizeObserver.observe(topPanelRef.value);
  }

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    }
  });
});

onBeforeUnmount(() => {
  cleanupColumnResize();
  topPanelResizeObserver?.disconnect();
  if (searchDebounceTimer !== null) {
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
});
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8fafc;
  color: var(--text-color);
}

.top-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  flex-shrink: 0;
  width: 100%;
  background: #ffffff;
  box-shadow: 0 1px 0 rgba(226, 232, 240, 0.95);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 32px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.app-brand-icon {
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  display: block;
  object-fit: contain;
  border-radius: 0.62rem;
}

.header h1 {
  font-size: 1.7rem;
  font-weight: 600;
  color: var(--text-color);
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 10px 32px 10px;
  background: #ffffff;
}

.platform-row {
  display: flex;
  justify-content: center;
  width: 100%;
}

.platform-tabs {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.8rem;
  padding: 0.55rem 1rem;
  border: 2px solid var(--border-color);
  background: #ffffff;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.tab-btn:hover {
  background: #f1f5f9;
}

.tab-btn.active {
  color: var(--primary-color);
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tab-btn.has-search-matches:not(.active) {
  color: #b45309;
  border-color: #f59e0b;
  background: #fffbeb;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.tab-btn.has-search-matches:not(.active):hover {
  background: #fef3c7;
}

.tab-match-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.tab-btn.active .tab-match-count {
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary-color);
}

.add-platform {
  width: 2.8rem;
  padding: 0;
  justify-content: center;
}

.platform-icon-tab,
.platform-icon {
  width: 1.45rem;
  height: 1.45rem;
  object-fit: contain;
}

.filter-panel {
  width: 100%;
}

.filter-panel-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.4rem;
  width: 100%;
}

.subcategory-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  gap: 0.45rem;
}

.subcategory-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  justify-content: center;
  width: 100%;
}

.subcategory-group-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.8rem;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
}

.subcategory-group-main-plain {
  grid-template-columns: minmax(0, 1fr);
}

.group-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5rem;
  padding: 0.45rem 0.8rem;
  border-radius: 12px;
  background: #eef4ff;
  border: 1px solid #d9e6ff;
  color: #315ea8;
  font-size: 0.92rem;
  white-space: nowrap;
  font-weight: 700;
}

.subcategory-tabs {
  display: flex;
  gap: 0.45rem;
  flex-wrap: nowrap;
}

.subcategory-scrollable {
  max-width: min(980px, calc(100vw - 360px));
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding: 0.1rem 0.1rem 0.25rem;
  scrollbar-width: none;
}

.subcategory-scrollable::-webkit-scrollbar {
  display: none;
}

.sub-tab {
  padding: 0.5rem 0.95rem;
  border: 1px solid #dbe5f2;
  background: white;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.92rem;
  color: #334155;
  font-weight: 500;
  transition: all 0.2s;
}

.sub-tab:hover {
  background: #f8fbff;
}

.sub-tab.active {
  background: linear-gradient(135deg, #eef4ff 0%, #dce9ff 100%);
  color: #2563eb;
  border-color: #7aa9f8;
}

.sub-tab-reset {
  color: #ef4444;
  border-color: #fca5a5;
}

.meta-row {
  display: grid;
  grid-template-columns: 12rem minmax(18rem, 1fr) auto;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.stats {
  min-width: 0;
}

.stat-item {
  font-size: 0.92rem;
  color: var(--text-secondary);
}

.meta-search {
  display: flex;
  justify-content: center;
  min-width: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 40rem;
  min-height: 3rem;
  padding: 0 0.85rem 0 1rem;
  border: 1px solid var(--primary-color);
  border-radius: 0.7rem;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid #60a5fa;
  border-radius: 50%;
  flex: 0 0 0.9rem;
}

.search-box input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: none !important;
  background: transparent;
  box-shadow: none !important;
  outline: none;
  font-size: 1rem;
}

.search-clear {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
}

.global-search-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  min-height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid #dbeafe;
  border-radius: 0.55rem;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.global-search-toggle:hover {
  background: #f8fbff;
}

.global-search-toggle.active {
  border-color: #60a5fa;
  background: #eff6ff;
  color: #2563eb;
}

.global-search-toggle input {
  width: 0.9rem;
  height: 0.9rem;
  margin: 0;
  accent-color: var(--primary-color);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.font-size-select {
  padding: 0.5rem 0.65rem;
  font-size: 0.92rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: white;
}

.main {
  flex: 1;
  padding: calc(var(--top-panel-height, 0px) + 12px) 32px 24px;
}

.table-container {
  margin-top: 0.8rem;
  background: white;
  border-radius: 1rem;
  border: 1px solid #e9eef7;
  overflow-x: auto;
  overflow-y: hidden;
}

.record-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.record-table th,
.record-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 1rem;
  text-align: left;
  vertical-align: middle;
}

.record-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text-secondary);
  background: #ffffff;
  user-select: none;
}

.column-resizable {
  position: relative;
}

.column-resizable.is-resizing {
  background: #f8fbff;
}

.th-content {
  display: flex;
  align-items: center;
  min-width: 0;
  padding-right: 0.9rem;
}

.th-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-header-btn {
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  max-width: 100%;
  cursor: pointer;
}

.sort-arrow {
  color: #94a3b8;
  font-size: 0.9em;
  transition: color 0.2s ease;
}

.sort-arrow.active {
  color: #7c3aed;
}

.col-platform {
  width: 8.5rem;
}

.col-text {
  width: auto;
}

.col-link {
  width: 16rem;
}

.col-number {
  width: 8rem;
}

.col-date {
  width: 9rem;
}

.col-image {
  width: 8rem;
}

.col-actions {
  width: 9.5rem;
}

.platform-cell {
  white-space: nowrap;
}

.platform-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.td-number,
.td-date,
.td-image,
.actions-cell {
  text-align: center;
}

.field-value {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  width: 100%;
}

.field-type-link,
.field-type-text {
  max-width: 100%;
  width: 100%;
}

.text-field,
.date-field {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted-text {
  color: #94a3b8;
}

.image-cell {
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.table-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}

.link-field,
.image-preview-trigger,
.copy-btn {
  border: none;
  background: transparent;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.95rem;
}

.link-field,
.image-preview-trigger {
  text-align: left;
}

.link-field {
  display: block;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-resize-handle {
  position: absolute;
  top: 0;
  right: -11px;
  width: 22px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
  z-index: 6;
  border-radius: 6px;
  transition: background-color 0.18s ease;
}

.column-resize-handle::before {
  content: '';
  position: absolute;
  top: 16%;
  bottom: 16%;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: transparent;
  transition: background 0.18s ease;
}

.column-resize-handle:hover,
.column-resizable.is-resizing .column-resize-handle {
  background: rgba(96, 165, 250, 0.08);
}

.column-resizable:hover .column-resize-handle::before,
.column-resize-handle:hover::before,
.column-resizable.is-resizing .column-resize-handle::before {
  background: #60a5fa;
}

:global(body.column-resizing) {
  cursor: col-resize;
  user-select: none;
}

:global(body.column-resizing *) {
  cursor: col-resize !important;
}

.copy-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.copy-btn.copied {
  color: #16a34a;
}

.copy-image-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  display: block;
}

.copy-check-icon {
  width: 12px;
  height: 7px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg) translateY(-1px);
}

:deep(.search-highlight) {
  background: rgba(167, 139, 250, 0.28);
  color: #5b21b6;
  padding: 0 2px;
  border-radius: 4px;
  font-weight: 600;
}

.actions-cell {
  white-space: nowrap;
}

.action-buttons {
  display: inline-flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}

.btn-icon {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  border-radius: 0.45rem;
  transition: all 0.18s ease;
}

.btn-edit:hover {
  background: #dbeafe;
}

.btn-favorite {
  color: #94a3b8;
}

.btn-favorite.active {
  color: #f59e0b;
}

.btn-favorite:hover {
  background: #fef3c7;
}

.btn-delete {
  color: #ef4444;
  font-size: 1.05rem;
}

.btn-delete:hover {
  background: #fee2e2;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.btn-large {
  padding: 0.85rem 1.4rem;
  font-size: 1rem;
}

.image-preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.image-preview-content {
  position: relative;
  max-width: 92vw;
  max-height: 92vh;
}

.image-preview-close {
  position: absolute;
  top: -42px;
  right: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: #ffffff;
  cursor: pointer;
}

.preview-image {
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 12px;
  object-fit: contain;
}

.toast-message {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 1400;
  max-width: min(80vw, 420px);
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  color: #ffffff;
  font-size: 0.95rem;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.24);
  backdrop-filter: blur(8px);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 1200px) {
  .meta-row {
    grid-template-columns: 1fr;
  }

  .stats,
  .actions {
    justify-content: flex-start;
  }

  .meta-search {
    justify-content: stretch;
  }

  .search-box {
    max-width: none;
  }
}

@media (max-width: 900px) {
  .header,
  .toolbar,
  .main {
    padding-left: 16px;
    padding-right: 16px;
  }

  .record-table th,
  .record-table td {
    padding: 0.85rem 0.7rem;
  }

}
</style>
