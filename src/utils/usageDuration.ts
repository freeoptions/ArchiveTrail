import type { Platform } from './database';

const DAY_MS = 24 * 60 * 60 * 1000;

export type UsageDurationFieldIds = {
  startFieldId: string;
  endFieldId: string;
  durationFieldId: string;
};

export type UsageDurationResult =
  | { status: 'missing-start'; ongoing: false }
  | { status: 'invalid-start'; ongoing: false }
  | { status: 'invalid-end'; ongoing: false }
  | { status: 'invalid-range'; ongoing: false }
  | { status: 'valid'; days: number; ongoing: boolean };

export function getUsageDurationFieldIds(platform: Platform | null | undefined): UsageDurationFieldIds | null {
  if (!platform) return null;

  const startField = platform.fields.find(field => field.name.trim() === '开始时间');
  const endField = platform.fields.find(field => field.name.trim() === '结束时间');
  const durationField = platform.fields.find(field => field.name.trim() === '使用时长');
  if (
    !startField
    || !endField
    || !durationField
    || new Set([startField.id, endField.id, durationField.id]).size !== 3
  ) {
    return null;
  }

  return {
    startFieldId: startField.id,
    endFieldId: endField.id,
    durationFieldId: durationField.id,
  };
}

export function parseUsageDate(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null) return null;

  const rawValue = String(value).trim();
  if (!rawValue) return null;

  // 允许用户在日期后标记“?”表示日期不确定，例如“2026-07-05?”。
  const normalizedValue = rawValue.replace(/[?？]+$/, '').trim();
  const dateParts = normalizedValue.match(
    /^(\d{4})\s*(?:[-/.年]\s*)(\d{1,2})\s*(?:[-/.月]\s*)(\d{1,2})\s*日?(?:\s.*)?$/,
  );

  if (dateParts) {
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const day = Number(dateParts[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calculateUsageDuration(
  startValue: string | number | undefined | null,
  endValue: string | number | undefined | null,
  now = new Date(),
): UsageDurationResult {
  if (String(startValue ?? '').trim() === '') {
    return { status: 'missing-start', ongoing: false };
  }

  const startDate = parseUsageDate(startValue);
  if (!startDate) {
    return { status: 'invalid-start', ongoing: false };
  }

  const hasEndDate = String(endValue ?? '').trim() !== '';
  const endDate = hasEndDate ? parseUsageDate(endValue) : now;
  if (!endDate) {
    return { status: 'invalid-end', ongoing: false };
  }

  const startDay = startOfLocalDay(startDate);
  const endDay = startOfLocalDay(endDate);
  const days = Math.floor((endDay.getTime() - startDay.getTime()) / DAY_MS);
  if (days < 0) {
    return { status: 'invalid-range', ongoing: false };
  }

  return { status: 'valid', days, ongoing: !hasEndDate };
}

export function formatUsageDuration(result: UsageDurationResult): string {
  switch (result.status) {
    case 'missing-start':
      return '-';
    case 'invalid-start':
    case 'invalid-end':
      return '日期格式有误';
    case 'invalid-range':
      return '结束时间早于开始时间';
    case 'valid': {
      // 按 365 天折算并截取一位小数，例如 721 天显示约 1.9 年。
      const years = (Math.floor(result.days * 10 / 365) / 10).toFixed(1);
      return `${result.days} 天 ≈ ${years}年${result.ongoing ? '（进行中）' : ''}`;
    }
  }
}
