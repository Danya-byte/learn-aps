<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { runAuto, type AutoResult, type SimulationConfig } from '../api'
import ReportTable from './ReportTable.vue'
import { fmt } from './format'

const props = defineProps<{ config: SimulationConfig }>()
const result = shallowRef<AutoResult | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

async function run() {
  busy.value = true
  error.value = null
  try {
    result.value = await runAuto(props.config)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section>
    <button :disabled="busy" @click="run">{{ busy ? 'Считаю…' : 'Запустить' }}</button>
    <span v-if="error" class="error">{{ error }}</span>
    <p class="hint">
      Число заявок подбирается автоматически по формуле N = t²(1 − p) / (p·δ²), t = 1,643 (α = 0,9), δ = 0,1:
      старт с N₀ = 100, прогоны повторяются, пока p не изменится меньше чем на 10 %. Поле T здесь не используется.
    </p>

    <template v-if="result">
      <h2>Подбор числа реализаций</h2>
      <table>
        <thead>
          <tr>
            <th>Итерация</th>
            <th>N заявок</th>
            <th>p<sub>отк</sub></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(it, i) in result.iterations" :key="i">
            <td>{{ i }}</td>
            <td>{{ it.requestCount }}</td>
            <td>{{ fmt(it.rejectProbability, 4) }}</td>
          </tr>
        </tbody>
      </table>
      <ReportTable :report="result.report" />
    </template>
  </section>
</template>

<style scoped>
.error {
  color: #b91c1c;
  margin-left: 8px;
}

.hint {
  color: #475569;
  max-width: 800px;
}
</style>
