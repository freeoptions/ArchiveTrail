<template>
  <div
    class="modal-overlay"
    @mousedown.self="handleOverlayPointerDown"
    @mouseup.self="handleOverlayPointerUp"
  >
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-heading">
          <div class="modal-title-row">
            <span class="modal-mark" aria-hidden="true">✦</span>
            <h2>平台管理</h2>
            <span class="platform-total">{{ draftPlatforms.length }} 个平台</span>
          </div>
          <p class="modal-subtitle">配置平台、标签与列表字段</p>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="关闭平台管理">&times;</button>
      </div>

      <div class="modal-body">
        <!-- 平台列表 -->
        <div class="platform-list">
          <div class="list-header">
            <div>
              <div class="list-title">平台列表</div>
              <div class="list-caption">选择要编辑的配置</div>
            </div>
            <button class="btn-new" @click="createNewPlatform"><span aria-hidden="true">＋</span> 新建</button>
          </div>
          <div class="list-content">
            <div
              v-for="platform in draftPlatforms"
              :key="platform.id"
              class="platform-item"
              @click="selectPlatform(platform.id)"
              :class="{ active: editingPlatform?.id === platform.id }"
            >
              <span class="platform-item-marker" aria-hidden="true"></span>
              <span class="platform-name">{{ getPlatformDisplayName(platform) }}</span>
              <span v-if="isPlatformDirty(platform.id)" class="draft-badge">未保存</span>
              <button class="delete-btn" @click.stop="confirmDelete(platform.id)" title="删除" aria-label="删除平台">×</button>
            </div>
            <div v-if="draftPlatforms.length === 0" class="empty-list">
              暂无平台，点击上方按钮创建
            </div>
          </div>
        </div>

        <!-- 编辑表单 -->
        <div class="edit-form">
          <div class="edit-form-heading">
            <div>
              <span class="section-eyebrow">当前配置</span>
              <h3>{{ isExistingPlatform ? '编辑平台' : '新建平台' }}</h3>
            </div>
            <span
              class="edit-status"
              :class="{ 'is-dirty': isPlatformDirty(editingPlatform.id) }"
            >
              <span class="status-dot" aria-hidden="true"></span>
              {{ isPlatformDirty(editingPlatform.id) ? '有未保存改动' : '已同步' }}
            </span>
          </div>

          <div class="form-group">
            <label>平台名称 <span class="required">*</span></label>
            <input
              v-model="editingPlatform.name"
              type="text"
              placeholder="请输入平台名称"
              maxlength="30"
            />
          </div>

          <div class="form-group mode-setting">
            <div class="mode-setting-heading">
              <div>
                <label class="mode-setting-title">主界面筛选标签</label>
                <p class="mode-setting-description">在平台页面顶部筛选记录时，能同时选几个标签？</p>
              </div>
              <span class="mode-context">主界面</span>
            </div>
            <div class="mode-choice-grid">
              <label class="mode-choice" :class="{ active: editingPlatform.tagMode === 'single' }">
                <input v-model="editingPlatform.tagMode" type="radio" value="single" />
                <span class="mode-choice-radio" aria-hidden="true"></span>
                <span class="mode-choice-copy">
                  <span class="mode-choice-title">一次选一个</span>
                  <span class="mode-choice-description">点击新的标签，会替换当前筛选</span>
                  <span class="mode-choice-example">
                    <span class="mode-example-label">例如</span>
                    <span class="mode-example-chip is-selected">电影</span>
                    <span class="mode-example-or">或</span>
                    <span class="mode-example-chip">电视剧</span>
                  </span>
                </span>
              </label>
              <label class="mode-choice" :class="{ active: editingPlatform.tagMode === 'multi' }">
                <input v-model="editingPlatform.tagMode" type="radio" value="multi" />
                <span class="mode-choice-radio" aria-hidden="true"></span>
                <span class="mode-choice-copy">
                  <span class="mode-choice-title">可以选多个</span>
                  <span class="mode-choice-description">可以同时点选多个标签一起筛选</span>
                  <span class="mode-choice-example">
                    <span class="mode-example-label">例如</span>
                    <span class="mode-example-chip is-selected">电影</span>
                    <span class="mode-example-chip is-selected">电视剧</span>
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group mode-setting">
            <div class="mode-setting-heading">
              <div>
                <label class="mode-setting-title">一条记录的标签</label>
                <p class="mode-setting-description">新建或编辑记录时，这条记录可以保存几个标签？</p>
              </div>
              <span class="mode-context">记录编辑</span>
            </div>
            <div class="mode-choice-grid">
              <label class="mode-choice" :class="{ active: editingPlatform.recordTagMode === 'single' }">
                <input v-model="editingPlatform.recordTagMode" type="radio" value="single" />
                <span class="mode-choice-radio" aria-hidden="true"></span>
                <span class="mode-choice-copy">
                  <span class="mode-choice-title">每条记录选一个</span>
                  <span class="mode-choice-description">一条记录只能保存一个标签</span>
                  <span class="mode-choice-example">
                    <span class="mode-example-label">例如</span>
                    <span class="mode-example-chip is-selected">电影</span>
                  </span>
                </span>
              </label>
              <label class="mode-choice" :class="{ active: editingPlatform.recordTagMode === 'multi' }">
                <input v-model="editingPlatform.recordTagMode" type="radio" value="multi" />
                <span class="mode-choice-radio" aria-hidden="true"></span>
                <span class="mode-choice-copy">
                  <span class="mode-choice-title">每条记录选多个</span>
                  <span class="mode-choice-description">一条记录可以同时保存多个标签</span>
                  <span class="mode-choice-example">
                    <span class="mode-example-label">例如</span>
                    <span class="mode-example-chip is-selected">电影</span>
                    <span class="mode-example-chip is-selected">科幻</span>
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="section-header-inline section-header-split">
              <div class="section-title-block">
                <label>标签管理 <span class="hint">（先添加标签，再在标签下添加标签值）</span></label>
                <div class="hint sub-hint">标签分组和标签值都可以拖动左侧把手调整顺序</div>
              </div>
              <button class="btn btn-secondary btn-add-subcategory" @click="addTagGroup">
                ➕ 添加标签
              </button>
            </div>
            <div v-if="tagSections.length > 0" class="tag-board">
              <draggable
                v-if="editingPlatform.tagGroups && editingPlatform.tagGroups.length > 0"
                v-model="editingPlatform.tagGroups"
                item-key="id"
                class="tag-group-sorter"
                :class="{ 'is-sorting': isSortingTagGroups }"
                handle=".tag-group-drag-handle"
                animation="220"
                ghost-class="tag-group-ghost"
                drag-class="tag-group-dragging"
                chosen-class="tag-group-chosen"
                :force-fallback="true"
                :fallback-on-body="false"
                :fallback-tolerance="8"
                :touch-start-threshold="5"
                @start="handleTagGroupSortStart"
                @end="handleTagGroupSortEnd"
              >
                <template #item="{ element: group }">
                  <div
                    class="tag-group-card"
                    :class="{
                      'is-duplicate': duplicateTagGroupNames.has(normalizeName(group.name))
                    }"
                  >
                    <div class="tag-group-card-header">
                      <div class="tag-group-main">
                        <span
                          class="drag-handle tag-group-drag-handle"
                          title="拖动标签分组排序"
                          aria-label="拖动标签分组排序"
                        >⋮⋮</span>
                        <span class="tag-group-dot"></span>
                        <input
                          :ref="el => registerTagGroupInput(group.id, el)"
                          v-model="group.name"
                          type="text"
                          placeholder="标签名称"
                          class="tag-group-title-input"
                          :style="getTagGroupInputStyle(group.name)"
                          @blur="handleTagGroupBlur(group.id)"
                        />
                        <span class="tag-section-count">{{ getTagSectionTags(group.id).length }}</span>
                      </div>
                      <div class="tag-group-actions">
                        <button class="btn btn-secondary btn-add-inline" @click="addSubcategory(group.id)">
                          ➕ 添加标签值
                        </button>
                        <button
                          class="btn-icon btn-delete-subcategory"
                          @click="removeTagGroup(group.id)"
                          title="删除标签"
                        >✕</button>
                      </div>
                    </div>

                    <draggable
                      v-if="getTagSectionTags(group.id).length > 0"
                      :list="getTagSectionTags(group.id)"
                      item-key="id"
                      class="tag-value-wrap tag-value-sorter"
                      :class="{ 'is-sorting': isSortingTagValues }"
                      handle=".tag-value-drag-handle"
                      animation="180"
                      ghost-class="tag-value-ghost"
                      drag-class="tag-value-dragging"
                      chosen-class="tag-value-chosen"
                      :force-fallback="true"
                      :fallback-on-body="false"
                      :fallback-tolerance="6"
                      :touch-start-threshold="5"
                      @start="handleTagValueSortStart"
                      @end="event => handleTagValueSortEnd(group.id, event)"
                    >
                      <template #item="{ element: subcategory }">
                        <div
                          class="tag-value-chip"
                          :class="{ 'is-duplicate': duplicateTagNames.has(normalizeName(subcategory.name)) }"
                        >
                          <span
                            class="drag-handle tag-value-drag-handle"
                            title="拖动标签值排序"
                            aria-label="拖动标签值排序"
                          >⋮⋮</span>
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
                            @click.stop="removeSubcategory(subcategory.id)"
                            title="删除标签值"
                          >✕</button>
                        </div>
                      </template>
                    </draggable>

                    <div v-else class="empty-section">
                      这个标签下还没有标签值，点击右上角添加
                    </div>
                  </div>
                </template>
              </draggable>

              <div v-if="getTagSectionTags(undefined).length > 0" class="tag-group-card is-ungrouped">
                <div class="tag-group-card-header">
                  <div class="tag-group-main">
                    <span class="tag-group-dot"></span>
                    <span class="tag-group-static-title">未分组</span>
                    <span class="tag-section-count">{{ getTagSectionTags(undefined).length }}</span>
                  </div>
                  <div class="tag-group-actions">
                    <button class="btn btn-secondary btn-add-inline" @click="addSubcategory()">
                      ➕ 添加标签值
                    </button>
                  </div>
                </div>

                <draggable
                  :list="getTagSectionTags(undefined)"
                  item-key="id"
                  class="tag-value-wrap tag-value-sorter"
                  :class="{ 'is-sorting': isSortingTagValues }"
                  handle=".tag-value-drag-handle"
                  animation="180"
                  ghost-class="tag-value-ghost"
                  drag-class="tag-value-dragging"
                  chosen-class="tag-value-chosen"
                  :force-fallback="true"
                  :fallback-on-body="false"
                  :fallback-tolerance="6"
                  :touch-start-threshold="5"
                  @start="handleTagValueSortStart"
                  @end="event => handleTagValueSortEnd(undefined, event)"
                >
                  <template #item="{ element: subcategory }">
                    <div
                      class="tag-value-chip"
                      :class="{ 'is-duplicate': duplicateTagNames.has(normalizeName(subcategory.name)) }"
                    >
                      <span
                        class="drag-handle tag-value-drag-handle"
                        title="拖动标签值排序"
                        aria-label="拖动标签值排序"
                      >⋮⋮</span>
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
                        @click.stop="removeSubcategory(subcategory.id)"
                        title="删除标签值"
                      >✕</button>
                    </div>
                  </template>
                </draggable>
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
            <div class="field-list" :style="getFieldListStyle()">
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
                    <span
                      class="drag-handle field-drag-handle"
                      title="拖动字段排序"
                      aria-label="拖动字段排序"
                    >⋮⋮</span>
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
                      <label class="field-required-label" :class="{ active: field.required }">
                        <input type="checkbox" v-model="field.required" />
                        <span class="field-required-text">必填</span>
                      </label>
                      <label class="field-required-label" :class="{ active: field.sortable }">
                        <input type="checkbox" v-model="field.sortable" />
                        <span class="field-required-text">可排序</span>
                      </label>
                      <label class="field-required-label" :class="{ active: field.showCopyIcon }">
                        <input type="checkbox" v-model="field.showCopyIcon" />
                        <span class="field-required-text">显示复制</span>
                      </label>
                    </div>
                    <button
                      class="btn-icon btn-delete-field"
                      @click="removeField(field.id)"
                      title="删除字段"
                      aria-label="删除字段"
                    >✕</button>
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

    <DialogModal
      :visible="deleteTagGroupDialog.visible"
      title="删除标签确认"
      :message="deleteTagGroupDialog.message"
      tone="danger"
      :show-cancel="true"
      confirm-text="确认删除"
      @cancel="cancelDeleteTagGroup"
      @confirm="confirmDeleteTagGroup"
    />

    <DialogModal
      :visible="deletePlatformDialog.visible"
      title="删除平台确认"
      :message="deletePlatformDialog.message"
      tone="danger"
      :show-cancel="true"
      confirm-text="确认删除"
      @cancel="cancelDeletePlatform"
      @confirm="confirmDeletePlatform"
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
import { computed, nextTick, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import DialogModal from './DialogModal.vue';
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
const isSortingTagGroups = ref(false);
const isSortingTagValues = ref(false);
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
const deletePlatformDialog = ref({
  visible: false,
  platformId: '',
  message: '',
});
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

function getTagSectionTags(groupId?: string): Platform['subcategories'] {
  const groups = editingPlatform.value.tagGroups || [];
  const validGroupIds = new Set(groups.map(group => group.id));

  return editingPlatform.value.subcategories.filter(subcategory => {
    if (groupId) return subcategory.groupId === groupId;
    return !subcategory.groupId || !validGroupIds.has(subcategory.groupId);
  });
}

type SortEndEvent = {
  oldIndex?: number;
  newIndex?: number;
};

function handleTagGroupSortStart() {
  isSortingTagGroups.value = true;
}

function handleTagGroupSortEnd() {
  isSortingTagGroups.value = false;
}

function handleTagValueSortStart() {
  isSortingTagValues.value = true;
}

function handleTagValueSortEnd(groupId: string | undefined, event: SortEndEvent) {
  isSortingTagValues.value = false;

  const oldIndex = event.oldIndex;
  const newIndex = event.newIndex;
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
    return;
  }

  const sourceItems = editingPlatform.value.subcategories;
  const sectionSourceIndexes = sourceItems
    .map((subcategory, index) => ({ subcategory, index }))
    .filter(({ subcategory }) => {
      if (groupId) return subcategory.groupId === groupId;
      const validGroupIds = new Set((editingPlatform.value.tagGroups || []).map(group => group.id));
      return !subcategory.groupId || !validGroupIds.has(subcategory.groupId);
    })
    .map(({ index }) => index);

  if (oldIndex < 0 || newIndex < 0 || oldIndex >= sectionSourceIndexes.length || newIndex >= sectionSourceIndexes.length) {
    return;
  }

  const sectionItems = sectionSourceIndexes.map(index => sourceItems[index]);
  const [movedItem] = sectionItems.splice(oldIndex, 1);
  sectionItems.splice(newIndex, 0, movedItem);

  const nextSubcategories = [...sourceItems];
  sectionSourceIndexes.forEach((sourceIndex, sectionIndex) => {
    nextSubcategories[sourceIndex] = sectionItems[sectionIndex];
  });
  editingPlatform.value.subcategories = nextSubcategories;
}
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

