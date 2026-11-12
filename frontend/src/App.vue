<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { SimulationConfig } from './api'
import ConfigForm from './ui/ConfigForm.vue'
import StepMode from './ui/StepMode.vue'
import AutoMode from './ui/AutoMode.vue'

const config = reactive<SimulationConfig>({
  lambdas: [0.5, 0.4, 0.3],
  workerCount: 3,
  bufferCapacity: 5,
  serviceMin: 1,
  serviceMax: 3,
  generationHorizon: 20,
  seed: 1,
})

const mode = ref<'step' | 'auto'>('step')
</script>

<template>
  <main class="app">
    <h1>Агрегатор предложений маркетплейсов — вариант 14</h1>
    <p class="formula">ИБ ИЗ1 ПЗ2 Д1ОЗ3 Д1ОО3 Д2П2 Д2Б5 ОР1 ОД2</p>

    <ConfigForm v-model="config" />

    <nav class="tabs">
      <button :class="{ active: mode === 'step' }" @click="mode = 'step'">Пошаговый режим (ОД2)</button>
      <button :class="{ active: mode === 'auto' }" @click="mode = 'auto'">Автоматический режим (ОР1)</button>
    </nav>

    <StepMode v-if="mode === 'step'" :config="config" />
    <AutoMode v-else :config="config" />
  </main>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

h1 {
  font-size: 20px;
  margin: 0;
}

.formula {
  font-family: monospace;
  color: #475569;
}

.tabs {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}

.tabs .active {
  background: #3c6382;
  color: white;
}
</style>
