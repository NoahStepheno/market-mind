import { faker } from "@faker-js/faker";

export type AlarmConditionType =
  | "price_above"
  | "price_below"
  | "volume_above"
  | "volume_below"
  | "custom";

export interface AlarmCondition {
  type: AlarmConditionType;
  value: number;
  symbol?: string;
  metadata?: Record<string, unknown>;
}

export interface Alarm {
  id: string;
  name: string;
  conditions: AlarmCondition[];
  enabled: boolean;
  createdAt: Date;
}

interface CreateAlarmOptions extends Partial<Omit<Alarm, "id" | "createdAt">> {}

export function createAlarm(options: CreateAlarmOptions = {}): Alarm {
  return {
    id: faker.string.uuid(),
    name: options.name ?? faker.word.adjective() + " " + faker.word.noun() + " Alarm",
    conditions: options.conditions ?? [
      {
        type: "price_above",
        value: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
        symbol: faker.finance.currencyCode(),
      },
    ],
    enabled: options.enabled ?? true,
    createdAt: faker.date.recent(),
  };
}