function getFieldListStyle() {
  const widths = editingPlatform.value.fields.map(field => measureInputWidth(
    field.name,
    '字段名称',
    inputMeasureFonts.fieldName,
    {
      min: 56,
      max: 360,
      extra: 24,
    },
  ));
  const maxWidth = Math.max(80, ...widths);
  return { '--field-name-column': `${maxWidth}px` };
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

function cancelDeletePlatform() {
  deletePlatformDialog.value = {
    visible: false,
    platformId: '',
    message: '',
  };
}

function confirmDeletePlatform() {
  const platformId = deletePlatformDialog.value.platformId;
  if (!platformId) {
    cancelDeletePlatform();
    return;
  }
  cancelDeletePlatform();
  emit('delete', platformId);
}

function showNotice(
  message: string,
  title = '提示',
  tone: 'info' | 'warning' | 'danger' | 'success' = 'warning',
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

  deletePlatformDialog.value = {
    visible: true,
    platformId,
    message: '删除后，该平台及其下的所有记录都会被移除，且无法自动恢复。',
  };
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
    showNotice('当前平台还没有填写名称，请先补上平台名称。', '还不能保存');
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
    showNotice('检测到重复的标签分组或标签值名称，同一平台内不能重复。', '还不能保存');
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
  --modal-ink: #172b4d;
  --modal-muted: #74839a;
  --modal-line: #e2eaf3;
  --modal-blue: #2f73e6;
  --modal-blue-deep: #1f5fc7;
  --modal-blue-soft: #edf4ff;
  position: fixed;
  inset: 0;
  padding: 32px;
  background: rgba(18, 31, 52, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(14px) saturate(1.08);
}

.modal-content {
  display: flex;
  flex-direction: column;
  width: min(1100px, calc(100vw - 64px));
  height: min(820px, calc(100vh - 64px));
  max-height: calc(100vh - 64px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 26px;
  background: #f8fbff;
  box-shadow:
    0 30px 80px rgba(18, 31, 52, 0.22),
    0 8px 24px rgba(18, 31, 52, 0.1);
  animation: modal-enter 220ms ease-out both;
  font-size: 1rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 0 0 auto;
  min-height: 86px;
  padding: 18px 28px 17px;
  border-bottom: 1px solid var(--modal-line);
  background: rgba(255, 255, 255, 0.9);
}

.modal-heading {
  min-width: 0;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 11px;
}

.modal-mark {
  display: inline-grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px;
  background: var(--modal-blue-soft);
  color: var(--modal-blue);
  font-size: 1.125rem;
  font-weight: 700;
}

.modal-header h2 {
  color: var(--modal-ink);
  font-size: 1.25rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.platform-total {
  padding: 4px 9px;
  border: 1px solid #dbe8fb;
  border-radius: 999px;
  background: #f7faff;
  color: var(--modal-blue-deep);
  font-size: 0.75rem;
  font-weight: 700;
}

.modal-subtitle {
  margin: 4px 0 0 41px;
  color: var(--modal-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.close-btn {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: #718198;
  font-size: 1.625rem;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
}

.close-btn:hover {
  border-color: #d9e3ef;
  background: #f2f6fb;
  color: var(--modal-ink);
}

.modal-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.platform-list {
  display: flex;
  flex: 0 0 258px;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--modal-line);
  background: #f4f8fd;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 16px;
  border-bottom: 1px solid rgba(226, 234, 243, 0.85);
}

.list-title {
  color: var(--modal-ink);
  font-size: 0.8125rem;
  font-weight: 750;
  letter-spacing: 0.03em;
}

.list-caption {
  margin-top: 3px;
  color: #93a0b2;
  font-size: 0.6875rem;
}

.btn-new {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--modal-blue);
  border-radius: 10px;
  background: var(--modal-blue);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 5px 12px rgba(47, 115, 230, 0.2);
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.btn-new:hover {
  border-color: var(--modal-blue-deep);
  background: var(--modal-blue-deep);
  box-shadow: 0 7px 16px rgba(47, 115, 230, 0.25);
  transform: translateY(-1px);
}

.list-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: #c9d7e8 transparent;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  margin-bottom: 5px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 13px;
  cursor: pointer;
  color: #3b4c63;
  transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.platform-item:hover {
  border-color: #dbe6f3;
  background: rgba(255, 255, 255, 0.72);
}

.platform-item.active {
  border-color: #cfe0fb;
  background: #ffffff;
  color: var(--modal-blue-deep);
  box-shadow: 0 5px 14px rgba(31, 95, 199, 0.09);
}

.platform-item-marker {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: #b8c7d9;
  transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.platform-item.active .platform-item-marker {
  background: var(--modal-blue);
  box-shadow: 0 0 0 4px #e5efff;
  transform: scale(1.05);
}

.platform-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-badge {
  flex-shrink: 0;
  padding: 4px 7px;
  border-radius: 999px;
  background: #fff4df;
  color: #ad6910;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
}

.delete-btn {
  display: inline-grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #a3afbf;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 160ms ease, background 160ms ease, color 160ms ease;
}

.platform-item:hover .delete-btn,
.platform-item:focus-within .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #fff0f1;
  color: #d84d5e;
}

.empty-list {
  text-align: center;
  padding: 32px 20px;
  color: #8d9bae;
  font-size: 0.8125rem;
  line-height: 1.7;
}

.edit-form {
  flex: 1 1 auto;
  min-width: 0;
  container: edit-form / inline-size;
  padding: 30px 38px 42px;
  overflow-y: auto;
  background: #fbfdff;
  scrollbar-width: thin;
  scrollbar-color: #c9d7e8 transparent;
}

.edit-form-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--modal-line);
}

.section-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #8a99ac;
  font-size: 0.6875rem;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.edit-form h3 {
  color: var(--modal-ink);
  font-size: 1.5rem;
  font-weight: 760;
  letter-spacing: -0.035em;
}

.edit-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 5px;
  padding: 7px 10px;
  border: 1px solid #d9ebdf;
  border-radius: 999px;
  background: #f1faf4;
  color: #38835c;
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
}

.edit-status.is-dirty {
  border-color: #f2dfb5;
  background: #fff9ed;
  color: #a66b18;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.form-group {
  margin-bottom: 28px;
}

.section-divider {
  height: 1px;
  margin: 2px 0 28px;
  border: 0;
  background: var(--modal-line);
}

.form-group > label {
  display: block;
  margin-bottom: 10px;
  color: var(--modal-ink);
  font-size: 0.8125rem;
  font-weight: 750;
}

.required {
  color: #d84d5e;
}

.form-group input[type="text"] {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid #d9e4ef;
  border-radius: 12px;
  outline: none;
  background: #ffffff;
  color: var(--modal-ink);
  font-size: 0.875rem;
  box-shadow: 0 2px 6px rgba(37, 75, 120, 0.025);
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.form-group input[type="text"]::placeholder {
  color: #a5b1c0;
}

.form-group input[type="text"]:focus,
.tag-group-title-input:focus {
  border-color: #76a8ef;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(47, 115, 230, 0.11);
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
  font-size: 0.75rem;
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
  gap: 12px;
}

.tag-group-sorter {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.tag-group-sorter.is-sorting,
.tag-group-sorter.is-sorting *,
.tag-value-sorter.is-sorting,
.tag-value-sorter.is-sorting * {
  user-select: none;
}

.tag-group-ghost {
  border-color: #76a8ef;
  background: rgba(47, 115, 230, 0.06);
  box-shadow: 0 0 0 4px rgba(47, 115, 230, 0.1);
}

.tag-group-ghost > * {
  opacity: 0.28;
}

.tag-group-chosen {
  border-color: #76a8ef;
  box-shadow: 0 0 0 4px rgba(47, 115, 230, 0.11), 0 10px 24px rgba(47, 115, 230, 0.08);
}

.tag-group-dragging {
  cursor: grabbing;
  border-color: var(--modal-blue);
  box-shadow: 0 16px 30px rgba(47, 115, 230, 0.16);
  transform: scale(1.01);
}

.tag-group-card {
  padding: 18px 18px 16px;
  border: 1px solid #dde8f4;
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(37, 75, 120, 0.045);
}

.tag-group-card.is-ungrouped {
  border-style: dashed;
  background: #fcfdff;
}

.tag-group-card.is-duplicate {
  border-color: #f2aab4;
  box-shadow: 0 0 0 4px rgba(216, 77, 94, 0.08);
}

.tag-group-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.tag-group-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: nowrap;
}

.tag-group-drag-handle {
  display: inline-grid;
  width: 24px;
  height: 30px;
  flex: 0 0 24px;
  place-items: center;
  border: 1px solid #dce8f5;
  border-radius: 8px;
  background: #f4f8fd;
  color: #7d9dc5;
  font-size: 0.875rem;
  line-height: 1;
  cursor: grab;
  user-select: none;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tag-group-drag-handle:hover {
  border-color: #a9c7ee;
  background: #eaf2ff;
  color: var(--modal-blue-deep);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
}

.tag-group-drag-handle:active,
.tag-group-dragging .tag-group-drag-handle {
  cursor: grabbing;
}

.tag-group-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  margin-left: auto;
}

.tag-group-title-input {
  width: auto;
  min-width: 0;
  max-width: min(100%, 520px);
  height: 40px;
  padding: 0 11px;
  border: 1px solid #d6e4f4;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 700;
  background: #f8fbff;
  flex: 0 1 auto;
  box-sizing: border-box;
}

.tag-group-static-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #43546a;
  max-width: min(100%, 520px);
  white-space: normal;
  word-break: break-word;
}

.tag-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--modal-blue);
  box-shadow: 0 0 0 4px #e7f0ff;
}

