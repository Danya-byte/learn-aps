<script setup lang="ts">
import type { StatisticsReport } from '../api'
import { fmt, percent } from './format'

/** ОР1: сводная таблица по источникам и приборам */
defineProps<{ report: StatisticsReport }>()
</script>

<template>
  <h2>Таблица 1. Характеристики источников</h2>
  <table>
    <thead>
      <tr>
        <th>№ источника</th>
        <th>Заявок</th>
        <th>Обслужено</th>
        <th>Отказов</th>
        <th>p<sub>отк</sub></th>
        <th>T<sub>преб</sub></th>
        <th>T<sub>БП</sub></th>
        <th>T<sub>обсл</sub></th>
        <th>Д<sub>БП</sub></th>
        <th>Д<sub>обсл</sub></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="s in report.sources" :key="s.sourceId">
        <td>И{{ s.sourceId }}</td>
        <td>{{ s.generated }}</td>
        <td>{{ s.completed }}</td>
        <td>{{ s.rejected }}</td>
        <td>{{ fmt(s.rejectProbability) }}</td>
        <td>{{ fmt(s.meanSystem) }}</td>
        <td>{{ fmt(s.meanWaiting) }}</td>
        <td>{{ fmt(s.meanService) }}</td>
        <td>{{ fmt(s.varianceWaiting) }}</td>
        <td>{{ fmt(s.varianceService) }}</td>
      </tr>
    </tbody>
  </table>

  <h2>Таблица 2. Характеристики приборов</h2>
  <table>
    <thead>
      <tr>
        <th>№ прибора</th>
        <th>Коэффициент использования</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="w in report.workers" :key="w.workerId">
        <td>П{{ w.workerId }}</td>
        <td>{{ fmt(w.utilization) }}</td>
      </tr>
    </tbody>
  </table>

  <p class="panel">
    Всего заявок {{ report.totalGenerated }}, отказов {{ report.totalRejected }} ({{ percent(report.rejectProbability) }}),
    среднее T<sub>преб</sub> = {{ fmt(report.meanSystem) }}, средняя загрузка приборов {{ percent(report.meanUtilization) }},
    время реализации {{ fmt(report.observationTime) }}
  </p>
</template>
