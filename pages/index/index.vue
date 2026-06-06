<template>
  <view class="container">
    <!-- 顶部标题区域 -->
    <view class="header">
      <text class="title">票据管理系统</text>
      <text class="subtitle">支持批量上传 PDF 文件进行票据识别与整理</text>
    </view>

    <!-- 文件上传区域 -->
    <view 
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @click="handleClickUpload"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <view class="upload-icon">
        <text class="iconfont">📁</text>
      </view>
      <text class="upload-text">点击或拖拽文件到此处上传</text>
      <text class="upload-hint">支持 PDF 格式，可同时上传多个文件</text>
      
      <!-- #ifdef H5 -->
      <input 
        ref="fileInput"
        type="file" 
        multiple 
        accept=".pdf"
        class="hidden-input"
        @change="handleFileChange"
      />
      <!-- #endif -->
      
      <!-- #ifdef MP-WEIXIN -->
      <button class="upload-btn" @click.stop="chooseFile">选择文件</button>
      <!-- #endif -->
    </view>

    <!-- 已选文件列表 -->
    <view class="file-list" v-if="fileList.length > 0">
      <view class="file-list-header">
        <text class="file-list-title">已选文件 ({{ fileList.length }})</text>
        <text class="clear-btn" @click="clearFiles">清空</text>
      </view>
      <view class="file-item" v-for="(file, index) in fileList" :key="index">
        <view class="file-info">
          <text class="file-icon">📄</text>
          <text class="file-name">{{ file.name }}</text>
          <text class="file-size">{{ formatFileSize(file.size) }}</text>
        </view>
        <text class="remove-btn" @click="removeFile(index)">✕</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area" v-if="fileList.length > 0">
      <button class="btn-primary btn-upload" @click="uploadFiles">
        开始上传处理
      </button>
    </view>

    <!-- 底部结果展示区域 -->
    <view class="result-area">
      <view class="result-header">
        <text class="result-title">处理结果</text>
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
        <text class="empty-text">暂无处理结果</text>
        <text class="empty-hint">上传文件后将在此显示处理结果</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isDragOver: false,
      fileList: [],
      results: []
    }
  },
  methods: {
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
        this.addFiles(files)
      }
      // #endif
    },
    
    handleFileChange(e) {
      const files = e.target?.files
      if (files && files.length > 0) {
        this.addFiles(files)
      }
    },
    
    chooseFile() {
      // #ifdef MP-WEIXION
      wx.chooseMessageFile({
        count: 10,
        type: 'file',
        extension: ['pdf'],
        success: (res) => {
          this.addFiles(res.tempFiles)
        },
        fail: (err) => {
          uni.showToast({
            title: '选择文件失败',
            icon: 'none'
          })
        }
      })
      // #endif
    },
    
    addFiles(files) {
      const pdfFiles = Array.from(files).filter(file => {
        const name = file.name || file.path || ''
        return name.toLowerCase().endsWith('.pdf')
      })
      
      if (pdfFiles.length === 0) {
        uni.showToast({
          title: '请选择 PDF 文件',
          icon: 'none'
        })
        return
      }
      
      pdfFiles.forEach(file => {
        const exists = this.fileList.some(f => f.name === file.name)
        if (!exists) {
          this.fileList.push({
            name: file.name,
            size: file.size,
            file: file,
            path: file.path || ''
          })
        }
      })
      
      uni.showToast({
        title: `已添加 ${pdfFiles.length} 个文件`,
        icon: 'success'
      })
    },
    
    removeFile(index) {
      this.fileList.splice(index, 1)
    },
    
    clearFiles() {
      this.fileList = []
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    async uploadFiles() {
      if (this.fileList.length === 0) {
        uni.showToast({
          title: '请先选择文件',
          icon: 'none'
        })
        return
      }
      
      uni.showLoading({
        title: '上传处理中...'
      })
      
      try {
        // 模拟上传处理
        for (let i = 0; i < this.fileList.length; i++) {
          const file = this.fileList[i]
          await this.simulateUpload(file)
        }
        
        uni.hideLoading()
        uni.showToast({
          title: '处理完成',
          icon: 'success'
        })
        
        this.fileList = []
      } catch (err) {
        uni.hideLoading()
        uni.showToast({
          title: '处理失败',
          icon: 'none'
        })
      }
    },
    
    simulateUpload(file) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.results.unshift({
            id: Date.now(),
            fileName: file.name,
            status: 'success',
            statusText: '处理成功',
            data: {
              invoices: [],
              totalAmount: 0
            }
          })
          resolve()
        }, 500)
      })
    },
    
    goToResult(item) {
      uni.navigateTo({
        url: `/pages/result/result?id=${item.id}&name=${encodeURIComponent(item.fileName)}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  padding: 30rpx;
  background-color: #f5f5f5;
}

.header {
  text-align: center;
  padding: 40rpx 0;
  
  .title {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
  }
  
  .subtitle {
    display: block;
    font-size: 28rpx;
    color: #666;
  }
}

.upload-area {
  background-color: #fff;
  border: 4rpx dashed #d9d9d9;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  transition: all 0.3s;
  position: relative;
  
  &.drag-over {
    border-color: #4A90D9;
    background-color: rgba(74, 144, 217, 0.05);
  }
  
  .upload-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }
  
  .upload-text {
    display: block;
    font-size: 32rpx;
    color: #333;
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
  
  .upload-btn {
    margin-top: 20rpx;
    background-color: #4A90D9;
    color: #fff;
    border: none;
    border-radius: 8rpx;
    padding: 16rpx 40rpx;
    font-size: 28rpx;
  }
}

.file-list {
  background-color: #fff;
  border-radius: 16rpx;
  margin-top: 30rpx;
  padding: 20rpx 30rpx;
  
  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #eee;
    
    .file-list-title {
      font-size: 28rpx;
      color: #333;
      font-weight: bold;
    }
    
    .clear-btn {
      font-size: 26rpx;
      color: #4A90D9;
    }
  }
  
  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      flex: 1;
      
      .file-icon {
        font-size: 36rpx;
        margin-right: 16rpx;
      }
      
      .file-name {
        font-size: 28rpx;
        color: #333;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .file-size {
        font-size: 24rpx;
        color: #999;
        margin-left: 16rpx;
      }
    }
    
    .remove-btn {
      font-size: 28rpx;
      color: #999;
      padding: 10rpx 20rpx;
    }
  }
}

.action-area {
  margin-top: 30rpx;
  
  .btn-upload {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 32rpx;
  }
}

.btn-primary {
  background-color: #4A90D9;
  color: #ffffff;
  border: none;
  border-radius: 8rpx;
}

.result-area {
  background-color: #fff;
  border-radius: 16rpx;
  margin-top: 30rpx;
  padding: 30rpx;
  
  .result-header {
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #eee;
    
    .result-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .result-content {
    .result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24rpx 0;
      border-bottom: 1rpx solid #f5f5f5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .result-info {
        flex: 1;
        
        .result-name {
          display: block;
          font-size: 28rpx;
          color: #333;
          margin-bottom: 8rpx;
        }
        
        .result-status {
          font-size: 24rpx;
          
          &.success {
            color: #52c41a;
          }
          
          &.error {
            color: #f5222d;
          }
          
          &.processing {
            color: #faad14;
          }
        }
      }
      
      .result-arrow {
        font-size: 32rpx;
        color: #ccc;
      }
    }
  }
  
  .result-empty {
    text-align: center;
    padding: 60rpx 0;
    
    .empty-text {
      display: block;
      font-size: 28rpx;
      color: #999;
      margin-bottom: 12rpx;
    }
    
    .empty-hint {
      display: block;
      font-size: 24rpx;
      color: #ccc;
    }
  }
}
</style>