.tag-section-count {
  min-width: 20px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #edf4ff;
  color: var(--modal-blue-deep);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
}

.tag-value-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  justify-content: flex-start;
}

.tag-value-sorter {
  min-width: 0;
}

.tag-value-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  min-width: 0;
  max-width: 100%;
  min-height: 40px;
  padding: 0 9px 0 12px;
  border-radius: 999px;
  border: 1px solid #d5e4f6;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-sizing: border-box;
  overflow: visible;
  flex: 0 0 auto;
  align-self: flex-start;
}

.tag-value-drag-handle {
  display: inline-grid;
  width: 18px;
  height: 26px;
  flex: 0 0 18px;
  place-items: center;
  margin-left: -3px;
  border-radius: 6px;
  color: #9ab0ca;
  font-size: 0.75rem;
  line-height: 1;
  cursor: grab;
  user-select: none;
  transition: background 160ms ease, color 160ms ease;
}

.tag-value-drag-handle:hover {
  background: #edf4ff;
  color: var(--modal-blue-deep);
}

.tag-value-drag-handle:active,
.tag-value-dragging .tag-value-drag-handle {
  cursor: grabbing;
}

.tag-value-ghost {
  border-color: #76a8ef;
  background: rgba(47, 115, 230, 0.06);
  box-shadow: 0 0 0 3px rgba(47, 115, 230, 0.1);
}

