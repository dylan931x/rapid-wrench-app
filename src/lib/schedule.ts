type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

type DateRange = {
  start_at: string;
  end_at: string;
};

export type SlotOption = {
  startAt: string;
  endAt: string;
  label: string;
};

const SLOT_STEP_MINUTES = 30;

export function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function formatSlotLabel(start: Date, end: Date) {
  const dateLabel = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return `${dateLabel} • ${timeLabel}`;
}

export function isWithinAvailability(startAt: Date, endAt: Date, availabilityRules: AvailabilityRule[]) {
  const day = startAt.getDay();
  const matchingRules = availabilityRules.filter((rule) => rule.day_of_week === day && rule.is_available);
  if (matchingRules.length === 0) return false;

  const slotStartMinutes = startAt.getHours() * 60 + startAt.getMinutes();
  const slotEndMinutes = endAt.getHours() * 60 + endAt.getMinutes();

  return matchingRules.some((rule) => {
    const ruleStart = parseTimeToMinutes(rule.start_time);
    const ruleEnd = parseTimeToMinutes(rule.end_time);
    return slotStartMinutes >= ruleStart && slotEndMinutes <= ruleEnd;
  });
}

export function hasConflict(startAt: Date, endAt: Date, ranges: DateRange[]) {
  return ranges.some((range) => overlaps(startAt, endAt, new Date(range.start_at), new Date(range.end_at)));
}

export function buildAvailableSlots({
  durationMinutes,
  availabilityRules,
  blockedTimes,
  appointments,
  daysToScan = 21,
  maxSlots = 40,
}: {
  durationMinutes: number;
  availabilityRules: AvailabilityRule[];
  blockedTimes: DateRange[];
  appointments: DateRange[];
  daysToScan?: number;
  maxSlots?: number;
}) {
  const now = new Date();
  const slots: SlotOption[] = [];

  for (let offset = 0; offset < daysToScan && slots.length < maxSlots; offset += 1) {
    const currentDay = startOfLocalDay(addMinutes(now, offset * 24 * 60));
    const rules = availabilityRules.filter((rule) => rule.day_of_week === currentDay.getDay() && rule.is_available);
    if (rules.length === 0) continue;

    for (const rule of rules) {
      let cursor = combineDateAndTime(currentDay, rule.start_time);
      const dayEnd = combineDateAndTime(currentDay, rule.end_time);

      while (cursor < dayEnd && slots.length < maxSlots) {
        const end = addMinutes(cursor, durationMinutes);
        if (end > dayEnd) break;

        const startsInFuture = cursor.getTime() > now.getTime() + 15 * 60 * 1000;
        const free =
          startsInFuture &&
          isWithinAvailability(cursor, end, availabilityRules) &&
          !hasConflict(cursor, end, blockedTimes) &&
          !hasConflict(cursor, end, appointments);

        if (free) {
          slots.push({
            startAt: cursor.toISOString(),
            endAt: end.toISOString(),
            label: formatSlotLabel(cursor, end),
          });
        }

        cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
      }
    }
  }

  return slots;
}
