<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'

type InputType = 'integer' | 'decimal'
type LimitType = 'none' | 'max' | 'maxLength'

const MIN_WIDTH = 72
const WIDTH_PADDING = 24

const formatWithSpaces = (str: string): string => {
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    type?: InputType
    disabled?: boolean
    max?: number
    maxLength?: number
    maxDecimals?: number
    ariaLabel?: string
    errorMessage?: string
  }>(),
  {
    type: 'decimal',
    maxDecimals: 2,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const limitType = computed<LimitType>(() => {
  if (props.max !== undefined) return 'max'
  if (props.maxLength !== undefined) return 'maxLength'
  return 'none'
})

const inputMode = computed(() => (props.type === 'integer' ? 'numeric' : 'decimal'))

const inputRef = ref<HTMLInputElement | null>(null)
const measureRef = ref<HTMLSpanElement | null>(null)
const inputWidth = ref(MIN_WIDTH)

const isFocused = ref(false)
const hasError = ref(false)

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return ''

  const str = value.toString()
  const [intPartRaw = '', decPart] = str.split('.')
  const formattedInt = formatWithSpaces(intPartRaw)
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt
}

const formatLimit = computed(() => {
  if (limitType.value === 'max' && props.max !== undefined) {
    return formatWithSpaces(props.max.toString())
  }
  if (limitType.value === 'maxLength' && props.maxLength !== undefined) {
    return props.maxLength.toString()
  }
  return ''
})

const defaultErrorMessage = computed(() => {
  if (limitType.value === 'max') return `Max ${formatLimit.value}`
  if (limitType.value === 'maxLength') return `Max ${formatLimit.value} digits`
  return ''
})

