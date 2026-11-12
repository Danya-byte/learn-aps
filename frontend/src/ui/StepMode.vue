<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { createSimulation, nextStep, type SimulationConfig, type StatisticsReport, type StepSnapshot } from '../api'
import SchemeView from './SchemeView.vue'
import CalendarTable from './CalendarTable.vue'
import JournalTable from './JournalTable.vue'
import ReportTable from './ReportTable.vue'
import { fmt } from './format'

const props = defineProps<{ config: SimulationConfig }>()

const simulationId = ref<string | null>(null)
const history = shallowRef<StepSnapshot[]>([])
const index = ref(-1)
const finished = ref(false)
const report = shallowRef<StatisticsReport | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

const current = computed(() => history.value[index.value] ?? null)

async function reset() {
  history.value = []
  index.value = -1
  finished.value = false
  report.value = null
  error.value = null
  try {
    simulationId.value = (await createSimulation(props.config)).id
  } catch (e) {
    simulationId.value = null
    error.value = (e as Error).message
  }
}

/** Вперёд по уже пройденным шагам либо запрос нового шага у сервера */
async function next() {
  if (index.value < history.value.length - 1) {
    index.value++
    return
  }
  if (!simulationId.value || finished.value) return
  const result = await nextStep(simulationId.value)
  if (result.step === null) {
    finished.value = true
    report.value = result.report
    return
  }
  history.value = [...history.value, result.step]
  index.value++
}

function back() {
  if (index.value > 0) index.value--
}

async function run(action: () => Promise<void>) {
  busy.value = true
  try {
    await action()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function toEnd() {
  while (!finished.value && !error.value) await next()
  index.value = history.value.length - 1
}

watch(() => props.config, reset, { deep: true, immediate: true })
</script>

<template>
  <section>
    <div class="controls">
      <button :disabled="busy || index <= 0" @click="back">← Назад</button>
      <button :disabled="busy || (finished && index === history.length - 1)" @click="run(next)">Шаг →</button>
      <button :disabled="busy || finished" @click="run(toEnd)">До конца</button>
      <button :disabled="busy" @click="run(reset)">Сброс</button>
      <span v-if="error" class="error">{{ error }}</span>
      <span v-else-if="current">
        Шаг {{ index + 1 }} · t = {{ fmt(current.time) }} ·
        {{ current.event.type === 'ARRIVAL' ? `поступление от И${current.event.sourceId}` : `завершение на П${current.event.workerId}` }}
      </span>
      <span v-else>Нажмите «Шаг», чтобы обработать первое событие календаря</span>
    </div>

    <template v-if="current">
      <SchemeView :step="current" />
      <div class="tables">
        <div>
          <h2>Календарь событий</h2>
          <CalendarTable :step="current" />
        </div>
        <div>
          <h2>Действия на шаге</h2>
          <JournalTable :entries="current.journal" />
        </div>
      </div>
    </template>

    <template v-if="report && index === history.length - 1">
      <h2>Система пуста — итог прогона</h2>
      <ReportTable :report="report" />
    </template>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.tables {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: start;
}

.error {
  color: #b91c1c;
}
</style>