.tag-value-ghost > * {
  opacity: 0.28;
}

.tag-value-chosen {
  border-color: #76a8ef;
  box-shadow: 0 0 0 3px rgba(47, 115, 230, 0.11), 0 8px 18px rgba(47, 115, 230, 0.08);
}

.tag-value-dragging {
  cursor: grabbing;
  border-color: var(--modal-blue);
  box-shadow: 0 12px 24px rgba(47, 115, 230, 0.16);
  transform: scale(1.03);
}

.tag-value-chip:hover {
  border-color: #8bb6f2;
  box-shadow: 0 4px 12px rgba(47, 115, 230, 0.1);
  background: #fbfdff;
}

.tag-value-chip.is-duplicate {
  border-color: #f2aab4;
  background: #fff8f8;
  box-shadow: 0 0 0 3px rgba(216, 77, 94, 0.08);
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
  font-size: 0.875rem;
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
  padding: 13px 14px;
  border-radius: 11px;
  border: 1px dashed #d3deea;
  color: #91a0b3;
  font-size: 0.8125rem;
  background: #fbfdff;
}

.duplicate-tip {
  margin-top: 12px;
  padding: 11px 13px;
  border-radius: 11px;
  background: #fff5f6;
  color: #bd4555;
  font-size: 0.8125rem;
  border: 1px solid #f5d0d5;
}

