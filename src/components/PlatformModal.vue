<template>
  <div
    class="modal-overlay"
    @mousedown.self="handleOverlayPointerDown"
    @mouseup.self="handleOverlayPointerUp"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚙️ 平台管理</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <!-- 平台列表 -->
        <div class="platform-list">
          <div class="list-header">
            <span>平台列表</span>
            <button class="btn-new" @click="createNewPlatform">➕ 新建</button>
          </div>
          <div class="list-content">
            <div
              v-for="platform in draftPlatforms"
              :key="platform.id"
              class="platform-item"
              @click="selectPlatform(platform.id)"
              :class="{ active: editingPlatform?.id === platform.id }"
            >
              <span class="platform-name">{{ getPlatformDisplayName(platform) }}</span>
              <span v-if="isPlatformDirty(platform.id)" class="draft-badge">未保存</span>
              <button class="delete-btn" @click.stop="confirmDelete(platform.id)" title="删除">✕</button>
            </div>
            <div v-if="draftPlatforms.length === 0" class="empty-list">
              暂无平台，点击上方按钮创建
            </div>
          </div>
        </div>

        <!-- 编辑表单 -->
        <div class="edit-form">
          <h3>{{ isExistingPlatform ? '✏️ 编辑平台' : '➕ 新建平台' }}</h3>

          <div class="form-group">
            <label>平台名称 <span class="required">*</span></label>
            <input
              v-model="editingPlatform.name"
              type="text"
              placeholder="请输入平台名称"
              maxlength="30"
            />
          </div>

          <div class="form-group">
            <label>标签模式</label>
            <div class="tag-mode-options">
              <label class="tag-mode-option" :class="{ active: editingPlatform.tagMode === 'single' }">
                <input v-model="editingPlatform.tagMode" type="radio" value="single" />
                单选标签
              </label>
              <label class="tag-mode-option" :class="{ active: editingPlatform.tagMode === 'multi' }">
                <input v-model="editingPlatform.tagMode" type="radio" value="multi" />
                多选标签
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>记录标签选择方式</label>
            <div class="tag-mode-options">
              <label class="tag-mode-option" :class="{ active: editingPlatform.recordTagMode === 'single' }">
                <input v-model="editingPlatform.recordTagMode" type="radio" value="single" />
                记录内单选
              </label>
              <label class="tag-mode-option" :class="{ active: editingPlatform.recordTagMode === 'multi' }">
                <input v-model="editingPlatform.recordTagMode" type="radio" value="multi" />
                记录内多选
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="section-header-inline section-header-split">
              <div class="section-title-block">
                <label>标签管理 <span class="hint">（先添加标签，再在标签下添加标签值）</span></label>
                <div class="hint sub-hint">标签值会横向排列，排不下自动换行；移入某个标签值可直接删除</div>
              </div>
              <button class="btn btn-secondary btn-add-subcategory" @click="addTagGroup">
                ➕ 添加标签
              </button>
            </div>
            <div v-if="tagSections.length > 0" class="tag-board">
              <div
                v-for="section in tagSections"
                :key="section.id"
                class="tag-group-card"
                :class="{
                  'is-ungrouped': section.isUngrouped,
                  'is-duplicate': section.group && duplicateTagGroupNames.has(normalizeName(section.group.name))
                }"
              >
                <div class="tag-group-card-header">
                  <div class="tag-group-main">
                    <span class="tag-group-dot"></span>
                    <input
                      v-if="section.group"
                      :ref="el => registerTagGroupInput(section.group!.id, el)"
                      v-model="section.group.name"
                      type="text"
                      placeholder="标签名称"
                      class="tag-group-title-input"
                      :style="getTagGroupInputStyle(section.group.name)"
                      @blur="handleTagGroupBlur(section.group.id)"
                    />
                    <span v-else class="tag-group-static-title">{{ section.name }}</span>
                    <span class="tag-section-count">{{ section.tags.length }}</span>
                  </div>
                  <div class="tag-group-actions">
                    <button class="btn btn-secondary btn-add-inline" @click="addSubcategory(section.groupId)">
                      ➕ 添加标签值
                    </button>
                    <button
                      v-if="section.group"
                      class="btn-icon btn-delete-subcategory"
                      @click="removeTagGroup(section.group.id)"
                      title="删除标签"
                    >✕</button>
                  </div>
                </div>

                <div v-if="section.tags.length > 0" class="tag-value-wrap">
                  <div
                    v-for="subcategory in section.tags"
                    :key="subcategory.id"
                    class="tag-value-chip"
                    :class="{ 'is-duplicate': duplicateTagNames.has(normalizeName(subcategory.name)) }"
                  >
                    <input
                      :ref="el => registerTagValueInput(subcategory.id, el)"
                      v-model="subcategory.name"
                      placeholder="标签值"
                      class="tag-value-input"
                      :style="getTagValueInputStyle(subcategory.name)"
                      @blur="handleSubcategoryBlur(subcategory.id)"
                    />
                    <button
                      class="tag-value-remove"
                      @click="removeSubcategory(subcategory.id)"
                      title="删除标签值"
                    >✕</button>
                  </div>
                </div>

                <div v-else class="empty-section">
                  这个标签下还没有标签值，点击右上角添加
                </div>
              </div>
            </div>
            <div v-else class="empty-list">
              先添加一个标签，再给它添加标签值
            </div>
            <div v-if="duplicateTagGroupNames.size > 0 || duplicateTagNames.size > 0" class="duplicate-tip">
              <span v-if="duplicateTagGroupNames.size > 0">重复标签：{{ [...duplicateTagGroupNames].join('、') }}</span>
              <span v-if="duplicateTagGroupNames.size > 0 && duplicateTagNames.size > 0">；</span>
              <span v-if="duplicateTagNames.size > 0">重复标签值：{{ [...duplicateTagNames].join('、') }}</span>
              <span>，保存前请改成唯一名称</span>
            </div>
          </div>

          <hr class="section-divider" />

          <div class="form-group">
            <label>列表展示字段 <span class="hint">（拖动可排序）</span></label>
            <div class="field-list">
              <draggable
                :list="editingPlatform.fields"
                item-key="id"
                class="field-sorter"
                :class="{ 'is-sorting': isSortingFields }"
                handle=".field-drag-handle"
                animation="220"
                ghost-class="field-ghost"
                drag-class="field-dragging"
                chosen-class="field-chosen"
                fallback-class="field-fallback"
                :force-fallback="true"
                :fallback-on-body="false"
                :fallback-tolerance="8"
                :delay="0"
                :touch-start-threshold="5"
                @start="handleFieldSortStart"
                @end="handleFieldSortEnd"
              >
                <template #item="{ element: field }">
                  <div class="field-item" :data-field-id="field.id">
                    <span class="drag-handle field-drag-handle" title="拖动排序">⋮⋮</span>
                    <input
                      :ref="el => registerFieldNameInput(field.id, el)"
                      v-model="field.name"
                      placeholder="字段名称"
                      class="field-name"
                      :style="getFieldNameInputStyle(field.name)"
                    />
                    <select v-model="field.type" class="field-type">
                      <option value="text">📝 文本</option>
                      <option value="link">🔗 链接</option>
                      <option value="number">🔢 数字</option>
                      <option value="date">📅 日期</option>
                      <option value="image">🖼️ 图片</option>
                    </select>
                    <div class="field-options">
                      <label class="field-required-label">
                        <input type="checkbox" v-model="field.required" />
                        <span class="field-checkbox-indicator" aria-hidden="true"></span>
                        <span class="field-required-text">必填</span>
                      </label>
                      <label class="field-required-label">
                        <input type="checkbox" v-model="field.sortable" />
                        <span class="field-checkbox-indicator" aria-hidden="true"></span>
                        <span class="field-required-text">可排序</span>
                      </label>
                      <label class="field-required-label">
                        <input type="checkbox" v-model="field.showCopyIcon" />
                        <span class="field-checkbox-indicator" aria-hidden="true"></span>
                        <span class="field-required-text">显示复制</span>
                      </label>
                    </div>
                    <button class="btn-icon btn-delete-field" @click="removeField(field.id)" title="删除字段">✕</button>
                  </div>
                </template>
              </draggable>
              <button class="btn btn-secondary btn-add-field" @click="addField">
                ➕ 添加字段
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <span v-if="dirtyCount > 0" class="save-summary">当前有 {{ dirtyCount }} 个平台改动未保存</span>
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">💾 保存</button>
      </div>
    </div>

    <div v-if="deleteTagGroupDialog.visible" class="confirm-overlay" @click.self="cancelDeleteTagGroup">
      <div class="confirm-card">
        <div class="confirm-title">删除标签确认</div>
        <div class="confirm-body">
          {{ deleteTagGroupDialog.message }}
        </div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancelDeleteTagGroup">取消</button>
          <button class="btn btn-danger" @click="confirmDeleteTagGroup">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import type { Platform } from '../utils/database';

