<script setup lang="ts">
import { computed } from 'vue'
import type { SimulationConfig } from '../api'

const config = defineModel<SimulationConfig>({ required: true })

/** λ вводятся строкой через запятую: «1, 0.8, 0.6» */
const lambdasText = computed({
  get: () => config.value.lambdas.join(', '),
  set: text => {
    const lambdas = text.split(',').map(Number).filter(x => x > 0)
    if (lambdas.length > 0) config.value.lambdas = lambdas
  },
})

const rho = computed(() => {
  const { lambdas, workerCount, serviceMin, serviceMax } = config.value
  const mu = 2 / (serviceMin + serviceMax)
  return lambdas.reduce((a, b) => a + b, 0) / (workerCount * mu)
})
</script>

<template>
  <form class="panel form" @submit.prevent>
    <label>λᵢ источников (ИЗ1)
      <input v-model.lazy="lambdasText" />
    </label>
    <label>Приборов M
      <input v-model.number="config.workerCount" type="number" min="1" />
    </label>
    <label>Буфер B
      <input v-model.number="config.bufferCapacity" type="number" min="1" />
    </label>
    <label>a (ПЗ2)
      <input v-model.number="config.serviceMin" type="number" min="0.01" step="0.1" />
    </label>
    <label>b (ПЗ2)
      <input v-model.number="config.serviceMax" type="number" :min="config.serviceMin" step="0.1" />
    </label>
    <label>T генерации
      <input v-model.number="config.generationHorizon" type="number" min="1" />
    </label>
    <label>seed
      <input v-model.number="config.seed" type="number" />
    </label>
    <span class="rho">ρ = {{ rho.toFixed(2) }}</span>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}

label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #475569;
}

input {
  width: 110px;
  padding: 4px;
}

.rho {
  font-weight: bold;
  padding-bottom: 6px;
}
</style>