.tag-value-remove {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #c77783;
  font-size: 0.875rem;
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
  background: #fff0f1;
  color: #d84d5e;
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
  font-size: 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.group-select {
  width: 90px;
  padding: 6px 4px;
  font-size: 0.8125rem;
}

.mode-setting {
  margin-bottom: 22px;
  padding: 17px 18px 18px;
  border: 1px solid #e1eaf3;
  border-radius: 17px;
  background: #f7faff;
}

.mode-setting-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 13px;
}

.mode-setting-title {
  margin: 0 !important;
  color: var(--modal-ink) !important;
  font-size: 0.875rem !important;
  font-weight: 750 !important;
}

.mode-setting-description {
  margin: 4px 0 0;
  color: #7d8da2;
  font-size: 0.75rem;
  line-height: 1.55;
}

.mode-context {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid #dce8f6;
  border-radius: 999px;
  background: #ffffff;
  color: #6c86a7;
  font-size: 0.625rem;
  font-weight: 700;
  white-space: nowrap;
}

.mode-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mode-choice {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  min-height: 112px;
  padding: 13px 14px;
  border: 1px solid #dce6f1;
  border-radius: 13px;
  background: #ffffff;
  color: #52647a;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, transform 160ms ease;
}

.mode-choice:hover {
  border-color: #aec8e9;
  box-shadow: 0 5px 14px rgba(47, 115, 230, 0.08);
  transform: translateY(-1px);
}

