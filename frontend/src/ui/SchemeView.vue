<script setup lang="ts">
import type { StepSnapshot } from '../api'
import { fmt } from './format'

/** ОД2: формализованная схема СМО и её текущее состояние */
defineProps<{ step: StepSnapshot }>()
</script>

<template>
  <div class="scheme">
    <div class="column">
      <h2>Источники (ИБ, ИЗ1)</h2>
      <p class="domain">клиенты агрегатора</p>
      <div v-for="s in step.sources" :key="s.id" class="box">
        <b>И{{ s.id }}</b> λ = {{ s.lambda }}<br />
        заявок {{ s.generated }} · потеряно {{ s.rejected }} ({{ s.rejectPercent.toFixed(1) }} %)
      </div>
    </div>

    <div class="arrow" title="Компонент приёма обновлений">ДП<br />Д1ОЗ3<br />Д1ОО3<br />→</div>

    <div class="column">
      <h2>Буфер (Д1ОЗ3)</h2>
      <p class="domain">очередь обновлений</p>
      <div v-for="(slot, i) in step.buffer" :key="i" class="box" :class="{ empty: !slot }">
        <b>{{ i }}</b>
        <template v-if="slot"> · {{ slot.id }} · t<sub>вх</sub> = {{ fmt(slot.createdAt) }}</template>
        <template v-else> · свободно</template>
      </div>
    </div>

    <div class="arrow" title="Планировщик обработки обновлений">ДВ<br />Д2Б5<br />Д2П2<br />→</div>

    <div class="column">
      <h2>Пакет (Д2Б5)</h2>
      <p class="domain">планировщик обработки обновлений</p>
      <div v-if="step.batch" class="box">
        источник <b>И{{ step.batch.sourceId }}</b><br />
        состав: {{ step.batch.initialIds.join(', ') }}<br />
        ожидают: {{ step.batch.waitingIds.join(', ') || '—' }}<br />
        на приборах: {{ step.batch.inServiceIds.join(', ') || '—' }}
      </div>
      <div v-else class="box empty">нет пакета</div>
    </div>

    <div class="column">
      <h2>Приборы (ПЗ2)</h2>
      <p class="domain">worker-процессы</p>
      <div v-for="w in step.pool.workers" :key="w.id" class="box" :class="{ empty: !w.request }">
        <span v-if="w.id === step.pool.workerPointer" class="pointer" title="workerPointer">▶</span>
        <b>П{{ w.id }}</b>
        <template v-if="w.request"> · {{ w.request.id }} до {{ fmt(w.finishAt) }}</template>
        <template v-else> · свободен</template>
        <br />K<sub>исп</sub> = {{ fmt(w.utilization) }}
      </div>
    </div>
  </div>

  <p class="panel totals">
    Всего: сгенерировано {{ step.statistics.generated }}, обслужено {{ step.statistics.completed }},
    потеряно обновлений (отказов) {{ step.statistics.rejected }} ({{ step.statistics.rejectPercent.toFixed(1) }} %) ·
    указатель приборов = П{{ step.pool.workerPointer }}
  </p>
</template>

<style scoped>
.scheme {
  display: flex;
  gap: 12px;
  align-items: start;
  overflow-x: auto;
}

.column {
  min-width: 170px;
}

.box {
  background: #f4f8fc;
  border: 1px solid #3c6382;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 6px;
  position: relative;
}

.box.empty {
  background: white;
  border-style: dashed;
  color: #94a3b8;
}

.arrow {
  align-self: center;
  text-align: center;
  font-size: 12px;
  color: #475569;
}

.domain {
  margin: -4px 0 6px;
  font-size: 12px;
  color: #64748b;
}

.pointer {
  color: #c2410c;
  margin-right: 4px;
}

.totals {
  margin-top: 8px;
}
</style>
