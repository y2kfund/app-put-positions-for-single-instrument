<script setup lang="ts">
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import { onMounted, onBeforeUnmount, computed, ref, watch, nextTick } from 'vue'
import { usePutPositionsQuery } from '@y2kfund/core/putPositionsForSingleInstrument'

interface putPositionsProps {
  symbolRoot: string
  userId?: string | null
}

const props = withDefaults(defineProps<putPositionsProps>(), {
  symbolRoot: 'META',
  userId: '67e578fd-2cf7-48a4-b028-a11a3f89bb9b'
})

// Query put positions
const q = usePutPositionsQuery(props.symbolRoot, props.userId)

// Tabulator instance
const tableDiv = ref<HTMLDivElement | null>(null)
let tabulator: Tabulator | null = null
const isTabulatorReady = ref(false)
const isTableInitialized = ref(false)

function initializeTabulator() {
  if (!tableDiv.value || !q.data.value) {
    console.log('⚠️ Cannot initialize: tableDiv or data missing')
    return
  }

  // Destroy existing table
  if (tabulator) {
    try { 
      tabulator.destroy() 
      console.log('🗑️ Destroyed existing tabulator')
    } catch (error) {
      console.warn('Error destroying tabulator:', error)
    }
    tabulator = null
  }

  isTabulatorReady.value = false

  console.log('🚀 Initializing Tabulator with', q.data.value.length, 'rows')

  try {
    tabulator = new Tabulator(tableDiv.value, {
      data: q.data.value,
      layout: 'fitColumns',
      height: '100%',
      resizableColumns: true,
      placeholder: 'No put positions available',
      headerSortElement: "<span></span>",
      columns: [
        { title: 'Account', field: 'legal_entity', minWidth: 100, headerHozAlign: 'left' },
        { 
          title: 'Symbol', 
          field: 'symbol', 
          minWidth: 100,
          headerHozAlign: 'left',
          formatter: (cell: any) => {
            const tags = extractTagsFromSymbol(cell.getValue())
            return tags.map(tag => {
                const className = 'fi-tag'
                return `<span class="${className}">${tag}</span>`
              }).join(' ')
          },
        },
        { title: 'Expiry Date', field: 'expiry_date', minWidth: 100, hozAlign: 'left', headerHozAlign: 'left',
          formatter: (cell: any) => {
            const row = cell.getRow().getData()
            if (row.asset_class === 'OPT') {
              const tags = extractTagsFromSymbol(row.symbol)
              return tags[1] || '<span style="color:#aaa;font-style:italic;">Unknown</span>'
            }
            return '<span style="color:#aaa;font-style:italic;">Not applicable</span>'
          }
        },
        { title: 'Asset Class', field: 'asset_class', minWidth: 100, headerHozAlign: 'left' },
        { title: 'Conid', field: 'conid', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right' },
        { title: 'Underlying Conid', field: 'undConid', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right' },
        { title: 'Multiplier', field: 'multiplier', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right', formatter: 'money' },
        { title: 'Contract Quantity', field: 'contract_quantity', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right', formatter: 'money' },
        { title: 'Accounting Quantity', field: 'accounting_quantity', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right', formatter: 'money' },
        { title: 'Avg Price', field: 'avgPrice', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right', 
          formatter: (cell: any) => {
            const value = cell.getValue()
            return value != null ? '$' + Number(value).toFixed(2) : ''
          }
        },
        { title: 'Market Price', field: 'price', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            return value != null ? '$' + Number(value).toFixed(2) : ''
          }
        },
        { title: 'Market Value', field: 'market_value', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            if (value == null) return ''
            const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
            return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
          }
        },
        { title: 'Unrealized P&L', field: 'unrealized_pnl', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            if (value == null) return ''
            const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
            return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
          }
        },
        { title: 'Entry Cash Flow', field: 'computed_cash_flow_on_entry', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            if (value == null) return ''
            const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
            return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
          }
        },
        { title: 'If Exercised Cash Flow', field: 'computed_cash_flow_on_exercise', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            if (value == null) return ''
            const color = value < 0 ? '#dc3545' : value > 0 ? '#28a745' : '#000'
            return `<span style="color:${color}">$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
          }
        },
        { title: 'Entry/Exercise %', field: 'entry_exercise_cash_flow_pct', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const row = cell.getRow().getData()
            if (row.asset_class === 'OPT' && row.computed_cash_flow_on_entry != null && row.computed_cash_flow_on_exercise != null && row.computed_cash_flow_on_exercise !== 0) {
              const pct = (row.computed_cash_flow_on_entry / row.computed_cash_flow_on_exercise) * 100
              return Math.abs(pct).toFixed(2) + '%'
            }
            return '<span style="color:#aaa;font-style:italic;">N/A</span>'
          }
        },
        { title: 'BE Price', field: 'computed_be_price', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            return value != null ? '$' + Number(value).toFixed(2) : ''
          }
        },
        { title: 'Maintenance Margin Change', field: 'maintenance_margin_change', minWidth: 100, hozAlign: 'right', headerHozAlign: 'right',
          formatter: (cell: any) => {
            const value = cell.getValue()
            if (value === null || value === undefined || value === '') return '-'
            const numValue = parseFloat(value.replace(/,/g, ''))
            const color = numValue < 0 ? '#dc3545' : numValue > 0 ? '#28a745' : '#000'
            return `<span style="color:${color}">$${numValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
          }
        }
      ]
    })

    isTabulatorReady.value = true
    console.log('✅ Tabulator initialized successfully')
  } catch (error) {
    console.error('❌ Error creating Tabulator:', error)
  }
}

// Watch for BOTH data ready AND DOM ready
watch([() => q.isSuccess.value, tableDiv], async ([isSuccess, divRef]) => {
  console.log('👀 Watch triggered - isSuccess:', isSuccess, 'divRef:', !!divRef, 'isTableInitialized:', isTableInitialized.value)
  
  if (isSuccess && divRef && !isTableInitialized.value) {
    await nextTick()
    console.log('🎯 Conditions met, initializing table with', q.data.value?.length, 'rows')
    initializeTabulator()
    isTableInitialized.value = true
  }
}, { immediate: true })

// Watch for data changes after initialization
watch(() => q.data.value, async (newData) => {
  if (!tabulator || !newData) return
  
  console.log('🔄 Data changed, updating table with', newData.length, 'rows')
  
  try {
    await nextTick()
    tabulator.replaceData(newData)
  } catch (error) {
    console.warn('Error updating table data:', error)
    // If there's an error, rebuild the table
    initializeTabulator()
  }
}, { deep: true })

onMounted(() => {
  console.log('🎬 Component mounted')
  console.log('📊 Query state:', {
    isLoading: q.isLoading.value,
    isSuccess: q.isSuccess.value,
    isError: q.isError.value,
    dataLength: q.data.value?.length
  })
  
  // Try to initialize if data is already loaded
  if (q.isSuccess.value && tableDiv.value && !isTableInitialized.value) {
    nextTick(() => {
      console.log('🚀 Initializing on mount')
      initializeTabulator()
      isTableInitialized.value = true
    })
  }
})

onBeforeUnmount(() => {
  console.log('👋 Component unmounting, cleaning up')
  if (tabulator) {
    tabulator.destroy()
  }
  if (q._cleanup) {
    q._cleanup()
  }
})

// Add helper function for extracting symbol tags
function extractTagsFromSymbol(symbolText: string): string[] {
  if (!symbolText) return []
  const text = String(symbolText)
  const symMatch = text.match(/^([A-Z]+)\b/)
  const base = symMatch?.[1] ?? ''
  const rightMatch = text.match(/\s([CP])\b/)
  const right = rightMatch?.[1] ?? ''
  const strikeMatch = text.match(/\s(\d+(?:\.\d+)?)\s+[CP]\b/)
  const strike = strikeMatch?.[1] ?? ''
  const codeMatch = text.match(/\b(\d{6})[CP]/)
  const expiry = codeMatch ? formatExpiryFromYyMmDd(codeMatch[1]) : ''
  return [base, expiry, strike, right].filter(Boolean)
}

function formatExpiryFromYyMmDd(code: string): string {
  if (!code || code.length !== 6) return ''
  const yy = code.substring(0, 2)
  const mm = code.substring(2, 4)
  const dd = code.substring(4, 6)
  return `20${yy}-${mm}-${dd}`
}
</script>

<template>
  <div class="put-positions-for-single-instrument-view">
    <div class="positions-header">
      <h2>Put Positions - {{ symbolRoot }}</h2>
      <div v-if="q.isSuccess.value" class="positions-info">
        Found {{ q.data.value?.length || 0 }} position(s)
      </div>
    </div>

    <div v-if="q.isLoading.value" class="loading">
      <div class="loading-spinner"></div>
      Loading put positions...
    </div>
    
    <div v-else-if="q.isError.value" class="error">
      <h3>Error loading positions</h3>
      <p>{{ q.error.value }}</p>
    </div>
    
    <div v-else-if="q.isSuccess.value" class="positions-container">
      <div ref="tableDiv" class="tabulator-table"></div>
    </div>
  </div>
</template>

<style>
@import 'tabulator-tables/dist/css/tabulator_modern.min.css';
</style>

<style scoped>
.put-positions-for-single-instrument-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.positions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.positions-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.positions-info {
  padding: 0.375rem 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.loading, .error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 1rem;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #dc3545;
}

.error h3 {
  margin: 0 0 0.5rem 0;
}

.positions-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.tabulator-table {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
:deep(.fi-tag) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid #dbe2ea;
  border-radius: 999px;
  background: #f5f7fa;
  color: #425466;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 4px;
}
</style>

<style>
.tabulator {
  font-size: 13px;
  border: 1px solid #dee2e6;
  height: 100%;
}

.tabulator .tabulator-header {
  padding-left: 0 !important;
  background-color: #f5f5f5;
  border-bottom: 1px solid #dee2e6;
}

.tabulator .tabulator-header .tabulator-col {
  background-color: #f5f5f5;
  border-right: 1px solid #dee2e6;
}

.tabulator .tabulator-header .tabulator-col .tabulator-col-content {
  padding: 6px 8px;
}

.tabulator .tabulator-header .tabulator-col .tabulator-col-title {
  font-weight: 600;
  font-size: 12px;
  color: #333;
}

.tabulator-row {
  border-bottom: 1px solid #e9ecef;
  background-color: #fff;
}

.tabulator-row:hover {
  background-color: #f8f9fa !important;
}

.tabulator .tabulator-cell {
  padding: 6px 8px;
  font-size: 0.85rem;
  border-right: 1px solid #e9ecef;
}

.tabulator-row.tabulator-row-even {
  background-color: #fff;
}
</style>