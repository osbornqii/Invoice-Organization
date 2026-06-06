<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
    
    // #ifdef MP-WEIXIN
    if (wx.cloud) {
      wx.cloud.init({
        env: 'test-4g12u5jca3e8ec90',
        traceUser: true
      })
    }
    // #endif
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style lang="scss">
/* 全局变量 */
$primary-color: #4A90D9;
$primary-light: #6BA3E0;
$primary-dark: #3A7BC8;
$success-color: #52C41A;
$warning-color: #FAAD14;
$error-color: #FF4D4F;
$text-primary: #333333;
$text-secondary: #666666;
$text-light: #999999;
$bg-color: #F5F7FA;
$card-bg: #FFFFFF;
$border-color: #E8E8E8;
$radius-sm: 8rpx;
$radius-md: 12rpx;
$radius-lg: 16rpx;
$radius-xl: 40rpx;
$shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
$shadow-md: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
$shadow-lg: 0 8rpx 30rpx rgba(0, 0, 0, 0.1);

/* 全局样式 */
page {
  background-color: $bg-color;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  color: $text-primary;
  line-height: 1.5;
}

.container {
  padding: 20rpx;
}

/* 通用按钮样式 */
.btn-primary {
  background: linear-gradient(135deg, $primary-color, $primary-light);
  color: #ffffff;
  border: none;
  border-radius: $radius-xl;
  padding: 24rpx 48rpx;
  font-size: 30rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 217, 0.35);
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.96);
    box-shadow: 0 4rpx 12rpx rgba(74, 144, 217, 0.3);
  }
  
  &.disabled {
    background: #E8E8E8;
    box-shadow: none;
    color: $text-light;
  }
}

.btn-secondary {
  background: $card-bg;
  color: $primary-color;
  border: 2rpx solid $primary-color;
  border-radius: $radius-xl;
  padding: 24rpx 48rpx;
  font-size: 30rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:active {
    background: #F8FBFF;
  }
}

.btn-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $card-bg;
  border: 2rpx solid $border-color;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:active {
    border-color: $primary-color;
    background: #F8FBFF;
    transform: scale(0.95);
  }
}

/* 通用卡片样式 */
.card {
  background: $card-bg;
  border-radius: $radius-lg;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-md;
  transition: all 0.3s ease;
  
  &:active {
    box-shadow: $shadow-lg;
    transform: translateY(-2rpx);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.card-subtitle {
  font-size: 24rpx;
  color: $text-light;
}

/* 文件卡片样式 */
.file-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: $card-bg;
  border-radius: $radius-md;
  margin-bottom: 16rpx;
  border: 2rpx solid #F0F0F0;
  transition: all 0.3s ease;
  
  &.active {
    border-color: $primary-color;
    background: #F8FBFF;
  }
  
  &:active {
    border-color: $primary-color;
  }
}

.file-icon {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, $primary-color, $primary-light);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
  
  text {
    color: #ffffff;
    font-size: 36rpx;
    font-weight: bold;
  }
}

.file-info {
  flex: 1;
  overflow: hidden;
}

.file-name {
  font-size: 28rpx;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 22rpx;
  color: $text-light;
  margin-top: 8rpx;
}

/* 进度条样式 */
.progress-bar {
  width: 100%;
  height: 12rpx;
  background: #F0F0F0;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary-color, $primary-light);
  border-radius: 6rpx;
  transition: width 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 状态标签样式 */
.status-success {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(82, 196, 26, 0.1);
  border-radius: 20rpx;
  color: $success-color;
  font-size: 24rpx;
}

.status-warning {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(250, 173, 20, 0.1);
  border-radius: 20rpx;
  color: $warning-color;
  font-size: 24rpx;
}

.status-error {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 20rpx;
  color: $error-color;
  font-size: 24rpx;
}

.status-processing {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(74, 144, 217, 0.1);
  border-radius: 20rpx;
  color: $primary-color;
  font-size: 24rpx;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  background: $bg-color;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
}

.empty-title {
  font-size: 32rpx;
  color: $text-primary;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: $text-light;
  text-align: center;
}

.empty-action {
  margin-top: 40rpx;
}

/* 标签页样式 */
.tab-bar {
  display: flex;
  background: $card-bg;
  padding: 0 20rpx;
  border-bottom: 2rpx solid #F0F0F0;
}

.tab-item {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
  
  &.active {
    .tab-item-text {
      color: $primary-color;
      font-weight: 600;
    }
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 6rpx;
      background: linear-gradient(90deg, $primary-color, $primary-light);
      border-radius: 3rpx;
    }
  }
}

.tab-item-text {
  font-size: 28rpx;
  color: $text-secondary;
}

/* 动画效果 */
.list-item {
  animation: slideIn 0.3s ease forwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-item:nth-child(2) { animation-delay: 0.05s; }
.list-item:nth-child(3) { animation-delay: 0.1s; }
.list-item:nth-child(4) { animation-delay: 0.15s; }
.list-item:nth-child(5) { animation-delay: 0.2s; }

/* 金额样式 */
.amount {
  font-size: 36rpx;
  font-weight: 600;
  color: $primary-color;
}

.amount-small {
  font-size: 28rpx;
  font-weight: 500;
  color: $primary-color;
}

/* 分割线 */
.divider {
  height: 2rpx;
  background: #F0F0F0;
  margin: 20rpx 0;
}

/* 列表项 */
.list-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  
  .item-label {
    font-size: 28rpx;
    color: $text-secondary;
  }
  
  .item-value {
    font-size: 28rpx;
    color: $text-primary;
    font-weight: 500;
  }
}

/* 底部安全区域 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
