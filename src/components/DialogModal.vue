<template>
  <Transition name="dialog-fade">
    <div
      v-if="visible"
      class="dialog-overlay"
      role="presentation"
      @click.self="handleCancel"
    >
      <div
        class="dialog-card"
        :class="`tone-${tone}`"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        @click.stop
      >
        <div class="dialog-header">
          <span class="dialog-icon" aria-hidden="true">{{ toneIcon }}</span>
          <div class="dialog-heading">
            <span class="dialog-kicker">{{ toneLabel }}</span>
            <h2 :id="titleId">{{ title }}</h2>
          </div>
          <button
            type="button"
            class="dialog-close"
            aria-label="关闭提示"
            @click="handleCancel"
          >
            ×
          </button>
        </div>

        <p :id="messageId" class="dialog-message">{{ message }}</p>

        <div class="dialog-actions">
          <button
            v-if="showCancel"
            ref="cancelButtonRef"
            type="button"
            class="dialog-btn dialog-btn-secondary"
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
          <button
            ref="confirmButtonRef"
            type="button"
            class="dialog-btn"
            :class="`dialog-btn-${tone}`"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

type DialogTone = 'info' | 'warning' | 'danger' | 'success';

const props = withDefaults(defineProps<{
  visible: boolean;
  title: string;
  message: string;
  tone?: DialogTone;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}>(), {
  tone: 'info',
  confirmText: '知道了',
  cancelText: '取消',
  showCancel: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const confirmButtonRef = ref<HTMLButtonElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const dialogInstanceId = Math.random().toString(36).slice(2);
const titleId = `dialog-title-${dialogInstanceId}`;
const messageId = `dialog-message-${dialogInstanceId}`;

const toneLabel = computed(() => {
  const labels: Record<DialogTone, string> = {
    info: '提示',
    warning: '请注意',
    danger: '危险操作',
    success: '已完成',
  };
  return labels[props.tone];
});

const toneIcon = computed(() => {
  if (props.tone === 'success') return '✓';
  if (props.tone === 'info') return 'i';
  return '!';
});

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('cancel');
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.visible) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    handleCancel();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    handleConfirm();
  }
}

watch(() => props.visible, async visible => {
  if (visible) {
    window.addEventListener('keydown', handleKeydown);
    await nextTick();
    (props.showCancel ? cancelButtonRef.value : confirmButtonRef.value)?.focus();
    return;
  }

  window.removeEventListener('keydown', handleKeydown);
}, { immediate: true });

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.dialog-overlay {
  --dialog-ink: #172b4d;
  --dialog-muted: #718198;
  position: fixed;
  inset: 0;
  z-index: 1600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(18, 31, 52, 0.36);
  backdrop-filter: blur(10px) saturate(1.05);
}

.dialog-card {
  width: min(440px, calc(100vw - 32px));
  padding: 23px 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 26px 70px rgba(18, 31, 52, 0.2),
    0 8px 22px rgba(18, 31, 52, 0.1);
  font-size: 1rem;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dialog-icon {
  display: inline-grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  margin-top: 1px;
  border-radius: 12px;
  background: #edf4ff;
  color: #2f73e6;
  font-size: 1.125rem;
  font-weight: 800;
}

.dialog-heading {
  min-width: 0;
  flex: 1 1 auto;
}

.dialog-kicker {
  display: block;
  margin-bottom: 4px;
  color: #8a99ac;
  font-size: 0.625rem;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.dialog-card h2 {
  margin: 0;
  color: var(--dialog-ink);
  font-size: 1.125rem;
  font-weight: 760;
  letter-spacing: -0.02em;
  line-height: 1.35;
}

.dialog-close {
  display: inline-grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  margin: -4px -4px 0 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #9aa7b6;
  font-size: 1.375rem;
  line-height: 1;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
}

.dialog-close:hover {
  border-color: #dce6f1;
  background: #f6f9fc;
  color: var(--dialog-ink);
}

.dialog-message {
  margin: 18px 48px 0;
  color: var(--dialog-muted);
  font-size: 0.875rem;
  line-height: 1.75;
  white-space: pre-wrap;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 22px;
}

.dialog-btn {
  min-width: 84px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 750;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.dialog-btn:hover {
  transform: translateY(-1px);
}

.dialog-btn-secondary {
  border-color: #dbe5ef;
  background: #ffffff;
  color: #506176;
}

.dialog-btn-secondary:hover {
  border-color: #bfd1e5;
  background: #f7faff;
}

.dialog-btn-info,
.dialog-btn-success {
  border-color: #2f73e6;
  background: #2f73e6;
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(47, 115, 230, 0.18);
}

.dialog-btn-info:hover,
.dialog-btn-success:hover {
  border-color: #1f5fc7;
  background: #1f5fc7;
  box-shadow: 0 8px 18px rgba(47, 115, 230, 0.24);
}

.tone-warning .dialog-icon {
  background: #fff7e8;
  color: #b7771b;
}

.dialog-btn-warning {
  border-color: #d8952f;
  background: #d8952f;
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(216, 149, 47, 0.18);
}

.dialog-btn-warning:hover {
  border-color: #b7771b;
  background: #b7771b;
}

.tone-danger .dialog-icon {
  background: #fff0f2;
  color: #d84d5e;
}

.dialog-btn-danger {
  border-color: #d84d5e;
  background: #d84d5e;
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(216, 77, 94, 0.18);
}

.dialog-btn-danger:hover {
  border-color: #be394b;
  background: #be394b;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 180ms ease;
}

.dialog-fade-enter-active .dialog-card,
.dialog-fade-leave-active .dialog-card {
  transition: transform 180ms ease, opacity 180ms ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-card,
.dialog-fade-leave-to .dialog-card {
  opacity: 0;
  transform: translateY(7px) scale(0.985);
}

@media (max-width: 520px) {
  .dialog-overlay {
    padding: 16px;
  }

  .dialog-card {
    padding: 20px 18px 17px;
  }

  .dialog-message {
    margin-right: 0;
    margin-left: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dialog-fade-enter-active,
  .dialog-fade-leave-active,
  .dialog-fade-enter-active .dialog-card,
  .dialog-fade-leave-active .dialog-card,
  .dialog-btn,
  .dialog-close {
    transition: none;
  }
}
</style>
