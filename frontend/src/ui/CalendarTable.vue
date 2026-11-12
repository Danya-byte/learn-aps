<script setup lang="ts">
import type { StepSnapshot } from '../api'
import { fmt } from './format'

/** Обработанное событие (первая строка) и будущие события календаря */
defineProps<{ step: StepSnapshot }>()
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Время</th>
        <th>Событие</th>
        <th>Источник</th>
        <th>Прибор</th>
        <th>Заявка</th>
      </tr>
    </thead>
    <tbody>
      <tr class="done">
        <td>{{ step.event.sequenceNumber }}</td>
        <td>{{ fmt(step.event.time) }}</td>
        <td>{{ step.event.type }} ✓</td>
        <td>{{ step.event.sourceId ?? '' }}</td>
        <td>{{ step.event.workerId ?? '' }}</td>
        <td>{{ step.event.requestId ?? '' }}</td>
      </tr>
      <tr v-for="e in step.calendar" :key="e.sequenceNumber">
        <td>{{ e.sequenceNumber }}</td>
        <td>{{ fmt(e.time) }}</td>
        <td>{{ e.type }}</td>
        <td>{{ e.sourceId ?? '' }}</td>
        <td>{{ e.workerId ?? '' }}</td>
        <td>{{ e.requestId ?? '' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.done {
  background: #fff8e7;
  font-weight: bold;
}
</style>