.mode-choice.active {
  border-color: #76a8ef;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(47, 115, 230, 0.1), 0 7px 16px rgba(47, 115, 230, 0.08);
}

.mode-choice input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.mode-choice:focus-within {
  outline: 3px solid rgba(47, 115, 230, 0.14);
  outline-offset: 2px;
}

.mode-choice-radio {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  margin-top: 1px;
  border: 1.5px solid #b5c2d1;
  border-radius: 50%;
  background: #ffffff;
}

.mode-choice-radio::after {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--modal-blue);
  content: '';
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 160ms ease, transform 160ms ease;
}

.mode-choice.active .mode-choice-radio {
  border-color: var(--modal-blue);
  box-shadow: 0 0 0 3px #e7f0ff;
}

.mode-choice.active .mode-choice-radio::after {
  opacity: 1;
  transform: scale(1);
}

.mode-choice-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.mode-choice-title {
  color: var(--modal-ink);
  font-size: 0.8125rem;
  font-weight: 750;
}

.mode-choice-description {
  min-height: 34px;
  color: #8190a3;
  font-size: 0.6875rem;
  line-height: 1.55;
}

.mode-choice-example {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
  color: #9aa7b6;
  font-size: 0.625rem;
}

.mode-example-label {
  margin-right: 1px;
  color: #9aa7b6;
}

.mode-example-chip {
  padding: 3px 7px;
  border: 1px solid #dbe6f2;
  border-radius: 999px;
  background: #f8fbff;
  color: #6c7f96;
  font-size: 0.625rem;
}

.mode-example-chip.is-selected {
  border-color: #c7dcfb;
  background: #edf4ff;
  color: var(--modal-blue-deep);
}

