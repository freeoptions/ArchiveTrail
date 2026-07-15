<template>
  <div
    class="modal-overlay"
    @mousedown.self="handleOverlayPointerDown"
    @mouseup.self="handleOverlayPointerUp"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ record?.id ? '编辑记录' : '新建记录' }}</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>选择平台 <span class="required">*</span></label>
          <div class="platform-select">
            <select v-model="selectedPlatformId" @change="onPlatformChange">
              <option v-for="platform in platforms" :key="platform.id" :value="platform.id">
                {{ platform.name }}
              </option>
            </select>
            <button class="btn btn-secondary btn-sm" @click="$emit('close'); emit('managePlatform')">
              管理平台
            </button>
          </div>
          <div v-if="platforms.length === 0" class="empty-platform">
            <p>暂无平台，请先创建平台</p>
            <button class="btn btn-primary" @click="$emit('close'); emit('managePlatform')">
              创建平台
            </button>
          </div>
        </div>

        <div v-if="selectedPlatform && subcategorySections.length > 0" class="form-group">
          <label>标签选择 <span class="required">*</span></label>
          <div class="tag-field-groups selector-groups">
            <div
              v-for="section in subcategorySections"
              :key="section.id"
              class="tag-field-group selector-group"
            >
              <span v-if="section.showLabel" class="tag-field-group-label">{{ section.name }}：</span>
              <div class="tag-field-pills">
                <button
                  v-for="subcategory in section.items"
                  :key="subcategory.id"
                  type="button"
                  class="tag-field-pill"
                  :class="{ active: isSubcategorySelected(subcategory.id) }"
                  @click="toggleSubcategorySelection(subcategory.id)"
                >
                  {{ subcategory.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedPlatform && visibleFields.length > 0" class="fields-section">
          <div class="field-list">
            <div v-for="field in visibleFields" :key="field.id" class="field-item">
              <label class="field-label">
                {{ field.name }}
                <span v-if="field.required" class="required">*</span>
                <span class="field-type">{{ getFieldTypeLabel(field.type) }}</span>
              </label>

              <div class="field-input">
                <template v-if="field.type === 'text'">
                  <textarea v-model="fieldValues[field.id]" placeholder="请输入..." rows="2"></textarea>
                </template>

                <template v-else-if="field.type === 'link'">
                  <div class="link-input">
                    <span class="link-icon">🔗</span>
                    <input
                      v-model="fieldValues[field.id]"
                      type="url"
                      placeholder="https://example.com"
                      @dblclick="openLink(String(fieldValues[field.id]))"
                    />
                    <button
                      v-if="fieldValues[field.id]"
                      class="btn-open-link"
                      @click="openLink(String(fieldValues[field.id]))"
                      title="打开链接"
                    >
                      打开
                    </button>
                  </div>
                </template>

                <template v-else-if="field.type === 'number'">
                  <input
                    v-model="fieldValues[field.id]"
                    type="number"
                    placeholder="0"
                    class="number-input"
                  />
                </template>

                <template v-else-if="field.type === 'date'">
                  <div class="date-input-wrapper">
                    <input
                      v-model="fieldValues[field.id]"
                      type="date"
                      class="date-input"
                      @click="openDatePicker($event)"
                      readonly
                    />
                    <span class="date-icon" @click="openDatePickerByIcon(field.id)">📆</span>
                  </div>
                </template>

                <template v-else-if="field.type === 'image'">
                  <div class="image-input">
                    <div class="image-actions">
                      <input
                        type="text"
                        class="paste-input"
                        placeholder="在此粘贴图片 (Ctrl+V)"
                        @paste="handlePaste($event, field.id)"
                        readonly
                      />
                      <button
                        v-if="fieldValues[field.id]"
                        class="btn btn-secondary btn-sm"
                        @click="fieldValues[field.id] = ''"
                      >
                        清除
                      </button>
                    </div>
                    <div class="image-preview" @click="selectImage(field.id)">
                      <img v-if="fieldValues[field.id]" :src="getImageUrl(String(fieldValues[field.id]))" alt="图片" />
                      <span v-else class="image-placeholder">点击选择图片</span>
                    </div>
                    <input
                      :ref="el => imageInputs[field.id] = el as HTMLInputElement"
                      type="file"
                      accept="image/*"
                      @change="(e) => handleImageChange(e, field.id)"
                      style="display: none"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="selectedPlatform" class="empty-fields">
          <p>该平台暂无自定义字段</p>
          <button class="btn btn-secondary" @click="$emit('close'); emit('managePlatform')">
            去添加字段
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type { Platform, Record as RecordType } from '../utils/database';

type SubcategorySection = {
  id: string;
  name: string;
  showLabel: boolean;
  items: { id: string; name: string; groupId?: string }[];
};

const props = defineProps<{
  record: RecordType | null;
  platforms: Platform[];
  currentPlatform: Platform | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [record: RecordType];
  managePlatform: [];
}>();

const selectedPlatformId = ref<string>('');
const selectedSubcategoryIds = ref<string[]>([]);
const fieldValues = ref<Record<string, string | number>>({});
const imageInputs = ref<Record<string, HTMLInputElement | null>>({});
const dataDirPath = ref('');
const shouldCloseOnOverlayMouseUp = ref(false);

const selectedPlatform = computed(() => {
  return props.platforms.find(platform => platform.id === selectedPlatformId.value);
});

const isRecordMultiTag = computed(() => {
  return selectedPlatform.value?.recordTagMode === 'multi';
});

const tagField = computed(() => {
  return selectedPlatform.value?.fields.find(field => field.id === 'tag');
});

const ungroupedSubcategories = computed(() => {
  if (!selectedPlatform.value) return [];
  const groupIds = new Set((selectedPlatform.value.tagGroups || []).map(group => group.id));
  return selectedPlatform.value.subcategories.filter(subcategory => !subcategory.groupId || !groupIds.has(subcategory.groupId));
});

const subcategorySections = computed<SubcategorySection[]>(() => {
  if (!selectedPlatform.value) return [];

  const groups = selectedPlatform.value.tagGroups || [];
  const sections: SubcategorySection[] = groups
    .map(group => ({
      id: group.id,
      name: group.name,
      showLabel: true,
      items: selectedPlatform.value!.subcategories.filter(subcategory => subcategory.groupId === group.id),
    }))
    .filter(section => section.items.length > 0);

  if (ungroupedSubcategories.value.length > 0) {
    sections.push({
      id: 'ungrouped',
      name: '未分组',
      showLabel: groups.length > 0,
      items: ungroupedSubcategories.value,
    });
  }

  if (sections.length === 0 && selectedPlatform.value.subcategories.length > 0) {
    sections.push({
      id: 'all',
      name: '标签值',
      showLabel: false,
      items: selectedPlatform.value.subcategories,
    });
  }

  return sections;
});

const visibleFields = computed(() => {
  if (!selectedPlatform.value) return [];
  return selectedPlatform.value.fields.filter(field => field.id !== 'tag');
});

function handleOverlayPointerDown() {
  shouldCloseOnOverlayMouseUp.value = true;
}

function handleOverlayPointerUp() {
  if (!shouldCloseOnOverlayMouseUp.value) return;
  shouldCloseOnOverlayMouseUp.value = false;
  emit('close');
}

function isSubcategorySelected(subcategoryId: string) {
  return selectedSubcategoryIds.value.includes(subcategoryId);
}

function syncTagFieldFromSubcategoryIds(subcategoryIds: string[]) {
  if (!selectedPlatform.value || !tagField.value) return;

  const selectedNames = selectedPlatform.value.subcategories
    .filter(subcategory => subcategoryIds.includes(subcategory.id))
    .map(subcategory => subcategory.name);

  if (selectedNames.length > 0) {
    fieldValues.value[tagField.value.id] = selectedNames.join('/');
  } else {
    delete fieldValues.value[tagField.value.id];
  }
}

function toggleSubcategorySelection(subcategoryId: string) {
  if (isRecordMultiTag.value) {
    const current = new Set(selectedSubcategoryIds.value);
    if (current.has(subcategoryId)) {
      current.delete(subcategoryId);
    } else {
      current.add(subcategoryId);
    }
    selectedSubcategoryIds.value = [...current];
  } else {
    selectedSubcategoryIds.value = selectedSubcategoryIds.value[0] === subcategoryId ? [] : [subcategoryId];
  }

  syncTagFieldFromSubcategoryIds(selectedSubcategoryIds.value);
}

function getFieldTypeLabel(type: string) {
  const labels: Record<string, string> = {
    text: '文本',
    link: '链接',
    number: '数字',
    date: '日期',
    image: '图片',
  };
  return labels[type] || type;
}

function openLink(url: string) {
  if (url) {
    window.open(url, '_blank');
  }
}

function openDatePicker(event: Event) {
  const input = event.target as HTMLInputElement;
  input.showPicker();
}

function openDatePickerByIcon(_fieldId: string) {
  const input = document.querySelector('input[type="date"]') as HTMLInputElement | null;
  if (input) {
    input.showPicker();
  }
}

function selectImage(fieldId: string) {
  const input = imageInputs.value[fieldId];
  if (input) {
    input.click();
  }
}

function handleImageChange(event: Event, fieldId: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      fieldValues.value[fieldId] = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

function handlePaste(event: ClipboardEvent, fieldId: string) {
  const items = event.clipboardData?.items;
  if (!items) {
    alert('无法读取剪贴板');
    return;
  }

  let found = false;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      found = true;
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          fieldValues.value[fieldId] = e.target?.result as string;
        };
        reader.onerror = () => {
          alert('读取图片失败');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }

  if (!found) {
    alert('剪贴板中没有图片，请先截图或复制图片');
  }
}

async function getDataDirPath() {
  if (dataDirPath.value) return dataDirPath.value;
  dataDirPath.value = await invoke<string>('get_data_dir_path');
  return dataDirPath.value;
}

function getImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http')) return path;
  if (!dataDirPath.value) return '';

  const normalized = path.replace(/\//g, '\\');
  const fullPath = normalized.startsWith('pics\\')
    ? `${dataDirPath.value}\\${normalized}`
    : `${dataDirPath.value}\\pics\\${normalized}`;
  return convertFileSrc(fullPath);
}

onMounted(() => {
  void getDataDirPath();
});

watch([() => props.record, () => props.platforms, () => props.currentPlatform], ([record, platforms, currentPlatform]) => {
  if (platforms.length > 0) {
    if (record?.platformId) {
      selectedPlatformId.value = record.platformId;
    } else if (currentPlatform) {
      selectedPlatformId.value = currentPlatform.id;
    } else {
      selectedPlatformId.value = platforms[0].id;
    }
  }

  if (record) {
    const initialIds = record.subcategoryIds ?? (record.subcategoryId ? [record.subcategoryId] : []);
    selectedSubcategoryIds.value = isRecordMultiTag.value ? initialIds : initialIds.slice(0, 1);
    fieldValues.value = {};
    record.values.forEach(value => {
      fieldValues.value[value.fieldId] = value.value;
    });
    syncTagFieldFromSubcategoryIds(selectedSubcategoryIds.value);
  } else {
    selectedSubcategoryIds.value = [];
    fieldValues.value = {};
    if (selectedPlatform.value) {
      for (const field of selectedPlatform.value.fields) {
        if (field.defaultValue) {
          fieldValues.value[field.id] = field.defaultValue;
        }
      }
    }
  }
}, { immediate: true });

function onPlatformChange() {
  fieldValues.value = {};
  selectedSubcategoryIds.value = [];

  if (selectedPlatform.value) {
    if (!isRecordMultiTag.value && selectedSubcategoryIds.value.length > 1) {
      selectedSubcategoryIds.value = selectedSubcategoryIds.value.slice(0, 1);
    }
    for (const field of selectedPlatform.value.fields) {
      if (field.defaultValue) {
        fieldValues.value[field.id] = field.defaultValue;
      }
    }
  }
}

function save() {
  if (!selectedPlatform.value) {
    alert('请选择平台');
    return;
  }

  if (selectedPlatform.value.fields.length === 0) {
    alert('该平台暂无字段，请先添加字段');
    return;
  }

  if (selectedPlatform.value.subcategories.length > 0 && selectedSubcategoryIds.value.length === 0) {
    alert('请选择标签值');
    return;
  }

  for (const field of visibleFields.value) {
    if (field.required) {
      const value = fieldValues.value[field.id];
      if (value === undefined || value === null || String(value).trim() === '') {
        alert(`请输入 ${field.name}`);
        return;
      }
    }
  }

  const record: RecordType = {
    id: props.record?.id || crypto.randomUUID(),
    platformId: selectedPlatformId.value,
    subcategoryId: undefined,
    subcategoryIds: [...selectedSubcategoryIds.value],
    values: Object.entries(fieldValues.value).map(([fieldId, value]) => ({
      fieldId,
      value: value as string | number,
    })),
    favorite: props.record?.favorite ?? false,
    favoriteOrder: props.record?.favoriteOrder ?? undefined,
    createdAt: props.record?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  emit('save', record);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
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
  width: 600px;
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
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.close-btn:hover {
  background: #fee2e2;
  color: var(--danger-color);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(85vh - 140px);
}

.form-group {
  margin-bottom: 24px;
}

.form-group > label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
  font-size: 14px;
}

.required {
  color: var(--danger-color);
}

.platform-select {
  display: flex;
  gap: 10px;
  align-items: center;
}

.platform-select select {
  flex: 1;
  padding: 10px 12px;
  font-size: 14px;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.empty-platform,
.empty-fields {
  text-align: center;
  padding: 32px;
  background: #f8fafc;
  border-radius: 8px;
  margin-top: 12px;
}

.empty-platform p,
.empty-fields p {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.fields-section {
  margin-top: 8px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-type {
  font-size: 12px;
  color: var(--text-secondary);
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 400;
}

.field-input {
  width: 100%;
}

.field-input input,
.field-input textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
}

.field-input textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.link-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.link-icon {
  font-size: 16px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 6px 0 0 6px;
  border-right: none;
}

.link-input input {
  flex: 1;
  border-radius: 0;
}

.btn-open-link {
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.number-input {
  max-width: 200px;
}

.date-input-wrapper {
  display: flex;
  align-items: center;
  max-width: 200px;
}

.date-input-wrapper .date-input {
  flex: 1;
  border-radius: 6px 0 0 6px;
  cursor: pointer;
}

.date-icon {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-left: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
}

.image-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.paste-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  background: #f8fafc;
  color: var(--text-secondary);
}

.image-preview {
  width: 80px;
  height: 80px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 8px;
}

.tag-field-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selector-groups {
  margin-top: 4px;
}

.selector-group {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fbfdff;
}

.tag-field-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-field-group-label {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
  font-weight: 500;
  padding-top: 6px;
}

.tag-field-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-field-pill {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color);
  transition: all 0.2s;
}

.tag-field-pill:hover {
  background: #f1f5f9;
}

.tag-field-pill.active {
  color: #7c3aed;
  border-color: #a78bfa;
  box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: #f8fafc;
}
</style>
