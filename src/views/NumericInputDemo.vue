<script setup lang="ts">
import { computed, ref } from 'vue'
import NumericInput from '@/components/NumericInput.vue'

const HOURS_PER_DAY = 24
const DAYS_PER_YEAR = 365.25
const HOURS_PER_YEAR = DAYS_PER_YEAR * HOURS_PER_DAY

const MAX_DECIMALS_HOURS = 2
const MAX_DECIMALS_DAYS = 4
const MAX_DECIMALS_YEARS = 6

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const hoursBase = ref<number | null>(7)

const activeUnit = ref<'hours' | 'days' | 'years' | null>(null)

const hours = computed<number | null>({
  get: () => hoursBase.value,
  set: (v) => {
    hoursBase.value = v === null ? null : roundTo(v, MAX_DECIMALS_HOURS)
  },
})

const days = computed<number | null>({
  get: () => {
    if (hoursBase.value === null) return null
    return roundTo(hoursBase.value / HOURS_PER_DAY, MAX_DECIMALS_DAYS)
  },
  set: (v) => {
    hoursBase.value = v === null ? null : roundTo(v * HOURS_PER_DAY, MAX_DECIMALS_HOURS)
  },
})

const years = computed<number | null>({
  get: () => {
    if (hoursBase.value === null) return null
    return roundTo(hoursBase.value / HOURS_PER_YEAR, MAX_DECIMALS_YEARS)
  },
  set: (v) => {
    hoursBase.value = v === null ? null : roundTo(v * HOURS_PER_YEAR, MAX_DECIMALS_HOURS)
  },
})

const models = { hours, days, years }

const rows = [
  { key: 'hours', suffix: 'hours old', maxDecimals: MAX_DECIMALS_HOURS },
  { key: 'days', suffix: 'days old', maxDecimals: MAX_DECIMALS_DAYS },
  { key: 'years', suffix: 'years old', maxDecimals: MAX_DECIMALS_YEARS },
] as const

const titleClass = (key: 'hours' | 'days' | 'years') =>
  activeUnit.value === key ? 'text-[#3D06D7]' : 'text-[#CFCADF]'
</script>

<template>
  <div class="flex flex-col items-start gap-2 p-8">
    <template v-for="(row, i) in rows" :key="row.key">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full overflow-hidden ring-4 ring-violet-500">
          <img src="/samuelCat.png" alt="Samuel the cat" class="w-full h-full object-cover" />
        </div>

        <div class="flex flex-col gap-2">
          <span
            class="text-sm font-bold tracking-wider transition-colors"
            :class="titleClass(row.key)"
          >
            SAMUEL IS
          </span>

          <div class="flex items-center gap-2">
            <NumericInput
              v-model="models[row.key].value"
              :max-decimals="row.maxDecimals"
              :aria-label="`Samuel's age in ${row.key}`"
              @focus="activeUnit = row.key"
              @blur="activeUnit = null"
            />
            <span class="text-[#CFCADF]">{{ row.suffix }}</span>
          </div>
        </div>
      </div>

      <div v-if="i !== rows.length - 1" class="w-16 flex justify-center">
        <img
          src="/arrow.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(85%) sepia(10%) saturate(500%) hue-rotate(210deg)"
        />
      </div>
    </template>
  </div>
</template>
