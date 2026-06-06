<template>
  <view class="container">
    <view class="header">
      <text class="title">识别结果</text>
      <text class="subtitle">共 {{ totalCount }} 张发票，总金额 ¥{{ totalAmount.toFixed(2) }}</text>
    </view>

    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        <text class="tab-text">全部</text>
        <text class="tab-count">{{ totalCount }}</text>
      </view>
      <view 
        v-for="category in categories" 
        :key="category.key"
        class="tab-item" 
        :class="{ active: activeTab === category.key }"
        @click="activeTab = category.key"
      >
        <text class="tab-text">{{ category.name }}</text>
        <text class="tab-count">{{ getCategoryCount(category.key) }}</text>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="category-section" v-if="filteredInvoices.length > 0">
        <view class="category-header">
          <view class="category-info">
            <text class="category-icon">{{ getCategoryIcon(activeTab) }}</text>
            <text class="category-name">{{ getCategoryName(activeTab) }}</text>
          </view>
          <view class="category-summary">
            <text class="category-count">{{ filteredInvoices.length }} 张</text>
            <text class="category-amount">¥{{ getCategoryAmount(activeTab).toFixed(2) }}</text>
          </view>
        </view>

        <view class="invoice-list">
          <view 
            class="invoice-card" 
            v-for="(invoice, index) in filteredInvoices" 
            :key="invoice.id || index"
          >
            <view class="card-main">
              <view class="card-left" @click="toggleCard(invoice)">
                <view class="invoice-icon">{{ getCategoryIcon(invoice.category) }}</view>
                <view class="invoice-basic">
                  <text class="invoice-type">{{ invoice.type || '未知类型' }}</text>
                  <text class="invoice-amount">¥{{ (invoice.amount || 0).toFixed(2) }}</text>
                </view>
              </view>
              <view class="card-right">
                <text class="invoice-date">{{ invoice.date || '-' }}</text>
                <view class="action-btns">
                  <text class="expand-icon" @click="toggleCard(invoice)">{{ invoice.expanded ? '▼' : '▶' }}</text>
                  <text class="delete-btn" @click="deleteInvoice(invoice, index)">🗑️</text>
                </view>
              </view>
            </view>

            <view class="card-detail" v-if="invoice.expanded">
              <view class="detail-row">
                <text class="detail-label">发票号码</text>
                <text class="detail-value" @click="editField(invoice, 'number')">
                  {{ invoice.number || '-' }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>
              <view class="detail-row">
                <text class="detail-label">开票日期</text>
                <text class="detail-value" @click="editField(invoice, 'date')">
                  {{ invoice.date || '-' }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>
              <view class="detail-row">
                <text class="detail-label">不含税金额</text>
                <text class="detail-value" @click="editField(invoice, 'amountWithoutTax')">
                  ¥{{ (invoice.amountWithoutTax || 0).toFixed(2) }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>
              <view class="detail-row">
                <text class="detail-label">税额</text>
                <text class="detail-value" @click="editField(invoice, 'tax')">
                  ¥{{ (invoice.tax || 0).toFixed(2) }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>
              <view class="detail-row">
                <text class="detail-label">价税合计</text>
                <text class="detail-value" @click="editField(invoice, 'amount')">
                  ¥{{ (invoice.amount || 0).toFixed(2) }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>
              <view class="detail-row">
                <text class="detail-label">销售方</text>
                <text class="detail-value" @click="editField(invoice, 'seller')">
                  {{ invoice.seller || '-' }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>
              <view class="detail-row">
                <text class="detail-label">购买方</text>
                <text class="detail-value" @click="editField(invoice, 'buyer')">
                  {{ invoice.buyer || '-' }}
                  <text class="edit-icon">✏️</text>
                </text>
              </view>

              <view class="card-actions">
                <button class="btn-edit" @click="openEditModal(invoice)">编辑</button>
                <button class="btn-delete" @click="deleteInvoice(invoice, index)">删除</button>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="empty-state" v-else>
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无发票数据</text>
      </view>
    </scroll-view>

    <view class="footer-actions">
      <button class="btn-merge" @click="showMergeOptions" :disabled="isMerging">
        {{ isMerging ? mergeProgress : '下载整合PDF' }}
      </button>
      <button class="btn-export" @click="exportData" :disabled="isExporting">
        {{ isExporting ? '导出中...' : '导出Excel' }}
      </button>
      <button class="btn-back" @click="goBack">返回首页</button>
    </view>

    <view class="edit-modal" v-if="showEditModal" @tap.stop.prevent="stopPropagation">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">编辑 {{ editFieldLabel }}</text>
          <text class="modal-close" @tap="closeEditModal">×</text>
        </view>
        <view class="modal-body">
          <input 
            class="edit-input" 
            :value="editValue"
            @input="onEditInput"
            :placeholder="'请输入' + editFieldLabel"
            :type="editFieldType === 'amount' || editFieldType === 'tax' ? 'digit' : 'text'"
          />
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @tap="closeEditModal">取消</button>
          <button class="btn-confirm" @tap="saveEdit">保存</button>
        </view>
      </view>
    </view>

    <view class="edit-modal" v-if="showMergeModal" @tap.stop.prevent="stopPropagation">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择合并方式</text>
          <text class="modal-close" @tap="closeMergeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="merge-option" @tap="selectMergeOption(false)">
            <text class="merge-option-text">每页一张发票</text>
            <text class="merge-option-desc">每张发票独立显示在一页</text>
          </view>
          <view class="merge-option" @tap="selectMergeOption(true)">
            <text class="merge-option-text">两页合一</text>
            <text class="merge-option-desc">两张发票合并到一页，节省纸张</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      invoiceList: [],
      activeTab: 'all',
      categories: [
        { key: 'traffic', name: '交通', icon: '🚗' },
        { key: 'gas', name: '加油站', icon: '⛽' },
        { key: 'restaurant', name: '餐饮', icon: '🍽️' },
        { key: 'hotel', name: '酒店', icon: '🏨' },
        { key: 'other', name: '其他', icon: '📄' }
      ],
      showEditModal: false,
      showMergeModal: false,
      showExportModal: false,
      exportPassword: '',
      currentEditInvoice: null,
      editFieldType: '',
      editValue: '',
      editFieldLabel: '',
      isMerging: false,
      mergeProgress: '',
      isExporting: false,
      twoPerPage: true
    }
  },
  computed: {
    totalCount() {
      return this.invoiceList.length
    },
    totalAmount() {
      return this.invoiceList.reduce((sum, item) => sum + (item.amount || 0), 0)
    },
    filteredInvoices() {
      if (this.activeTab === 'all') {
        return this.sortByDate(this.invoiceList)
      }
      return this.sortByDate(this.invoiceList.filter(item => item.category === this.activeTab))
    }
  },
  onLoad(options) {
    if (options.data) {
      try {
        const data = JSON.parse(decodeURIComponent(options.data))
        this.invoiceList = this.processInvoices(data.invoices || data || [])
      } catch (e) {
        console.error('解析数据失败:', e)
        this.invoiceList = []
      }
    }
  },
  methods: {
    stopPropagation(e) {
      if (e && e.stopPropagation) {
        e.stopPropagation()
      }
    },
    processInvoices(invoices) {
      return invoices.map((invoice, index) => {
        const category = this.categorizeInvoice(invoice)
        return {
          ...invoice,
          id: invoice.id || `invoice_${Date.now()}_${index}`,
          category: category,
          expanded: false
        }
      })
    },

    categorizeInvoice(invoice) {
      const text = [
        invoice.type,
        invoice.seller,
        invoice.buyer,
        invoice.raw?.CommodityName || ''
      ].join(' ').toLowerCase()

      if (text.includes('通行费') || text.includes('高速公路') || 
          text.includes('etc') || text.includes('交通') ||
          text.includes('出租车') || text.includes('客运') ||
          text.includes('火车') || text.includes('航空') ||
          text.includes('机票') || text.includes('车票')) {
        return 'traffic'
      }

      if (text.includes('加油站') || text.includes('石油') || 
          text.includes('石化') || text.includes('加油') ||
          text.includes('汽油') || text.includes('柴油')) {
        return 'gas'
      }

      if (text.includes('餐饮') || text.includes('餐厅') || 
          text.includes('饭店') || text.includes('酒楼') ||
          text.includes('美食') || text.includes('外卖') ||
          text.includes('食品') || text.includes('快餐')) {
        return 'restaurant'
      }

      if (text.includes('酒店') || text.includes('宾馆') || 
          text.includes('住宿') || text.includes('旅馆') ||
          text.includes('民宿') || text.includes('公寓')) {
        return 'hotel'
      }

      return 'other'
    },

    sortByDate(invoices) {
      return [...invoices].sort((a, b) => {
        const dateA = this.parseDate(a.date)
        const dateB = this.parseDate(b.date)
        return dateA - dateB
      })
    },

    parseDate(dateStr) {
      if (!dateStr) return new Date(0)
      const cleaned = dateStr.replace(/[年月]/g, '-').replace(/日/g, '')
      return new Date(cleaned)
    },

    getCategoryCount(category) {
      if (category === 'all') return this.totalCount
      return this.invoiceList.filter(item => item.category === category).length
    },

    getCategoryAmount(category) {
      if (category === 'all') return this.totalAmount
      return this.invoiceList
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + (item.amount || 0), 0)
    },

    getCategoryName(category) {
      if (category === 'all') return '全部发票'
      const cat = this.categories.find(c => c.key === category)
      return cat ? cat.name : '其他'
    },

    getCategoryIcon(category) {
      if (category === 'all') return '📋'
      const cat = this.categories.find(c => c.key === category)
      return cat ? cat.icon : '📄'
    },

    toggleCard(invoice) {
      invoice.expanded = !invoice.expanded
    },

    editField(invoice, field) {
      this.currentEditInvoice = invoice
      this.editFieldType = field
      this.editValue = String(invoice[field] || '')
      
      const labels = {
        number: '发票号码',
        date: '开票日期',
        amountWithoutTax: '不含税金额',
        tax: '税额',
        amount: '价税合计',
        seller: '销售方',
        buyer: '购买方'
      }
      this.editFieldLabel = labels[field] || field
      this.showEditModal = true
    },

    closeEditModal() {
      this.showEditModal = false
      this.currentEditInvoice = null
      this.editFieldType = ''
      this.editValue = ''
    },
    
    onEditInput(e) {
      const value = e.detail ? e.detail.value : e.target?.value || ''
      this.editValue = value
    },

    saveEdit() {
      if (this.currentEditInvoice && this.editFieldType) {
        let value = this.editValue
        if (this.editFieldType === 'amount' || this.editFieldType === 'tax') {
          value = parseFloat(value) || 0
        }
        this.currentEditInvoice[this.editFieldType] = value
      }
      this.closeEditModal()
    },

    openEditModal(invoice) {
      this.editField(invoice, 'amount')
    },

    deleteInvoice(invoice, index) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条发票记录吗？',
        success: (res) => {
          if (res.confirm) {
            const idx = this.invoiceList.findIndex(item => item.id === invoice.id)
            if (idx > -1) {
              this.invoiceList.splice(idx, 1)
            }
            
            uni.$emit('invoiceDeleted', invoice)
          }
        }
      })
    },

    exportData() {
      if (this.invoiceList.length === 0) {
        uni.showToast({
          title: '暂无发票数据',
          icon: 'none'
        })
        return
      }
      
      this.doExportExcel('')
    },
    
    async doExportExcel(password = '') {
      this.isExporting = true
      uni.showLoading({ title: '正在导出...' })
      
      try {
        const res = await uni.cloud.callFunction({
          name: 'exportExcel',
          data: {
            invoices: this.invoiceList,
            password: password
          }
        })
        
        console.log('导出结果:', res)
        
        uni.hideLoading()
        
        if (res.result.code !== 0) {
          throw new Error(res.result.message)
        }
        
        const { tempUrl, fileName, invoiceCount, templateUsed } = res.result.data
        
        let toastMsg = `导出成功，共${invoiceCount}条`
        if (templateUsed === 'custom') {
          toastMsg += '（定制模板）'
        }
        
        uni.showToast({
          title: toastMsg,
          icon: 'success'
        })
        
        // #ifdef H5
        this.downloadExcelInH5(tempUrl, fileName)
        // #endif
        
        // #ifdef MP-WEIXIN
        this.downloadExcelInMiniProgram(tempUrl, fileName)
        // #endif
        
      } catch (err) {
        uni.hideLoading()
        console.error('导出失败:', err)
        uni.showToast({
          title: err.message || '导出失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.isExporting = false
      }
    },
    
    // #ifdef H5
    downloadExcelInH5(url, fileName) {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      uni.showToast({ title: '下载已开始', icon: 'success' })
    },
    // #endif
    
    // #ifdef MP-WEIXIN
    async downloadExcelInMiniProgram(url, fileName) {
      try {
        uni.showLoading({ title: '正在下载...' })
        
        const downloadRes = await new Promise((resolve, reject) => {
          uni.downloadFile({ url: url, fileName: fileName, success: resolve, fail: reject })
        })
        
        uni.hideLoading()
        
        if (downloadRes.statusCode === 200) {
          const tempFilePath = downloadRes.tempFilePath
          
          uni.showToast({ title: '下载完成', icon: 'success' })
          
          setTimeout(() => {
            uni.openDocument({
              filePath: tempFilePath,
              fileType: 'xlsx',
              showMenu: true
            })
          }, 500)
        } else {
          throw new Error('下载失败')
        }
      } catch (err) {
        uni.hideLoading()
        uni.showModal({
          title: '下载失败',
          content: '请检查网络连接，或尝试在H5端下载',
          showCancel: false
        })
      }
    },
    // #endif

    convertToCSV(data) {
      if (data.length === 0) return ''
      const headers = Object.keys(data[0])
      const rows = data.map(item => 
        headers.map(h => {
          const val = String(item[h] || '')
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
        }).join(',')
      )
      return [headers.join(','), ...rows].join('\n')
    },

    goBack() {
      uni.navigateBack()
    },
    
    showMergeOptions() {
      if (this.invoiceList.length === 0) {
        uni.showToast({
          title: '暂无发票数据',
          icon: 'none'
        })
        return
      }
      
      const invoicesWithFile = this.invoiceList.filter(inv => inv.fileID)
      if (invoicesWithFile.length === 0) {
        uni.showToast({
          title: '没有可合并的PDF文件',
          icon: 'none'
        })
        return
      }
      
      this.showMergeModal = true
    },
    
    closeMergeModal() {
      this.showMergeModal = false
    },
    
    selectMergeOption(twoPerPage) {
      this.twoPerPage = twoPerPage
      this.showMergeModal = false
      
      const invoicesWithFile = this.invoiceList.filter(inv => inv.fileID)
      this.doMergePdf(invoicesWithFile)
    },
    
    async mergePdfs() {
      if (this.invoiceList.length === 0) {
        uni.showToast({
          title: '暂无发票数据',
          icon: 'none'
        })
        return
      }
      
      const invoicesWithFile = this.invoiceList.filter(inv => inv.fileID)
      if (invoicesWithFile.length === 0) {
        uni.showToast({
          title: '没有可合并的PDF文件',
          icon: 'none'
        })
        return
      }
      
      this.doMergePdf(invoicesWithFile)
    },
    
    async doMergePdf(invoicesWithFile) {
      this.isMerging = true
      this.mergeProgress = '正在合并...'
      
      try {
        const res = await uni.cloud.callFunction({
          name: 'mergePdf',
          data: {
            fileIDs: invoicesWithFile.map(inv => inv.fileID),
            invoices: invoicesWithFile,
            twoPerPage: this.twoPerPage
          }
        })
        
        console.log('合并结果:', res)
        
        if (res.result.code !== 0) {
          throw new Error(res.result.message)
        }
        
        const { tempUrl, pageCount, fileName } = res.result.data
        
        this.mergeProgress = `合并完成，共${pageCount}页`
        
        // #ifdef H5
        this.downloadInH5(tempUrl, fileName)
        // #endif
        
        // #ifdef MP-WEIXIN
        this.downloadInMiniProgram(tempUrl, fileName)
        // #endif
        
      } catch (err) {
        console.error('合并失败:', err)
        uni.showToast({
          title: err.message || '合并失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.isMerging = false
        this.mergeProgress = '准备中...'
      }
    },
    
    // #ifdef H5
    downloadInH5(url, fileName) {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      uni.showToast({
        title: '下载已开始',
        icon: 'success'
      })
    },
    // #endif
    
    // #ifdef MP-WEIXIN
    async downloadInMiniProgram(url, fileName) {
      try {
        uni.showLoading({
          title: '正在下载...'
        })
        
        const downloadRes = await new Promise((resolve, reject) => {
          uni.downloadFile({
            url: url,
            fileName: fileName,
            success: resolve,
            fail: reject
          })
        })
        
        uni.hideLoading()
        
        if (downloadRes.statusCode === 200) {
          const tempFilePath = downloadRes.tempFilePath
          
          uni.showToast({
            title: '下载完成',
            icon: 'success'
          })
          
          setTimeout(() => {
            uni.openDocument({
              filePath: tempFilePath,
              fileType: 'pdf',
              showMenu: true
            })
          }, 500)
        } else {
          throw new Error('下载失败')
        }
      } catch (err) {
        uni.hideLoading()
        console.error('下载失败:', err)
        uni.showModal({
          title: '下载失败',
          content: '请检查网络连接，或尝试在H5端下载',
          showCancel: false
        })
      }
    }
    // #endif
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #4A90D9 0%, #6BA3E0 100%);
  color: #fff;
  box-shadow: 0 8rpx 32rpx rgba(74, 144, 217, 0.3);

  .title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }

  .subtitle {
    display: block;
    font-size: 28rpx;
    opacity: 0.95;
    font-weight: 400;
  }
}

.tabs {
  display: flex;
  padding: 24rpx 20rpx;
  background-color: #fff;
  overflow-x: auto;
  white-space: nowrap;
  border-bottom: 2rpx solid #f0f0f0;

  .tab-item {
    display: inline-flex;
    align-items: center;
    padding: 18rpx 28rpx;
    margin-right: 16rpx;
    border-radius: 40rpx;
    background-color: #f5f7fa;
    transition: all 0.3s ease;
    flex-shrink: 0;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

    &.active {
      background: linear-gradient(135deg, #4A90D9, #6BA3E0);
      box-shadow: 0 4rpx 16rpx rgba(74, 144, 217, 0.3);
      .tab-text, .tab-count {
        color: #fff;
      }
    }

    .tab-text {
      font-size: 28rpx;
      color: #666;
      font-weight: 500;
    }

    .tab-count {
      margin-left: 10rpx;
      font-size: 24rpx;
      color: #999;
      background-color: rgba(0,0,0,0.08);
      padding: 4rpx 14rpx;
      border-radius: 20rpx;
      font-weight: 500;
    }
  }
}

.content {
  flex: 1;
  padding: 24rpx;
  padding-bottom: 180rpx;
}

.category-section {
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28rpx 30rpx;
    background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
    border-radius: 16rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

    .category-info {
      display: flex;
      align-items: center;

      .category-icon {
        font-size: 44rpx;
        margin-right: 16rpx;
      }

      .category-name {
        font-size: 32rpx;
        font-weight: 600;
        color: #333;
      }
    }

    .category-summary {
      text-align: right;

      .category-count {
        display: block;
        font-size: 26rpx;
        color: #999;
      }

      .category-amount {
        display: block;
        font-size: 34rpx;
        font-weight: 700;
        color: #FF4D4F;
        margin-top: 4rpx;
      }
    }
  }
}

.invoice-list {
  .invoice-card {
    background-color: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
    
    &:active {
      transform: scale(0.99);
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
    }

    .card-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 28rpx;

      .card-left {
        display: flex;
        align-items: center;

        .invoice-icon {
          width: 90rpx;
          height: 90rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48rpx;
          background: linear-gradient(135deg, #f0f5ff, #e6f0ff);
          border-radius: 16rpx;
          margin-right: 24rpx;
          border: 2rpx solid rgba(74, 144, 217, 0.1);
        }

        .invoice-basic {
          .invoice-type {
            display: block;
            font-size: 30rpx;
            font-weight: 600;
            color: #333;
            margin-bottom: 8rpx;
          }

          .invoice-amount {
            display: block;
            font-size: 36rpx;
            font-weight: 700;
            color: #FF4D4F;
          }
        }
      }

      .card-right {
        text-align: right;

        .invoice-date {
          display: block;
          font-size: 26rpx;
          color: #999;
          margin-bottom: 12rpx;
        }

        .action-btns {
          display: flex;
          align-items: center;
          gap: 16rpx;

          .expand-icon {
            font-size: 26rpx;
            color: #ccc;
            padding: 10rpx;
          }

          .delete-btn {
            font-size: 32rpx;
            padding: 10rpx;
            opacity: 0.5;
            
            &:active {
              opacity: 0.9;
            }
          }
        }
      }
    }

    .card-detail {
      padding: 0 28rpx 28rpx;
      border-top: 2rpx dashed #f0f0f0;

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20rpx 0;
        border-bottom: 2rpx solid #f8f8f8;

        &:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 28rpx;
          color: #999;
          width: 140rpx;
        }

        .detail-value {
          font-size: 28rpx;
          color: #333;
          flex: 1;
          text-align: right;
          display: flex;
          justify-content: flex-end;
          align-items: center;

          .edit-icon {
            margin-left: 12rpx;
            font-size: 22rpx;
            opacity: 0.4;
          }
        }
      }

      .card-actions {
        display: flex;
        margin-top: 24rpx;
        gap: 24rpx;
        padding-top: 20rpx;
        border-top: 2rpx solid #f8f8f8;

        button {
          flex: 1;
          height: 80rpx;
          line-height: 80rpx;
          font-size: 28rpx;
          border-radius: 40rpx;
          border: none;
          font-weight: 500;
          
          &::after {
            border: none;
          }
        }

        .btn-edit {
          background: linear-gradient(135deg, #4A90D9, #6BA3E0);
          color: #fff;
          box-shadow: 0 4rpx 16rpx rgba(74, 144, 217, 0.3);
          
          &:active {
            transform: scale(0.96);
          }
        }

        .btn-delete {
          background: rgba(255, 77, 79, 0.08);
          color: #FF4D4F;
          border: 2rpx solid rgba(255, 77, 79, 0.2);
          
          &:active {
            background: rgba(255, 77, 79, 0.15);
          }
        }
      }
    }
  }
}

.empty-state {
  text-align: center;
  padding: 120rpx 40rpx;

  .empty-icon {
    width: 160rpx;
    height: 160rpx;
    background: #f5f7fa;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 30rpx;
    font-size: 64rpx;
  }

  .empty-text {
    display: block;
    font-size: 32rpx;
    color: #666;
    margin-bottom: 12rpx;
  }
  
  .empty-hint {
    display: block;
    font-size: 26rpx;
    color: #999;
  }
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.08);
  gap: 20rpx;
  z-index: 100;

  button {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 28rpx;
    border-radius: 44rpx;
    border: none;
    margin: 0;
    padding: 0;
    font-weight: 500;
    
    &::after {
      border: none;
    }
    
    &[disabled] {
      opacity: 0.5;
    }
  }

  .btn-merge {
    background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
    color: #fff;
    box-shadow: 0 6rpx 24rpx rgba(114, 46, 209, 0.35);
    
    &:active {
      transform: scale(0.96);
    }
  }

  .btn-export {
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
    color: #fff;
    box-shadow: 0 6rpx 24rpx rgba(82, 196, 26, 0.35);
    
    &:active {
      transform: scale(0.96);
    }
  }

  .btn-back {
    background: linear-gradient(135deg, #4A90D9 0%, #6BA3E0 100%);
    color: #fff;
    box-shadow: 0 6rpx 24rpx rgba(74, 144, 217, 0.35);
    
    &:active {
      transform: scale(0.96);
    }
  }
}

.edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    width: 85%;
    max-width: 640rpx;
    background-color: #fff;
    border-radius: 20rpx;
    overflow: hidden;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(40rpx);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    border-bottom: 2rpx solid #f5f5f5;

    .modal-title {
      font-size: 34rpx;
      font-weight: 600;
      color: #333;
    }

    .modal-close {
      font-size: 48rpx;
      color: #ccc;
      line-height: 1;
      padding: 8rpx;
    }
  }

  .modal-body {
    padding: 32rpx;

    .edit-input {
      width: 100%;
      height: 88rpx;
      padding: 0 28rpx;
      font-size: 30rpx;
      border: 2rpx solid #e8e8e8;
      border-radius: 12rpx;
      box-sizing: border-box;
      background: #fafafa;
      
      &:focus {
        border-color: #4A90D9;
        background: #fff;
      }
    }
    
    .input-hint {
      display: block;
      margin-top: 12rpx;
      font-size: 24rpx;
      color: #999;
      text-align: right;
    }
    
    .merge-option {
      padding: 28rpx;
      border: 2rpx solid #e8e8e8;
      border-radius: 16rpx;
      margin-bottom: 20rpx;
      transition: all 0.3s ease;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &:active {
        background-color: #f8fbff;
        border-color: #4A90D9;
        transform: scale(0.98);
      }
      
      .merge-option-text {
        display: block;
        font-size: 32rpx;
        font-weight: 600;
        color: #333;
        margin-bottom: 12rpx;
      }
      
      .merge-option-desc {
        display: block;
        font-size: 26rpx;
        color: #999;
        line-height: 1.5;
      }
    }
  }

  .modal-footer {
    display: flex;
    border-top: 2rpx solid #f5f5f5;

    button {
      flex: 1;
      height: 96rpx;
      line-height: 96rpx;
      font-size: 32rpx;
      border: none;
      border-radius: 0;
      background-color: transparent;
      font-weight: 500;

      &::after {
        border: none;
      }
    }

    .btn-cancel {
      color: #999;
      border-right: 2rpx solid #f5f5f5;
    }

    .btn-confirm {
      color: #4A90D9;
    }
  }
}
</style>