.mode-example-or {
  color: #a0adbc;
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
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
}

.btn-delete-subcategory {
  color: #c77783;
  font-weight: 300;
  font-size: 1.125rem;
}

.btn-delete-subcategory:hover {
  background: #fff0f1;
  color: #d84d5e;
}

.btn-add-subcategory {
  align-self: flex-start;
}

.btn-add-inline {
  flex-shrink: 0;
  height: 34px;
  padding: 0 11px;
  font-size: 0.75rem;
}

.section-header-inline {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
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
  font-size: 0.75rem;
  color: #96a4b5;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.btn-secondary {
  border-color: #dbe5ef;
  background: #ffffff;
  color: #506176;
  box-shadow: 0 2px 5px rgba(37, 75, 120, 0.035);
}

.btn-secondary:hover {
  border-color: #bfd1e5;
  background: #f7faff;
  color: var(--modal-blue-deep);
}

.btn-primary {
  border-color: var(--modal-blue);
  background: var(--modal-blue);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(47, 115, 230, 0.2);
}

.btn-primary:hover {
  border-color: var(--modal-blue-deep);
  background: var(--modal-blue-deep);
  box-shadow: 0 8px 18px rgba(47, 115, 230, 0.25);
  transform: translateY(-1px);
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
  display: grid;
  grid-template-columns: 36px minmax(0, var(--field-name-column, 120px)) 168px minmax(0, 1fr) 36px;
  column-gap: 14px;
  row-gap: 10px;
  align-items: center;
  padding: 14px 16px;
  min-height: 72px;
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 15px;
  border: 1px solid #dce7f2;
  border-left: 3px solid #8bb6f2;
  position: relative;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.field-item:hover {
  background: #ffffff;
  border-color: #b9d2f2;
  box-shadow: 0 6px 18px rgba(47, 115, 230, 0.08);
}

.field-drag-handle {
  width: 36px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  color: #7d9dc5;
  border-radius: 8px;
  cursor: grab;
  user-select: none;
  background: #f4f8fd;
  border: 1px solid #dce8f5;
  font-size: 0.9375rem;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.field-drag-handle:hover {
  background: #eaf2ff;
  color: var(--modal-blue-deep);
  border-color: #a9c7ee;
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
  background: rgba(47, 115, 230, 0.06);
  border: 2px solid #76a8ef;
  box-shadow: 0 0 0 4px rgba(47, 115, 230, 0.1);
}

.field-ghost > * {
  opacity: 0.18;
}

.field-chosen {
  border-color: #76a8ef;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 4px rgba(47, 115, 230, 0.13);
}

.field-dragging {
  cursor: grabbing;
  width: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
  border-color: var(--modal-blue);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(47, 115, 230, 0.16);
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
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.field-name {
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  min-height: 42px;
  border-radius: 11px;
  box-sizing: border-box;
}

.field-options {
  display: flex;
  align-items: center;
  justify-self: start;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  width: max-content;
  max-width: 100%;
  min-height: 44px;
  padding: 4px;
  border: 1px solid #edf2f8;
  border-radius: 12px;
  background: #f7faff;
}

.field-required-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-width: 0;
  min-height: 36px;
  margin-bottom: 0;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  width: auto;
  box-sizing: border-box;
  line-height: 1.2;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
  color: #53657c;
  font-weight: 600;
  flex: 0 0 auto;
}

.field-required-label:hover {
  border-color: #cfe0f6;
  background: #ffffff;
}

.field-required-label.active {
  border-color: #c7dcfb;
  background: #edf4ff;
  color: var(--modal-blue-deep);
}

.field-required-label input[type="checkbox"] {
  position: relative;
  inset: auto;
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  margin: 0;
  border: 1.5px solid #b0bdcc;
  border-radius: 6px;
  background: #ffffff;
  opacity: 1;
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.field-required-label input[type="checkbox"]::after {
  content: '';
  width: 9px;
  height: 5px;
  border-left: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  transform: rotate(-45deg) scale(0);
  transform-origin: center;
  transition: transform 0.16s ease;
  margin-top: -1px;
}

.field-required-label input[type="checkbox"]:checked {
  border-color: var(--modal-blue);
  background: var(--modal-blue);
  box-shadow: 0 0 0 3px rgba(47, 115, 230, 0.12);
}

.field-required-label input[type="checkbox"]:checked::after {
  transform: rotate(-45deg) scale(1);
}

.field-required-label input[type="checkbox"]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(47, 115, 230, 0.16);
}

.field-required-label input[type="checkbox"]:hover {
  border-color: #76a8ef;
}

.field-required-label input[type="checkbox"]:checked:hover {
  border-color: var(--modal-blue-deep);
}

.field-required-label input[type="checkbox"]:checked + .field-required-text {
  color: var(--modal-blue-deep);
}

.field-required-label input[type="checkbox"]:focus-visible + .field-required-text {
  color: var(--modal-blue-deep);
}

/* 保留整块标签的可点击区域，checkbox 自身负责视觉绘制 */
.field-required-label input[type="checkbox"] + .field-required-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.field-required-label.active .field-required-text {
  color: var(--modal-blue-deep);
  font-weight: 650;
}

.field-required-text {
  display: inline-block;
  line-height: 1.2;
  white-space: nowrap;
}

.btn-delete-field {
  grid-column: 5;
  justify-self: end;
  margin-left: 0;
}

.field-type {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border-radius: 11px;
  flex-shrink: 0;
}

.btn-icon {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  border-radius: 9px;
  transition: background 160ms ease, color 160ms ease;
}

.btn-delete-field {
  grid-column: 5;
  justify-self: end;
  color: #c77783;
  font-weight: 300;
  font-size: 1.125rem;
  align-self: center;
  margin-left: 0;
}

.btn-delete-field:hover {
  background: #fff0f1;
  color: #d84d5e;
}

.btn-icon:hover {
  background: #f4f7fb;
}

.btn-add-field {
  align-self: flex-start;
}

@media (max-width: 1100px) {
  .field-item {
    grid-template-columns: 36px minmax(0, var(--field-name-column, 120px)) 168px minmax(0, 1fr) 36px;
    column-gap: 12px;
    padding: 12px 14px;
  }

  .field-options {
    width: max-content;
    max-width: 100%;
    gap: 7px;
    padding: 4px;
  }

  .btn-delete-field {
    margin-left: 0;
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 28px;
  border-top: 1px solid var(--modal-line);
  background: rgba(255, 255, 255, 0.94);
}

.save-summary {
  margin-right: auto;
  color: #8a98aa;
  font-size: 0.75rem;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 820px) {
  .modal-overlay {
    padding: 18px;
  }

  .modal-content {
    width: min(100%, 720px);
    height: min(860px, calc(100vh - 36px));
    max-height: calc(100vh - 36px);
  }

  .platform-list {
    flex-basis: 220px;
  }

  .edit-form {
    padding: 26px 26px 34px;
  }

  .field-item {
    grid-template-columns: 36px minmax(0, 1fr) 36px;
    gap: 10px;
    padding: 12px 14px;
    align-items: center;
  }

  .field-name {
    grid-column: 2;
    grid-row: 1;
    width: 100% !important;
  }

  .field-type {
    grid-column: 2;
    grid-row: 2;
    min-width: 0;
  }

  .field-options {
    grid-column: 2 / -1;
    grid-row: 3;
    display: flex;
    width: 100%;
    max-width: 100%;
    gap: 6px;
    padding: 3px;
  }

  .field-required-label {
    flex: 1 1 0;
    min-width: 0;
  }

  .btn-delete-field {
    grid-column: 3;
    grid-row: 1;
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 8px;
  }

  .modal-content {
    width: 100%;
    height: calc(100vh - 16px);
    max-height: calc(100vh - 16px);
    border-radius: 20px;
  }

  .modal-header {
    min-height: 76px;
    padding: 16px 18px;
  }

  .modal-header h2 {
    font-size: 1.125rem;
  }

  .modal-subtitle {
    margin-left: 41px;
  }

  .platform-total {
    display: none;
  }

  .modal-body {
    flex-direction: column;
  }

  .platform-list {
    flex: 0 0 154px;
    border-right: 0;
    border-bottom: 1px solid var(--modal-line);
  }

  .list-header {
    padding: 13px 16px 9px;
  }

  .list-content {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 7px 12px 12px;
  }

  .platform-item {
    flex: 0 0 150px;
    min-height: 42px;
    margin-bottom: 0;
  }

  .edit-form {
    padding: 22px 18px 28px;
  }

  .edit-form-heading {
    margin-bottom: 24px;
  }

  .edit-form h3 {
    font-size: 1.3125rem;
  }

  .field-item {
    grid-template-columns: 32px minmax(0, 1fr) 32px;
    gap: 8px;
    padding: 11px 12px;
  }

  .field-options {
    display: flex;
    width: 100%;
    max-width: 100%;
    gap: 5px;
    padding: 3px;
  }

  .field-required-label {
    padding: 0 9px;
  }

  .mode-setting {
    padding: 15px 14px;
  }

  .mode-choice-grid {
    grid-template-columns: 1fr;
  }

  .edit-status {
    padding: 6px 8px;
    font-size: 0.625rem;
  }

  .section-header-split {
    align-items: stretch;
    flex-direction: column;
  }

  .btn-add-subcategory {
    align-self: flex-start;
  }

  .modal-footer {
    padding: 12px 16px;
  }

  .save-summary {
    display: none;
  }
}

@container edit-form (max-width: 760px) {
  .field-item {
    grid-template-columns: 36px minmax(0, 1fr) 36px;
    gap: 10px;
    padding: 12px 14px;
  }

  .field-name {
    grid-column: 2;
    grid-row: 1;
  }

  .field-type {
    grid-column: 2;
    grid-row: 2;
    min-width: 0;
  }

  .field-options {
    grid-column: 2 / -1;
    grid-row: 3;
    width: 100%;
    gap: 7px;
    padding: 4px;
  }

  .btn-delete-field {
    grid-column: 3;
    grid-row: 1;
    margin-left: 0;
  }
}

@container edit-form (max-width: 520px) {
  .field-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-content,
  .btn,
  .btn-new,
  .platform-item,
  .close-btn {
    animation: none;
    transition: none;
  }
}
</style>

