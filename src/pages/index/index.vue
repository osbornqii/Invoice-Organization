<template>
  <view class="container">
    <view class="header">
      <text class="title">票据管理系统</text>
      <text class="subtitle">支持批量上传 PDF 文件进行票据识别与整理</text>
    </view>

    <view class="card upload-area" :class="{ 'drag-over': isDragOver }">
      <view class="upload-icon">
        <text>📁</text>
      </view>
      <text class="upload-text">点击或拖拽文件到此处上传</text>
      <text class="upload-hint">支持 PDF 格式，单个文件不超过 10MB</text>
      
      <!-- #ifdef H5 -->
      <input 
        ref="fileInput"
        type="file" 
        multiple 
        accept=".pdf,application/pdf"
        class="hidden-input"
        @change="handleFileChange"
      />
      <!-- #endif -->
      
      <view class="upload-buttons">
        <button class="upload-btn" @click="chooseFile">选择文件</button>
      </view>
    </view>

    <view class="progress-tip" v-if="isProcessing">
      <view class="progress-icon"></view>
      <text class="progress-text">{{ processingMessage }}</text>
    </view>

    <view v-if="fileList.length > 0">
      <view class="file-list-header" style="display: flex; justify-content: space-between; align-items: center;">
        <text class="file-list-title">已选文件 ({{ fileList.length }})</text>
        <text class="clear-btn" @click="clearFiles" style="font-size: 26rpx; color: #4A90D9; padding: 8rpx 16rpx;">清空</text>
      </view>
      
      <view 
        class="card file-item" 
        v-for="(file, index) in fileList" 
        :key="file.id"
      >
        <view class="file-main" @click="toggleFileExpand(file)">
          <view class="file-info">
            <view class="file-icon-wrapper">
              <text>PDF</text>
            </view>
            <view class="file-detail">
              <text class="file-name">{{ file.name }}</text>
              <text class="file-meta">
                {{ formatFileSize(file.size) }} · {{ file.totalPages || 0 }} 页
              </text>
            </view>
          </view>
          <view class="file-status">
            <text class="status-tag" :class="file.status">{{ getStatusText(file.status) }}</text>
          </view>
        </view>
        
        <view class="progress-bar" v-if="file.status === 'uploading' || file.status === 'processing'">
          <view class="progress-fill" :style="{ width: file.progress + '%' }"></view>
        </view>
        
        <view class="error-tip" v-if="file.error">
          <text class="error-text">{{ file.error }}</text>
        </view>
        
        <view class="file-pages" v-if="file.expanded && file.pages.length > 0">
          <view class="pages-header">
            <text class="pages-title">页面预览 ({{ file.pages.length }})</text>
          </view>
          <scroll-view class="pages-scroll" scroll-x>
            <view class="page-item" v-for="(page, pIndex) in file.pages" :key="pIndex">
              <image class="page-image" :src="page.imageUrl" mode="aspectFit"></image>
              <text class="page-num">第 {{ page.pageNum }} 页</text>
            </view>
          </scroll-view>
        </view>
        
        <view class="file-actions">
          <text class="delete-btn" @click="removeFile(index)" style="color: #4A90D9;">删除</text>
        </view>
      </view>
    </view>

    <view class="action-area" v-if="fileList.length > 0 && !isProcessing">
      <button 
        class="btn-primary btn-upload" 
        @click="processFiles"
        :disabled="isProcessing"
      >
        开始解析 ({{ fileList.length }} 个文件)
      </button>
    </view>

    <view class="result-area">
      <view class="result-header">
        <text class="result-title">处理结果</text>
        <text class="clear-btn" v-if="results.length > 0" @click="clearResults">清空</text>
      </view>
      
      <view class="result-content" v-if="results.length > 0">
        <view class="result-item" v-for="(item, index) in results" :key="index" @click="goToResult(item)">
          <view class="result-info">
            <text class="result-name">{{ item.fileName }}</text>
            <text class="result-status" :class="item.status">{{ item.statusText }}</text>
          </view>
          <text class="result-arrow">→</text>
        </view>
      </view>
      
      <view class="result-empty" v-else>
        <view class="empty-icon">
          <text>📋</text>
        </view>
        <text class="empty-text">{{ resultHint || '暂无处理结果' }}</text>
        <text class="empty-hint">{{ resultHint ? '' : '上传文件后将在此显示处理结果' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { 
  validateFile, 
  formatFileSize as formatSize, 
  generateFileId, 
  createFileInfo,
  pdfToImages 
} from '@/utils/pdf.js'

export default {
  data() {
    return {
      isDragOver: false,
      fileList: [],
      results: [],
      isProcessing: false,
      processingMessage: '',
      allInvoices: [],
      resultHint: ''
    }
  },
  onLoad() {
    uni.$on('invoiceDeleted', this.handleInvoiceDeleted)
  },
  onUnload() {
    uni.$off('invoiceDeleted', this.handleInvoiceDeleted)
  },
  methods: {
    handleInvoiceDeleted(deletedInvoice) {
      const idx = this.allInvoices.findIndex(item => item.id === deletedInvoice.id)
      if (idx > -1) {
        this.allInvoices.splice(idx, 1)
      }
      
      this.results = this.results.filter(result => {
        if (result.invoices) {
          const invoiceIdx = result.invoices.findIndex(inv => inv.id === deletedInvoice.id)
          if (invoiceIdx > -1) {
            result.invoices.splice(invoiceIdx, 1)
            if (result.invoices.length === 0) {
              return false
            }
          }
        }
        return true
      })
    },
    handleClickUpload() {
      // #ifdef H5
      this.$refs.fileInput?.click()
      // #endif
    },
    
    handleDragEnter(e) {
      // #ifdef H5
      this.isDragOver = true
      // #endif
    },
    
    handleDragOver(e) {
      // #ifdef H5
      this.isDragOver = true
      // #endif
    },
    
    handleDragLeave(e) {
      // #ifdef H5
      this.isDragOver = false
      // #endif
    },
    
    handleDrop(e) {
      // #ifdef H5
      this.isDragOver = false
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        this.handleFilesSelect(files)
      }
      // #endif
    },
    
    handleFileChange(e) {
      const files = e.target?.files
      if (files && files.length > 0) {
        this.handleFilesSelect(files)
      }
      e.target.value = ''
    },
    
    chooseFile() {
      // #ifdef H5
      try {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.multiple = true
        fileInput.accept = '.pdf,application/pdf'
        fileInput.onchange = (e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            this.handleFilesSelect(files)
          }
        }
        fileInput.click()
      } catch (error) {
        console.error('文件选择失败:', error)
        uni.showToast({
          title: '无法打开文件选择器',
          icon: 'none'
        })
      }
      // #endif
      
      // #ifdef MP-WEIXIN
      uni.showModal({
        title: '选择PDF文件',
        content: '请先在微信聊天中发送PDF文件，然后点击"选择"',
        confirmText: '选择',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.chooseFromChat()
          }
        }
      })
      // #endif
    },
    
    chooseFromChat() {
      wx.chooseMessageFile({
        count: 10,
        type: 'file',
        extension: ['pdf'],
        success: (res) => {
          this.handleFilesSelect(res.tempFiles, 'weixin')
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) {
            return
          }
          uni.showModal({
            title: '选择失败',
            content: '请先在微信聊天中发送PDF文件，然后重新选择。',
            showCancel: false
          })
        }
      })
    },
    
    async handleFilesSelect(files, source = 'h5') {
      const fileArray = Array.from(files)
      let addedCount = 0
      
      for (const file of fileArray) {
        const validation = validateFile(file)
        
        if (!validation.valid) {
          uni.showToast({
            title: validation.errors[0],
            icon: 'none',
            duration: 2000
          })
          continue
        }
        
        const exists = this.fileList.some(f => f.name === file.name)
        if (exists) {
          continue
        }
        
        const fileInfo = createFileInfo(file, source)
        this.fileList.push(fileInfo)
        addedCount++
      }
      
      if (addedCount > 0) {
        uni.showToast({
          title: `已添加 ${addedCount} 个文件`,
          icon: 'success'
        })
      }
    },
    
    toggleFileExpand(file) {
      file.expanded = !file.expanded
    },
    
    removeFile(index) {
      const file = this.fileList[index]
      if (file.status === 'uploading' || file.status === 'processing') {
        uni.showToast({
          title: '文件处理中，无法删除',
          icon: 'none'
        })
        return
      }
      this.fileList.splice(index, 1)
    },
    
    clearFiles() {
      const processingFiles = this.fileList.filter(
        f => f.status === 'uploading' || f.status === 'processing'
      )
      
      if (processingFiles.length > 0) {
        uni.showToast({
          title: '有文件正在处理中',
          icon: 'none'
        })
        return
      }
      
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有已选文件吗？',
        success: (res) => {
          if (res.confirm) {
            this.fileList = []
          }
        }
      })
    },
    
    clearResults() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有处理结果吗？',
        success: (res) => {
          if (res.confirm) {
            this.results = []
            this.allInvoices = []
          }
        }
      })
    },
    
    async processFiles() {
      if (this.fileList.length === 0) {
        uni.showToast({
          title: '请先选择文件',
          icon: 'none'
        })
        return
      }
      
      this.isProcessing = true
      
      for (let i = 0; i < this.fileList.length; i++) {
        const file = this.fileList[i]
        
        if (file.status === 'completed') {
          continue
        }
        
        file.status = 'processing'
        file.progress = 0
        this.processingMessage = `正在解析 ${file.name}...`
        
        try {
          const result = await this.convertPdfToImages(file)
          
          if (result.success) {
            file.status = 'completed'
            file.progress = 100
            file.totalPages = result.totalPages
            file.pages = result.images
            
            const hasValidInvoice = result.invoices && result.invoices.length > 0 && result.invoices.some(inv => inv.amount > 0 || inv.number || inv.date)
            
            this.results.unshift({
              id: file.id,
              fileName: file.name,
              status: hasValidInvoice ? 'success' : 'warning',
              statusText: hasValidInvoice ? '解析成功' : '未识别到发票',
              pages: result.images,
              totalPages: result.totalPages,
              fileID: result.fileID,
              invoices: result.invoices
            })
          } else {
            file.status = 'error'
            file.error = result.error || '解析失败'
          }
        } catch (error) {
          file.status = 'error'
          file.error = error.message || '解析失败'
        }
      }
      
      this.isProcessing = false
      this.processingMessage = ''
      
      const successCount = this.fileList.filter(f => f.status === 'completed').length
      
      if (successCount > 0) {
        this.allInvoices = []
        this.fileList.forEach(file => {
          if (file.invoices && file.invoices.length > 0) {
            this.allInvoices.push(...file.invoices)
          }
        })
        
        const validInvoices = this.allInvoices.filter(inv => inv.amount > 0 || inv.number || inv.date)
        
        if (validInvoices.length > 0) {
          this.allInvoices = validInvoices
          this.results = this.results.map(result => ({
            ...result,
            invoices: this.allInvoices.filter(inv => inv.fileId === result.id)
          }))
          
          uni.navigateTo({
            url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify({ invoices: this.allInvoices }))}`
          })
        } else {
          this.resultHint = '未识别到有效发票信息，请上传发票PDF文件'
        }
      } else {
        this.resultHint = '解析失败，请检查文件格式'
      }
    },
    
    async convertPdfToImages(file) {
      // #ifdef H5
      return new Promise(async (resolve) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const pdfjsLib = await import('pdfjs-dist')
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'
            
            const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise
            const totalPages = pdf.numPages
            const images = []
            const invoices = []
            
            for (let i = 1; i <= totalPages; i++) {
              const progress = Math.round((i / totalPages) * 100)
              file.progress = progress
              
              const page = await pdf.getPage(i)
              const scale = 2
              const viewport = page.getViewport({ scale })
              
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')
              canvas.width = viewport.width
              canvas.height = viewport.height
              
              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise
              
              const imageUrl = canvas.toDataURL('image/jpeg', 0.8)
              const base64Data = imageUrl.split(',')[1]
              
              images.push({
                pageNum: i,
                imageUrl: imageUrl,
                width: viewport.width,
                height: viewport.height
              })
              
              try {
                const invoice = await this.recognizeInvoiceH5(base64Data)
                if (invoice) {
                  invoices.push(invoice)
                }
              } catch (ocrError) {
                console.error('OCR 识别失败:', ocrError)
              }
            }
            
            file.invoices = invoices
            
            resolve({
              success: true,
              totalPages,
              images,
              invoices
            })
          } catch (error) {
            resolve({
              success: false,
              error: error.message || 'PDF 解析失败'
            })
          }
        }
        reader.onerror = () => {
          resolve({
            success: false,
            error: '文件读取失败'
          })
        }
        reader.readAsArrayBuffer(file.rawFile)
      })
      // #endif
      
      // #ifdef MP-WEIXIN
      return new Promise(async (resolve) => {
        try {
          file.status = 'uploading'
          file.progress = 0
          
          const uploadRes = await new Promise((res, rej) => {
            wx.cloud.uploadFile({
              cloudPath: `pdf/${Date.now()}_${file.name}`,
              filePath: file.path,
              success: (result) => res(result),
              fail: (err) => rej(err)
            })
          })
          
          file.progress = 50
          file.status = 'processing'
          
          const result = await wx.cloud.callFunction({
            name: 'pdf2img',
            data: {
              fileID: uploadRes.fileID
            }
          })
          
          file.progress = 100
          file.fileID = uploadRes.fileID
          
          if (result.result.code === 0) {
            file.invoices = result.result.data.invoices || []
            file.invoices.forEach(inv => {
              inv.fileID = uploadRes.fileID
              inv.fileName = file.name
            })
            
            resolve({
              success: true,
              totalPages: result.result.data.totalPages,
              images: result.result.data.images,
              invoices: result.result.data.invoices,
              fileID: uploadRes.fileID
            })
          } else {
            resolve({
              success: false,
              error: result.result.message || 'PDF 解析失败'
            })
          }
        } catch (error) {
          resolve({
            success: false,
            error: error.message || 'PDF 解析失败'
          })
        }
      })
      // #endif
    },
    
    async recognizeInvoiceH5(imageBase64) {
      const BAIDU_API_KEY = 'd5lWBiRSoqSmKYS6feYpxCWF'
      const BAIDU_SECRET_KEY = 'SOETJIV9UnnCPsetIB6n7y6yRCkgRP0D'
      
      try {
        const tokenRes = await fetch(
          `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
        )
        const tokenData = await tokenRes.json()
        
        if (!tokenData.access_token) {
          return null
        }
        
        const accessToken = tokenData.access_token
        
        const ocrRes = await fetch(
          `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `image=${encodeURIComponent(imageBase64)}`
          }
        )
        
        const ocrData = await ocrRes.json()
        
        if (ocrData.error_code) {
          const generalRes = await fetch(
            `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `image=${encodeURIComponent(imageBase64)}`
            }
          )
          const generalData = await generalRes.json()
          
          if (generalData.words_result && generalData.words_result.length > 0) {
            return this.parseInvoiceFromWords(generalData.words_result)
          }
          
          return null
        }
        
        if (ocrData.words_result) {
          const result = ocrData.words_result
          return {
            type: result.InvoiceType || '增值税发票',
            number: result.InvoiceNum || '',
            date: result.InvoiceDate || '',
            amount: parseFloat(result.TotalAmount) || 0,
            tax: parseFloat(result.TotalTax) || 0,
            seller: result.SellerName || '',
            buyer: result.PurchaserName || '',
            sellerTaxId: result.SellerRegisterNum || '',
            buyerTaxId: result.PurchaserRegisterNum || '',
            raw: result
          }
        }
        
        return null
      } catch (error) {
        return null
      }
    },
    
    parseInvoiceFromWords(wordsResult) {
      const words = wordsResult.map(item => item.words)
      const invoice = {
        type: '未知类型',
        number: '',
        date: '',
        amount: 0,
        tax: 0,
        seller: '',
        buyer: ''
      }
      
      for (const word of words) {
        if (word.includes('增值税') || word.includes('发票')) {
          if (word.includes('专用')) {
            invoice.type = '增值税专用发票'
          } else if (word.includes('普通')) {
            invoice.type = '增值税普通发票'
          } else if (word.includes('电子')) {
            invoice.type = '电子发票'
          }
        }
        
        const numMatch = word.match(/发票号码[：:]*\s*(\d+)/)
        if (numMatch) invoice.number = numMatch[1]
        
        const dateMatch = word.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/)
        if (dateMatch && !invoice.date) invoice.date = dateMatch[1]
        
        const amountMatch = word.match(/[金额合计][：:]*\s*([\d,]+\.?\d*)/)
        if (amountMatch) invoice.amount = parseFloat(amountMatch[1].replace(/,/g, '')) || 0
      }
      
      return invoice
    },
    
    getStatusText(status) {
      const statusMap = {
        pending: '等待处理',
        uploading: '上传中',
        processing: '解析中',
        completed: '已完成',
        error: '解析失败'
      }
      return statusMap[status] || status
    },
    
    formatFileSize(bytes) {
      return formatSize(bytes)
    },
    
    goToResult(item) {
      const invoices = this.allInvoices.length > 0 ? this.allInvoices : (item.invoices || [])
      uni.navigateTo({
        url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify({ invoices }))}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  padding: 30rpx;
  padding-bottom: 160rpx;
}

