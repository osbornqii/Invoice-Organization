const MAX_FILE_SIZE = 10 * 1024 * 1024

export function validateFile(file) {
  const errors = []
  
  const name = file.name || file.path || ''
  const ext = name.split('.').pop()?.toLowerCase()
  
  if (ext !== 'pdf' && !name.toLowerCase().endsWith('.pdf')) {
    errors.push('文件类型必须是 PDF 格式')
  }
  
  const size = file.size || 0
  if (size > MAX_FILE_SIZE) {
    errors.push('文件大小不能超过 10MB')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function generateFileId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function createFileInfo(file, source = 'h5') {
  return {
    id: generateFileId(),
    name: file.name || file.path?.split('/').pop() || '未命名.pdf',
    size: file.size || 0,
    status: 'pending',
    progress: 0,
    source: source,
    rawFile: file,
    path: file.path || '',
    pages: [],
    totalPages: 0,
    error: null
  }
}

export async function pdfToImages(file, onProgress) {
  // #ifdef H5
  return await pdfToImagesH5(file, onProgress)
  // #endif
  
  // #ifdef MP-WEIXIN
  return await pdfToImagesWX(file, onProgress)
  // #endif
  
  return []
}

async function pdfToImagesH5(file, onProgress) {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const totalPages = pdf.numPages
    const images = []
    
    for (let i = 1; i <= totalPages; i++) {
      if (onProgress) {
        onProgress(Math.round((i / totalPages) * 100))
      }
      
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
      images.push({
        pageNum: i,
        imageUrl: imageUrl,
        width: viewport.width,
        height: viewport.height
      })
    }
    
    return {
      success: true,
      totalPages,
      images
    }
  } catch (error) {
    console.error('PDF 转图片失败:', error)
    return {
      success: false,
      error: error.message || 'PDF 解析失败',
      images: []
    }
  }
}

async function pdfToImagesWX(file, onProgress) {
  return new Promise((resolve) => {
    const fs = uni.getFileSystemManager()
    const filePath = file.path || file.tempFilePath
    
    if (!filePath) {
      resolve({
        success: false,
        error: '无法获取文件路径',
        images: []
      })
      return
    }
    
    uni.showLoading({ title: '正在解析PDF...' })
    
    uni.uploadFile({
      url: 'YOUR_CLOUD_FUNCTION_URL/api/pdf/convert',
      filePath: filePath,
      name: 'file',
      success: (res) => {
        uni.hideLoading()
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0) {
            if (onProgress) onProgress(100)
            resolve({
              success: true,
              totalPages: data.data.totalPages,
              images: data.data.images
            })
          } else {
            resolve({
              success: false,
              error: data.message || 'PDF 解析失败',
              images: []
            })
          }
        } catch (e) {
          resolve({
            success: false,
            error: '解析响应失败',
            images: []
          })
        }
      },
      fail: (err) => {
        uni.hideLoading()
        resolve({
          success: false,
          error: '上传失败，请检查网络',
          images: []
        })
      }
    })
  })
}

export async function uploadFile(fileInfo, uploadUrl, onProgress) {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100)
        onProgress(progress)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      } else {
        reject(new Error(`上传失败: ${xhr.status}`))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'))
    })
    
    const formData = new FormData()
    formData.append('file', fileInfo.rawFile)
    
    xhr.open('POST', uploadUrl)
    xhr.send(formData)
    // #endif
    
    // #ifdef MP-WEIXIN
    uni.uploadFile({
      url: uploadUrl,
      filePath: fileInfo.path,
      name: 'file',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(res.data)
            resolve(response)
          } catch (e) {
            reject(new Error('解析响应失败'))
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
    // #endif
  })
}

export default {
  validateFile,
  formatFileSize,
  generateFileId,
  createFileInfo,
  pdfToImages,
  uploadFile,
  MAX_FILE_SIZE
}
