const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const EXPIRE_DAYS = 7

exports.main = async (event, context) => {
  console.log('=== 开始清理过期文件 ===')
  console.log('过期天数:', EXPIRE_DAYS)
  
  const now = Date.now()
  const expireTime = now - EXPIRE_DAYS * 24 * 60 * 60 * 1000
  
  console.log('过期时间点:', new Date(expireTime).toISOString())
  
  let totalDeleted = 0
  const results = []
  
  const dirs = ['pdf/', 'excel/', 'merged/']
  
  for (const dir of dirs) {
    try {
      console.log(`\n处理目录: ${dir}`)
      
      let dirDeleted = 0
      let marker = undefined
      
      do {
        const listResult = await cloud.openapi.cloudbase.storageList({
          prefix: dir,
          marker: marker,
          maxKeys: 100
        })
        
        if (!listResult.fileList || listResult.fileList.length === 0) {
          console.log('目录为空')
          break
        }
        
        console.log(`获取到 ${listResult.fileList.length} 个文件`)
        
        const filesToDelete = listResult.fileList.filter(file => {
          const fileTime = new Date(file.uploadTime).getTime()
          return fileTime < expireTime
        })
        
        if (filesToDelete.length > 0) {
          const fileIDs = filesToDelete.map(f => f.fileid)
          console.log(`删除 ${fileIDs.length} 个过期文件`)
          
          const deleteResult = await cloud.deleteFile({
            fileList: fileIDs
          })
          
          if (deleteResult.fileList) {
            dirDeleted += deleteResult.fileList.length
          }
        }
        
        marker = listResult.marker
      } while (marker)
      
      results.push({
        directory: dir,
        deleted: dirDeleted
      })
      
      totalDeleted += dirDeleted
      console.log(`目录 ${dir} 清理完成，删除 ${dirDeleted} 个文件`)
      
    } catch (err) {
      console.error(`清理目录 ${dir} 失败:`, err.message)
      results.push({
        directory: dir,
        deleted: 0,
        error: err.message
      })
    }
  }
  
  console.log('\n=== 清理完成 ===')
  console.log('总共删除:', totalDeleted)
  
  return {
    code: 0,
    message: '清理完成',
    data: {
      expireDays: EXPIRE_DAYS,
      totalDeleted: totalDeleted,
      details: results
    }
  }
}
