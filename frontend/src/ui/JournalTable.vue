<script setup lang="ts">
import type { ActionKind, JournalEntry } from '../api'
import { fmt } from './format'

defineProps<{ entries: JournalEntry[] }>()

const LABELS: Record<ActionKind, string> = {
  GENERATED: 'заявка сгенерирована',
  REJECTED: 'выбита из буфера — обновление потеряно (Д1ОО3)',
  BUFFERED: 'поставлена в буфер (Д1ОЗ3)',
  SELECTED: 'выбрана из пакета (Д2Б5)',
  STARTED: 'отправлена на прибор (Д2П2)',
  COMPLETED: 'обработана, каталог обновлён',
}
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Время</th>
        <th>Заявка</th>
        <th>Действие</th>
        <th>Прибор</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="e in entries" :key="e.order">
        <td>{{ e.order }}</td>
        <td>{{ fmt(e.time) }}</td>
        <td>{{ e.requestId }}</td>
        <td class="action">{{ LABELS[e.kind] }}</td>
        <td>{{ e.workerId ?? '' }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.action {
  text-align: left;
}
</style>