.header {
  text-align: center;
  padding: 60rpx 0 40rpx;
  
  .title {
    display: block;
    font-size: 52rpx;
    font-weight: 700;
    color: #333;
    margin-bottom: 16rpx;
    background: linear-gradient(135deg, #4A90D9, #6BA3E0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .subtitle {
    display: block;
    font-size: 28rpx;
    color: #999;
  }
}

.upload-area {
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  border: 4rpx dashed #E8E8E8;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  
  &.drag-over {
    border-color: #4A90D9;
    background: rgba(74, 144, 217, 0.05);
    transform: scale(1.02);
  }
  
  .upload-icon {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #4A90D9, #6BA3E0);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 30rpx;
    box-shadow: 0 12rpx 32rpx rgba(74, 144, 217, 0.3);
    
    text {
      font-size: 56rpx;
    }
  }
  
  .upload-text {
    display: block;
    font-size: 32rpx;
    color: #333;
    font-weight: 500;
    margin-bottom: 12rpx;
  }
  
  .upload-hint {
    display: block;
    font-size: 24rpx;
    color: #999;
  }
  
  .hidden-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  
  .upload-buttons {
    display: flex;
    gap: 20rpx;
    margin-top: 30rpx;
    justify-content: center;
  }
  
  .upload-btn {
    background: linear-gradient(135deg, #4A90D9, #6BA3E0);
    color: #fff;
    border: none;
    border-radius: 40rpx;
    padding: 24rpx 56rpx;
    font-size: 30rpx;
    font-weight: 500;
    box-shadow: 0 8rpx 24rpx rgba(74, 144, 217, 0.35);
    
    &:active {
      transform: scale(0.96);
    }
  }
}

.progress-tip {
  background: linear-gradient(135deg, #E6F7FF 0%, #F0F8FF 100%);
  border: 2rpx solid #91D5FF;
  border-radius: 12rpx;
  padding: 24rpx 30rpx;
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  
  .progress-icon {
    width: 40rpx;
    height: 40rpx;
    border: 3rpx solid #4A90D9;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 16rpx;
  }
  
  .progress-text {
    font-size: 28rpx;
    color: #1890ff;
    flex: 1;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.file-list {
  margin-top: 30rpx;
  
  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8rpx;
    margin-bottom: 20rpx;
    
    .file-list-title {
      font-size: 30rpx;
      color: #333;
      font-weight: 600;
    }
    
    .clear-btn {
      font-size: 26rpx;
      color: #4A90D9;
      padding: 8rpx 16rpx;
    }
  }
  
  .file-item {
    margin-bottom: 16rpx;
    
    .file-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .file-info {
      display: flex;
      align-items: flex-start;
      flex: 1;
      
      .file-icon-wrapper {
        width: 80rpx;
        height: 80rpx;
        background: linear-gradient(135deg, #4A90D9, #6BA3E0);
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;
        flex-shrink: 0;
        
        text {
          font-size: 36rpx;
          color: #fff;
          font-weight: bold;
        }
      }
      
      .file-detail {
        flex: 1;
        
        .file-name {
          display: block;
          font-size: 28rpx;
          color: #333;
          font-weight: 500;
          margin-bottom: 8rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .file-meta {
          font-size: 24rpx;
          color: #999;
        }
      }
    }
    
    .file-status {
      display: flex;
      align-items: center;
      margin-left: 16rpx;
      
      .status-tag {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        margin-right: 12rpx;
        
        &.pending { background: rgba(153, 153, 153, 0.1); color: #999; }
        &.uploading { background: rgba(250, 173, 20, 0.1); color: #FAAD14; }
        &.processing { background: rgba(74, 144, 217, 0.1); color: #4A90D9; }
        &.completed { background: rgba(82, 196, 26, 0.1); color: #52C41A; }
        &.error { background: rgba(255, 77, 79, 0.1); color: #FF4D4F; }
      }
    }
    
    .error-tip {
      background: rgba(255, 77, 79, 0.08);
      border: 2rpx solid rgba(255, 77, 79, 0.2);
      border-radius: 12rpx;
      padding: 16rpx;
      margin-top: 16rpx;
      
      .error-text {
        font-size: 24rpx;
        color: #FF4D4F;
      }
    }
    
    .file-pages {
      margin-top: 20rpx;
      padding-top: 20rpx;
      border-top: 2rpx dashed #F0F0F0;
      
      .pages-header {
        margin-bottom: 16rpx;
        
        .pages-title {
          font-size: 26rpx;
          color: #666;
          font-weight: 500;
        }
      }
      
      .pages-scroll {
        white-space: nowrap;
        width: 100%;
        padding-bottom: 8rpx;
        
        .page-item {
          display: inline-block;
          width: 180rpx;
          margin-right: 16rpx;
          vertical-align: top;
          
          .page-image {
            width: 180rpx;
            height: 250rpx;
            background-color: #f8f8f8;
            border-radius: 12rpx;
            border: 2rpx solid #f0f0f0;
          }
          
          .page-num {
            display: block;
            font-size: 22rpx;
            color: #999;
            text-align: center;
            margin-top: 10rpx;
          }
        }
      }
    }
    
    .file-actions {
      margin-top: 16rpx;
      text-align: right;
      
      .delete-btn {
        font-size: 26rpx;
        color: #4A90D9;
        padding: 8rpx 16rpx;
      }
    }
  }
}

.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx;
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.08);
  z-index: 100;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  
  .btn-upload {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 32rpx;
    font-weight: 500;
  }
}

.result-area {
  margin-top: 30rpx;
  margin-bottom: 40rpx;
  
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8rpx 20rpx;
    margin-bottom: 20rpx;
    
    .result-title {
      font-size: 30rpx;
      color: #333;
      font-weight: 600;
    }
    
    .clear-btn {
      font-size: 26rpx;
      color: #4A90D9;
      padding: 8rpx 16rpx;
    }
  }
  
  .result-content {
    .result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24rpx 30rpx;
      margin-bottom: 16rpx;
      border-radius: 16rpx;
      background: #fff;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
      transition: all 0.3s ease;
      
      &:active {
        transform: scale(0.98);
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
      }
      
      .result-info {
        flex: 1;
        min-width: 0;
        
        .result-name {
          display: block;
          font-size: 28rpx;
          color: #333;
          font-weight: 500;
          margin-bottom: 8rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .result-status {
          font-size: 24rpx;
          padding: 4rpx 12rpx;
          border-radius: 12rpx;
          
          &.success { background: rgba(82, 196, 26, 0.1); color: #52C41A; }
          &.error { background: rgba(255, 77, 79, 0.1); color: #FF4D4F; }
          &.warning { background: rgba(250, 173, 20, 0.1); color: #FAAD14; }
        }
      }
      
      .result-arrow {
        font-size: 32rpx;
        color: #ccc;
        margin-left: 16rpx;
      }
    }
  }
  
  .result-empty {
    text-align: center;
    padding: 80rpx 40rpx;
    background: #fff;
    border-radius: 16rpx;
    
    .empty-icon {
      width: 120rpx;
      height: 120rpx;
      background: #f5f5f5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24rpx;
      
      text {
        font-size: 48rpx;
      }
    }
    
    .empty-text {
      display: block;
      font-size: 30rpx;
      color: #666;
      margin-bottom: 12rpx;
    }
    
    .empty-hint {
      display: block;
      font-size: 24rpx;
      color: #999;
    }
  }
}
</style>