const props = defineProps<{
  platforms: Platform[];
  initialPlatformId?: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [platforms: Platform[], activePlatformId?: string];
  delete: [platformId: string];
}>();

const draftPlatforms = ref<Platform[]>([]);
const editingPlatform = ref<Platform>(createEmptyPlatform(''));
const isSortingFields = ref(false);
const sourceSnapshots = ref<Record<string, string>>({});
const dirtyPlatformIds = ref<string[]>([]);
const isSyncingDrafts = ref(false);
const tagGroupInputRefs = ref<Record<string, HTMLInputElement | null>>({});
const tagValueInputRefs = ref<Record<string, HTMLInputElement | null>>({});
const fieldNameInputRefs = ref<Record<string, HTMLInputElement | null>>({});
const pendingTagGroupIds = ref<Set<string>>(new Set());
const pendingTagValueIds = ref<Set<string>>(new Set());
const shouldCloseOnOverlayMouseUp = ref(false);
const deleteTagGroupDialog = ref({
  visible: false,
  groupId: '',
  message: '',
});
const inputMeasureFonts = {
  tagGroup: '600 14px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
  tagValue: '400 14px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
  fieldName: '400 14px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
} as const;
let inputMeasureContext: CanvasRenderingContext2D | null = null;
const isExistingPlatform = computed(() => Boolean(sourceSnapshots.value[editingPlatform.value.id]));
const dirtyCount = computed(() => dirtyPlatformIds.value.length);
type TagSection = {
  id: string;
  name: string;
  groupId?: string;
  isUngrouped: boolean;
  group?: NonNullable<Platform['tagGroups']>[number];
  tags: Platform['subcategories'];
};