const parseDisplay = (s: string): number | null => {
  const v = s.replace(/\s/g, '').replace(/,/g, '.')
  if (v === '' || v === '.') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const displayValue = ref(formatNumber(props.modelValue))

let widthRaf = 0
const scheduleWidthUpdate = () => {
  cancelAnimationFrame(widthRaf)
  widthRaf = requestAnimationFrame(() => {
    if (!measureRef.value) return
    const textWidth = measureRef.value.offsetWidth
    inputWidth.value = Math.max(MIN_WIDTH, textWidth + WIDTH_PADDING)
  })
}

const onFocus = () => {
  isFocused.value = true
  emit('focus')
}

const onBlur = () => {
  isFocused.value = false
  hasError.value = false

  if (displayValue.value.endsWith('.')) {
    displayValue.value = displayValue.value.slice(0, -1)
    scheduleWidthUpdate()
  }

  emit('blur')
}

const getDigitCount = (str: string): number => {
  return str.replace(/[^\d]/g, '').length
}

const sanitize = (raw: string): { cleaned: string; numericValue: number | null } => {
  let cleaned = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')

  if (props.type === 'integer') {
    cleaned = cleaned.replace(/\./g, '')
  } else {
    const dotIndex = cleaned.indexOf('.')
    if (dotIndex !== -1) {
      const beforeDot = cleaned.slice(0, dotIndex)
      const afterDotRaw = cleaned.slice(dotIndex + 1).replace(/\./g, '')
      const afterDot = afterDotRaw.slice(0, props.maxDecimals)
      cleaned = `${beforeDot}.${afterDot}`
    }
  }

  let numericValue: number | null = null
  if (cleaned !== '' && cleaned !== '.') {
    const n = Number(cleaned)
    numericValue = Number.isFinite(n) ? n : null
  }

  return { cleaned, numericValue }
}

const formatFromCleaned = (cleaned: string): string => {
  if (cleaned === '') return ''

  const dotIndex = cleaned.indexOf('.')
  const hasDot = dotIndex !== -1

  const intPartRaw = hasDot ? cleaned.slice(0, dotIndex) : cleaned
  const decPart = hasDot ? cleaned.slice(dotIndex + 1) : undefined

  const formattedInt = formatWithSpaces(intPartRaw || '')

  if (hasDot) {
    return `${formattedInt}.${decPart ?? ''}`
  }

  return formattedInt
}

const checkLimit = (cleaned: string, numericValue: number | null): boolean => {
  if (limitType.value === 'max' && props.max !== undefined) {
    return numericValue !== null && numericValue > props.max
  }

  if (limitType.value === 'maxLength' && props.maxLength !== undefined) {
    return getDigitCount(cleaned) > props.maxLength
  }

  return false
}

const onInput = (event: Event) => {
  if (props.disabled) return

  const input = event.target as HTMLInputElement
  const cursorPos = input.selectionStart ?? 0

  const oldFormatted = displayValue.value

  const { cleaned, numericValue } = sanitize(input.value)

  if (checkLimit(cleaned, numericValue)) {
    hasError.value = true
    input.value = displayValue.value
    return
  }

  hasError.value = false

  displayValue.value = formatFromCleaned(cleaned)
  emit('update:modelValue', numericValue)
  scheduleWidthUpdate()

  nextTick(() => {
    if (!inputRef.value) return

    const oldSpacesBefore = (oldFormatted.slice(0, cursorPos).match(/\s/g) || []).length
    const charsBeforeCursor = cursorPos - oldSpacesBefore

    let newCursorPos = 0
    let charCount = 0
    const newFormatted = displayValue.value

    for (let i = 0; i < newFormatted.length && charCount < charsBeforeCursor; i++) {
      newCursorPos = i + 1
      if (newFormatted[i] !== ' ') charCount++
    }

    inputRef.value.setSelectionRange(newCursorPos, newCursorPos)
  })
}

const onKeyDown = (event: KeyboardEvent) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }

  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End']
  if (allowedKeys.includes(event.key)) {
    hasError.value = false
    return
  }

  if (event.ctrlKey || event.metaKey) return

  if (props.type === 'decimal' && (event.key === '.' || event.key === ',')) {
    if (displayValue.value.includes('.')) {
      event.preventDefault()
    }
    return
  }

  if (props.type === 'integer' && (event.key === '.' || event.key === ',')) {
    event.preventDefault()
    return
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (isFocused.value) return

    const parsed = parseDisplay(displayValue.value)
    if (newValue !== parsed) {
      displayValue.value = formatNumber(newValue)
      scheduleWidthUpdate()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await nextTick()
  scheduleWidthUpdate()
})

onUnmounted(() => {
  cancelAnimationFrame(widthRaf)
})

const inputClasses = computed(() => {
  if (props.disabled) {
    return 'bg-gray-100 cursor-not-allowed opacity-60 border-[#CFCADF] text-[#CFCADF]'
  }
  if (hasError.value) {
    return 'border-red-500 text-red-500 animate-shake'
  }
  if (isFocused.value) {
    return 'border-[#906FEE] text-[#1E0E4C]'
  }
  return 'border-[#CFCADF] text-[#CFCADF]'
})
</script>

<template>
  <div class="inline-flex flex-col gap-1 relative">
    <div class="relative">
      <input
        ref="inputRef"
        type="text"
        :inputmode="inputMode"
        :value="displayValue"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @input="onInput"
        @keydown="onKeyDown"
        @focus="onFocus"
        @blur="onBlur"
        class="rounded text-base outline-none transition-all border"
        :class="inputClasses"
        :style="{ width: `${inputWidth}px`, minWidth: `${MIN_WIDTH}px`, padding: '8px 12px' }"
      />
      <span
        ref="measureRef"
        class="absolute invisible whitespace-pre text-base"
        style="padding: 0 12px"
        aria-hidden="true"
      >
        {{ displayValue || '0' }}
      </span>
    </div>

    <span
      v-if="hasError && limitType !== 'none'"
      class="text-xs text-red-500 absolute -bottom-5 left-0 whitespace-nowrap"
    >
      {{ errorMessage ?? defaultErrorMessage }}
    </span>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
</style>