const tagSections = computed<TagSection[]>(() => {
  const groups = editingPlatform.value.tagGroups || [];
  const subcategories = editingPlatform.value.subcategories || [];
  const groupedSections: TagSection[] = groups.map(group => ({
    id: group.id,
    name: group.name.trim() || '未命名分类',
    groupId: group.id,
    isUngrouped: false,
    group,
    tags: subcategories.filter(subcategory => subcategory.groupId === group.id),
  }));
  const ungroupedTags = subcategories.filter(subcategory => {
    return !subcategory.groupId || !groups.some(group => group.id === subcategory.groupId);
  });
  if (ungroupedTags.length > 0 || groupedSections.length === 0) {
    groupedSections.push({
      id: 'ungrouped',
      name: '未分组',
      groupId: undefined,
      isUngrouped: true,
      group: undefined,
      tags: ungroupedTags,
    });
  }
  return groupedSections;
});
const duplicateTagGroupNames = computed(() => {
  const counts = new Map<string, number>();
  for (const group of editingPlatform.value.tagGroups || []) {
    const normalized = normalizeName(group.name);
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
});
const duplicateTagNames = computed(() => {
  const counts = new Map<string, number>();
  for (const subcategory of editingPlatform.value.subcategories) {
    const normalized = normalizeName(subcategory.name);
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
});

function createEmptyPlatform(id?: string): Platform {
  return {
    id: id ?? crypto.randomUUID(),
    name: '',
    color: '#3b82f6',
    icon: '',
    fields: [],
    subcategories: [],
    tagGroups: [],
    tagMode: 'single',
    recordTagMode: 'single',
    createdAt: new Date(),
  };
}

function clonePlatform(platform: Platform): Platform {
  return {
    ...platform,
    createdAt: new Date(platform.createdAt),
    fields: platform.fields.map(field => ({ ...field })),
    subcategories: (platform.subcategories || []).map(subcategory => ({ ...subcategory })),
    tagGroups: (platform.tagGroups || []).map(group => ({ ...group })),
    tagMode: platform.tagMode ?? 'single',
    recordTagMode: platform.recordTagMode ?? 'single',
  };
}

function getPlatformDisplayName(platform: Platform) {
  return platform.name.trim() || '未命名平台';
}

function handleOverlayPointerDown() {
  shouldCloseOnOverlayMouseUp.value = true;
}

function handleOverlayPointerUp() {
  if (!shouldCloseOnOverlayMouseUp.value) return;
  shouldCloseOnOverlayMouseUp.value = false;
  emit('close');
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function registerTagGroupInput(groupId: string, element: unknown) {
  tagGroupInputRefs.value[groupId] = element as HTMLInputElement | null;
}

function registerTagValueInput(subcategoryId: string, element: unknown) {
  tagValueInputRefs.value[subcategoryId] = element as HTMLInputElement | null;
}

function registerFieldNameInput(fieldId: string, element: unknown) {
  fieldNameInputRefs.value[fieldId] = element as HTMLInputElement | null;
}

function focusInput(target: HTMLInputElement | null | undefined) {
  if (!target) return;
  target.focus();
  target.select();
}

function getInputMeasureContext() {
  if (inputMeasureContext) {
    return inputMeasureContext;
  }
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  inputMeasureContext = canvas.getContext('2d');
  return inputMeasureContext;
}

function measureInputWidth(
  value: string,
  placeholder: string,
  font: string,
  {
    min,
    max,
    extra = 0,
  }: {
    min: number;
    max: number;
    extra?: number;
  },
) {
  const context = getInputMeasureContext();
  const text = value.trim() || placeholder;
  if (!context) {
    return Math.max(min, Math.min(max, text.length * 16 + extra));
  }
  context.font = font;
  const measuredWidth = Math.ceil(context.measureText(text).width) + extra;
  return Math.max(min, Math.min(max, measuredWidth));
}

function getTagValueInputStyle(value: string) {
  const width = measureInputWidth(value, '标签值', inputMeasureFonts.tagValue, {
    min: 8,
    max: 420,
    extra: 2,
  });
  return { width: `${width}px` };
}

function getTagGroupInputStyle(value: string) {
  const width = measureInputWidth(value, '标签名称', inputMeasureFonts.tagGroup, {
    min: 62,
    max: 520,
    extra: 24,
  });
  return { width: `${width}px` };
}

function getFieldNameInputStyle(value: string) {
  const width = measureInputWidth(value, '字段名称', inputMeasureFonts.fieldName, {
    min: 56,
    max: 360,
    extra: 24,
  });
  return { width: `${width}px` };
}

function serializePlatform(platform: Platform) {
  return JSON.stringify({
    ...platform,
    createdAt: new Date(platform.createdAt).toISOString(),
  });
}

function isPlatformMeaningful(platform: Platform) {
  return Boolean(
    platform.name.trim()
    || platform.fields.some(field => field.name.trim() || field.defaultValue?.trim())
    || platform.subcategories.some(subcategory => subcategory.name.trim())
    || (platform.tagGroups || []).some(group => group.name.trim())
  );
}

function sanitizePlatform(platform: Platform): Platform {
  const tagGroups = (platform.tagGroups || [])
    .map(group => ({
      id: group.id,
      name: group.name.trim(),
    }))
    .filter(group => group.name !== '');

  const validGroupIds = new Set(tagGroups.map(group => group.id));
  const subcategories = (platform.subcategories || [])
    .map(subcategory => ({
      id: subcategory.id,
      name: subcategory.name.trim(),
      groupId: subcategory.groupId && validGroupIds.has(subcategory.groupId) ? subcategory.groupId : undefined,
    }))
    .filter(subcategory => subcategory.name !== '');

  const fields = platform.fields
    .map(field => ({
      ...field,
      name: field.name.trim(),
      defaultValue: field.defaultValue?.trim() || '',
      required: Boolean(field.required),
      showCopyIcon: Boolean(field.showCopyIcon),
    }))
    .filter(field => field.name !== '');

  return {
    ...platform,
    name: platform.name.trim(),
    color: platform.color || '#3b82f6',
    icon: platform.icon || '',
    fields,
    subcategories,
    tagGroups,
    tagMode: platform.tagMode || 'single',
    recordTagMode: platform.recordTagMode || 'single',
    createdAt: platform.createdAt || new Date(),
  };
}

function syncDirtyPlatformIds() {
  const nextDirtyIds = draftPlatforms.value
    .filter(platform => {
      const sanitized = sanitizePlatform(platform);
      const sourceSnapshot = sourceSnapshots.value[platform.id];
      if (sourceSnapshot) {
        return serializePlatform(sanitized) !== sourceSnapshot;
      }
      return isPlatformMeaningful(sanitized);
    })
    .map(platform => platform.id);
  dirtyPlatformIds.value = nextDirtyIds;
}

function isPlatformDirty(platformId: string) {
  return dirtyPlatformIds.value.includes(platformId);
}

function syncDraftPlatforms(newPlatforms: Platform[]) {
  isSyncingDrafts.value = true;

  const currentDraftMap = new Map(draftPlatforms.value.map(platform => [platform.id, platform]));
  const previousSourceIds = new Set(Object.keys(sourceSnapshots.value));
  const nextSourceSnapshots: Record<string, string> = {};

  const nextDrafts = newPlatforms.map(platform => {
    const snapshot = serializePlatform(sanitizePlatform(clonePlatform(platform)));
    nextSourceSnapshots[platform.id] = snapshot;
    if (isPlatformDirty(platform.id)) {
      return currentDraftMap.get(platform.id) || clonePlatform(platform);
    }
    return clonePlatform(platform);
  });

  for (const draft of draftPlatforms.value) {
    const isLocalDraft = !previousSourceIds.has(draft.id) && !nextSourceSnapshots[draft.id];
    if (isLocalDraft) {
      nextDrafts.push(draft);
    }
  }

  draftPlatforms.value = nextDrafts;
  sourceSnapshots.value = nextSourceSnapshots;

  if (editingPlatform.value.id) {
    const currentDraft = draftPlatforms.value.find(platform => platform.id === editingPlatform.value.id);
    if (currentDraft) {
      editingPlatform.value = currentDraft;
    }
  }

  if (!draftPlatforms.value.some(platform => platform.id === editingPlatform.value.id)) {
    const preferredId = props.initialPlatformId && draftPlatforms.value.some(platform => platform.id === props.initialPlatformId)
      ? props.initialPlatformId
      : draftPlatforms.value[0]?.id;

    if (preferredId) {
      selectPlatform(preferredId);
    } else {
      editingPlatform.value = createEmptyPlatform('');
    }
  }

  syncDirtyPlatformIds();
  isSyncingDrafts.value = false;
}

function handleFieldSortStart() {
  isSortingFields.value = true;
}

function handleFieldSortEnd() {
  isSortingFields.value = false;
}

// 监听platforms变化，初始化编辑平台
watch(() => props.platforms, (newPlatforms) => {
  syncDraftPlatforms(newPlatforms);
}, { immediate: true });

watch(draftPlatforms, () => {
  if (isSyncingDrafts.value) {
    return;
  }
  syncDirtyPlatformIds();
}, { deep: true });

// 创建新平台
function createNewPlatform() {
  const newPlatform = createEmptyPlatform();
  draftPlatforms.value.unshift(newPlatform);
  editingPlatform.value = newPlatform;
  syncDirtyPlatformIds();
}

function getFirstTagGroupId(platform = editingPlatform.value) {
  return platform.tagGroups?.[0]?.id;
}

async function addTagGroup() {
  if (!editingPlatform.value.tagGroups) {
    editingPlatform.value.tagGroups = [];
  }
  const id = crypto.randomUUID();
  pendingTagGroupIds.value.add(id);
  editingPlatform.value.tagGroups.unshift({
    id,
    name: '',
  });
  await nextTick();
  focusInput(tagGroupInputRefs.value[id]);
}

function removeTagGroup(groupId: string) {
  const group = (editingPlatform.value.tagGroups || []).find(item => item.id === groupId);
  const groupName = group?.name.trim() || '这个标签';
  const relatedCount = editingPlatform.value.subcategories.filter(subcategory => subcategory.groupId === groupId).length;
  deleteTagGroupDialog.value = {
    visible: true,
    groupId,
    message: relatedCount > 0
    ? `确定删除“${groupName}”吗？这会让该标签下的 ${relatedCount} 个标签值变成未分组。`
    : `确定删除“${groupName}”吗？`,
  };
}

function confirmDeleteTagGroup() {
  const groupId = deleteTagGroupDialog.value.groupId;
  if (!groupId) {
    cancelDeleteTagGroup();
    return;
  }
  pendingTagGroupIds.value.delete(groupId);
  editingPlatform.value.tagGroups = (editingPlatform.value.tagGroups || []).filter(group => group.id !== groupId);
  for (const subcategory of editingPlatform.value.subcategories) {
    if (subcategory.groupId === groupId) {
      subcategory.groupId = undefined;
    }
  }
  cancelDeleteTagGroup();
}

function cancelDeleteTagGroup() {
  deleteTagGroupDialog.value = {
    visible: false,
    groupId: '',
    message: '',
  };
}

function clearInvalidSubcategoryGroups() {
  const validGroupIds = new Set((editingPlatform.value.tagGroups || []).map(group => group.id));
  for (const subcategory of editingPlatform.value.subcategories) {
    if (subcategory.groupId && !validGroupIds.has(subcategory.groupId)) {
      subcategory.groupId = undefined;
    }
  }
}

// 选择平台
function selectPlatform(platformId: string) {
  const targetPlatform = draftPlatforms.value.find(platform => platform.id === platformId);
  if (!targetPlatform) {
    return;
  }
  editingPlatform.value = targetPlatform;
  clearInvalidSubcategoryGroups();
}

// 添加子分类
async function addSubcategory(groupId?: string) {
  const id = crypto.randomUUID();
  pendingTagValueIds.value.add(id);
  editingPlatform.value.subcategories.unshift({
    id,
    name: '',
    groupId: groupId ?? getFirstTagGroupId(),
  });
  await nextTick();
  focusInput(tagValueInputRefs.value[id]);
}

// 删除子分类
function removeSubcategory(subcategoryId: string) {
  pendingTagValueIds.value.delete(subcategoryId);
  const index = editingPlatform.value.subcategories.findIndex(s => s.id === subcategoryId);
  if (index !== -1) {
    editingPlatform.value.subcategories.splice(index, 1);
  }
}

function handleTagGroupBlur(groupId: string) {
  if (!pendingTagGroupIds.value.has(groupId)) {
    return;
  }
  const group = (editingPlatform.value.tagGroups || []).find(item => item.id === groupId);
  if (!group) {
    pendingTagGroupIds.value.delete(groupId);
    return;
  }
  if (!group.name.trim()) {
    pendingTagGroupIds.value.delete(groupId);
    editingPlatform.value.tagGroups = (editingPlatform.value.tagGroups || []).filter(item => item.id !== groupId);
    return;
  }
  pendingTagGroupIds.value.delete(groupId);
}

function handleSubcategoryBlur(subcategoryId: string) {
  if (!pendingTagValueIds.value.has(subcategoryId)) {
    return;
  }
  const subcategory = editingPlatform.value.subcategories.find(item => item.id === subcategoryId);
  if (!subcategory) {
    pendingTagValueIds.value.delete(subcategoryId);
    return;
  }
  if (!subcategory.name.trim()) {
    removeSubcategory(subcategoryId);
    return;
  }
  pendingTagValueIds.value.delete(subcategoryId);
}

// 添加字段
async function addField() {
  const id = crypto.randomUUID();
  editingPlatform.value.fields.push({
    id,
    name: '',
    type: 'text',
    defaultValue: '',
    sortable: false,
    showCopyIcon: false,
  });
  await nextTick();
  focusInput(fieldNameInputRefs.value[id]);
}

// 删除字段
function removeField(fieldId: string) {
  const index = editingPlatform.value.fields.findIndex(f => f.id === fieldId);
  if (index !== -1) {
    editingPlatform.value.fields.splice(index, 1);
  }
}

// 确认删除
function confirmDelete(platformId: string) {
  if (!sourceSnapshots.value[platformId]) {
    draftPlatforms.value = draftPlatforms.value.filter(platform => platform.id !== platformId);
    if (editingPlatform.value.id === platformId) {
      const nextId = draftPlatforms.value[0]?.id;
      if (nextId) {
        selectPlatform(nextId);
      } else {
        editingPlatform.value = createEmptyPlatform('');
      }
    }
    syncDirtyPlatformIds();
    return;
  }

  if (confirm('确定要删除这个平台吗？这将删除该平台下的所有记录！')) {
    emit('delete', platformId);
  }
}

// 保存
function save() {
  const dirtyDrafts = draftPlatforms.value
    .filter(platform => isPlatformDirty(platform.id))
    .map(platform => sanitizePlatform(platform))
    .filter(platform => sourceSnapshots.value[platform.id] || isPlatformMeaningful(platform));

  const invalidPlatform = dirtyDrafts.find(platform => !platform.name);
  if (invalidPlatform) {
    selectPlatform(invalidPlatform.id);
    alert('有未保存的平台还没填写名称，请先补上平台名称');
    return;
  }

  const duplicatePlatform = dirtyDrafts.find(platform => {
    const groupNames = (platform.tagGroups || [])
      .map(group => normalizeName(group.name))
      .filter(Boolean);
    const names = platform.subcategories
      .map(subcategory => normalizeName(subcategory.name))
      .filter(Boolean);
    return new Set(groupNames).size !== groupNames.length || new Set(names).size !== names.length;
  });
  if (duplicatePlatform) {
    selectPlatform(duplicatePlatform.id);
    alert('检测到重复标签或标签值名称，同一平台内都不能重复');
    return;
  }

  if (dirtyDrafts.length === 0) {
    emit('close');
    return;
  }

  emit('save', dirtyDrafts, editingPlatform.value.id);
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 900px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: #f8fafc;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #fee2e2;
  color: var(--danger-color);
}

.modal-body {
  display: flex;
  gap: 0;
  height: calc(85vh - 140px);
}

.platform-list {
  width: 240px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  font-size: 14px;
}

.btn-new {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-new:hover {
  background: var(--primary-hover);
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.15s;
}

.platform-item:hover {
  background: #f1f5f9;
}

.platform-item.active {
  background: #dbeafe;
}

.platform-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-badge {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 11px;
  line-height: 1.2;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 0;
}

.platform-item:hover .delete-btn {
  opacity: 1;
}

.empty-list {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 13px;
}

.edit-form {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.edit-form h3 {
  font-size: 18px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 20px;
}

.section-divider {
  border: none;
  border-top: 1px solid #c4b5fd;
  margin: 0 0 16px 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
  color: var(--text-color);
}

.required {
  color: var(--danger-color);
}

.form-group input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
}

.icon-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-preview {
  width: 60px;
  height: 60px;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.icon-preview:hover {
  border-color: var(--primary-color);
  background: #f8fafc;
}

.icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.icon-placeholder {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 8px;
}

.icon-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.icon-option {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: white;
}

.icon-option:hover {
  border-color: var(--primary-color);
  transform: scale(1.1);
}

.icon-option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.subcategory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.tag-board {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tag-group-card {
  padding: 14px 16px;
  border: 1px solid #dbe7ff;
  border-radius: 14px;
  background: linear-gradient(180deg, #fbfdff 0%, #f4f8ff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.tag-group-card.is-ungrouped {
  border-style: dashed;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.tag-group-card.is-duplicate {
  border-color: #fda4af;
  box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.12);
}

.tag-group-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tag-group-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: nowrap;
}

.tag-group-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.tag-group-title-input {
  width: auto;
  min-width: 0;
  max-width: min(100%, 520px);
  height: 42px;
  padding: 0 12px;
  border: 1px solid #cfe0ff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: #ffffff;
  flex: 0 1 auto;
  box-sizing: border-box;
}

.tag-group-static-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  max-width: min(100%, 520px);
  white-space: normal;
  word-break: break-word;
}

.tag-group-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.14);
}

.tag-section-count {
  min-width: 20px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #e0edff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.tag-value-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
  justify-content: flex-start;
}

.tag-value-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  min-width: 0;
  max-width: 100%;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid #cfe0ff;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-sizing: border-box;
  overflow: visible;
  flex: 0 0 auto;
  align-self: flex-start;
}

.tag-value-chip:hover {
  border-color: #9fc0ff;
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.12);
  background: #f8fbff;
}

.tag-value-chip.is-duplicate {
  border-color: #fca5a5;
  background: #fff8f8;
  box-shadow: 0 0 0 3px rgba(252, 165, 165, 0.12);
}

.tag-value-input {
  all: unset;
  display: inline-block;
  width: 0;
  min-width: 0;
  max-width: none;
  height: 34px;
  padding: 0 !important;
  margin: 0;
  border: none !important;
  border-radius: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  font-size: 14px;
  line-height: 34px;
  white-space: nowrap;
  flex: 0 1 auto;
  overflow: visible;
  text-overflow: clip;
  color: inherit;
  cursor: text;
  appearance: none !important;
  -webkit-appearance: none !important;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.tag-value-input:focus {
  outline: none;
  box-shadow: none;
}

.empty-section {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px dashed #d4dbe8;
  color: #94a3b8;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.7);
}

.duplicate-tip {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f2;
  color: #be123c;
  font-size: 13px;
  border: 1px solid #fecdd3;
}

.tag-value-remove {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #ef4444;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
  flex-shrink: 0;
}

.tag-value-chip:hover .tag-value-remove {
  opacity: 1;
}

.tag-value-remove:hover {
  background: #fee2e2;
}

.tag-groups-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.tag-group-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.tag-group-item:hover {
  background: #f8fafc;
}

.group-name {
  flex: 1;
  padding: 6px 8px;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.group-select {
  width: 90px;
  padding: 6px 4px;
  font-size: 13px;
}

.tag-mode-options {
  display: flex;
  gap: 12px;
}

.tag-mode-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tag-mode-option input {
  display: none;
}

.tag-mode-option.active {
  border-color: #a78bfa;
  background: #f5f3ff;
  color: #7c3aed;
}

.subcategory-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.subcategory-item:hover {
  background: #f8fafc;
}

.subcategory-name {
  width: 100px;
  flex-shrink: 0;
}

.subcategory-belong {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

.btn-delete-subcategory {
  color: #ef4444;
  font-weight: 300;
  font-size: 18px;
}

.btn-delete-subcategory:hover {
  background: #fee2e2;
}

.btn-add-subcategory {
  align-self: flex-start;
}

.btn-add-inline {
  flex-shrink: 0;
  padding: 5px 12px;
  font-size: 12px;
}

.section-header-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.section-header-split {
  justify-content: space-between;
  align-items: flex-start;
}

.section-header-inline label {
  margin: 0;
}

.section-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-hint {
  font-size: 12px;
  color: #94a3b8;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: visible;
}

.field-sorter {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: visible;
}

.field-sorter.is-sorting,
.field-sorter.is-sorting * {
  user-select: none;
}

.field-item {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  padding: 14px 16px;
  min-height: 68px;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-radius: 14px;
  border: 1px solid #dbeafe;
  border-left: 4px solid #93c5fd;
  position: relative;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.field-item:hover {
  background: #ffffff;
  border-color: #93c5fd;
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.08);
}

.field-drag-handle {
  width: 28px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  color: #2563eb;
  border-radius: 8px;
  cursor: grab;
  user-select: none;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  font-size: 15px;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.field-drag-handle:hover {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #93c5fd;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
}

.field-drag-handle:active,
.field-chosen .field-drag-handle,
.field-dragging .field-drag-handle,
.field-fallback .field-drag-handle {
  cursor: grabbing;
}

.field-ghost {
  min-height: 56px;
  opacity: 1;
  background: rgba(96, 165, 250, 0.08);
  border: 2px solid #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.12);
}

.field-ghost > * {
  opacity: 0.18;
}

.field-chosen {
  border-color: #60a5fa;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16);
}

.field-dragging {
  cursor: grabbing;
  width: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.16);
  transform: scale(1.01);
  opacity: 1;
  pointer-events: none;
}

.field-fallback {
  visibility: hidden !important;
  opacity: 0 !important;
  box-shadow: none !important;
  pointer-events: none;
}

.field-dragging select,
.field-dragging input,
.field-dragging button,
.field-dragging label,
.field-fallback select,
.field-fallback input,
.field-fallback button,
.field-fallback label {
  pointer-events: none;
}

.field-sorter.is-sorting .field-item {
  user-select: none;
}

.subcategory-item .drag-handle {
  cursor: default;
  color: #cbd5f5;
}

.hint {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

.field-name {
  flex: 0 1 auto;
  min-width: 0;
  min-height: 42px;
}

.field-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 10px;
  align-items: center;
  justify-content: start;
  column-gap: 18px;
  flex: 0 0 auto;
  padding: 4px 0;
}

.field-required-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-height: 22px;
  margin-bottom: 0;
  padding: 2px 0;
  line-height: 1;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-weight: 400;
}

.field-required-label input[type="checkbox"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  margin: 0;
}

.field-checkbox-indicator {
  width: 16px;
  height: 16px;
  border: 1.5px solid #94a3b8;
  border-radius: 4px;
  background: #ffffff;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.field-checkbox-indicator::after {
  content: '';
  width: 8px;
  height: 5px;
  border-left: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  transform: rotate(-45deg) scale(0);
  transform-origin: center;
  transition: transform 0.16s ease;
  margin-top: -1px;
}

.field-required-label:hover .field-checkbox-indicator {
  border-color: #60a5fa;
}

.field-required-label input[type="checkbox"]:checked + .field-checkbox-indicator {
  border-color: #2563eb;
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.field-required-label input[type="checkbox"]:checked + .field-checkbox-indicator::after {
  transform: rotate(-45deg) scale(1);
}

.field-required-label input[type="checkbox"]:focus-visible + .field-checkbox-indicator {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.field-required-text {
  display: inline-block;
  line-height: 18px;
}

.btn-delete-field {
  flex-shrink: 0;
  margin-left: auto;
}

.field-type {
  width: auto;
  min-width: 148px;
  min-height: 42px;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-delete-field {
  color: #ef4444;
  font-weight: 300;
  font-size: 18px;
  flex-shrink: 0;
  align-self: center;
}

.btn-delete-field:hover {
  background: #fee2e2;
}

.btn-icon:hover {
  background: #fee2e2;
}

.btn-add-field {
  align-self: flex-start;
}

@media (max-width: 1100px) {
  .field-item {
    align-items: flex-start;
  }

  .field-options {
    flex: 1 1 100%;
  }

  .btn-delete-field {
    margin-left: 0;
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: #f8fafc;
}

.save-summary {
  margin-right: auto;
  font-size: 13px;
  color: var(--text-secondary);
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.confirm-card {
  width: min(420px, calc(100vw - 32px));
  padding: 20px 22px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  border: 1px solid #e2e8f0;
}

.confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}

.confirm-body {
  font-size: 14px;
  line-height: 1.7;
  color: #475569;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.btn-danger {
  background: #ef4444;
  color: #ffffff;
}

.btn-danger:hover {
  background: #dc2626;
}
</style>

