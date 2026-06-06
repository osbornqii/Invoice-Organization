const cloud = require('wx-server-sdk')
const { PDFDocument, PDFName, PDFDict, PDFArray } = require('pdf-lib')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const CATEGORY_ORDER = {
  'traffic': 1,
  'gas': 2,
  'restaurant': 3,
  'hotel': 4,
  'other': 5
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

function parseDate(dateStr) {
  if (!dateStr) return new Date(0)
  
  const match = dateStr.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  }
  return new Date(0)
}

function sortInvoices(invoices) {
  return invoices.sort((a, b) => {
    const categoryA = a.category || 'other'
    const categoryB = b.category || 'other'
    const orderA = CATEGORY_ORDER[categoryA] || 5
    const orderB = CATEGORY_ORDER[categoryB] || 5
    
    if (orderA !== orderB) {
      return orderA - orderB
    }
    
    const dateA = parseDate(a.date)
    const dateB = parseDate(b.date)
    return dateA - dateB
  })
}

function cleanPdf(pdfDoc) {
  try {
    pdfDoc.setTitle('')
    pdfDoc.setAuthor('')
    pdfDoc.setSubject('')
    pdfDoc.setKeywords([])
    pdfDoc.setProducer('')
    pdfDoc.setCreator('')
    
    const catalog = pdfDoc.catalog
    const keysToDelete = ['Names', 'Outlines', 'OpenAction', 'AA', 'URI']
    keysToDelete.forEach(key => {
      try {
        const name = PDFName.of(key)
        if (catalog.has(name)) {
          catalog.delete(name)
        }
      } catch (e) {}
    })
    
    const pages = pdfDoc.getPages()
    pages.forEach(page => {
      try {
        const pageDict = page.node
        const annotsName = PDFName.of('Annots')
        if (pageDict.has(annotsName)) {
          pageDict.delete(annotsName)
        }
      } catch (e) {}
    })
    
    console.log('已清理PDF元数据和链接')
  } catch (e) {
    console.log('清理PDF时出错:', e.message)
  }
}

exports.main = async (event, context) => {
  const { fileIDs, invoices, twoPerPage = false } = event
  
  console.log('=== PDF 合并开始 ===')
  console.log('文件数量:', fileIDs?.length || 0)
  console.log('发票数量:', invoices?.length || 0)
  console.log('两页合一:', twoPerPage)
  
  if (!fileIDs || fileIDs.length === 0) {
    return { code: -1, message: '缺少文件列表' }
  }
  
  if (!invoices || invoices.length === 0) {
    return { code: -1, message: '缺少发票信息' }
  }
  
  try {
    const sortedInvoices = sortInvoices([...invoices])
    console.log('排序后的发票:', sortedInvoices.map(i => ({ type: i.type, date: i.date, fileID: i.fileID })))
    
    const mergedPdf = await PDFDocument.create()
    
    const pdfBuffers = []
    for (let i = 0; i < sortedInvoices.length; i++) {
      const invoice = sortedInvoices[i]
      const fileID = invoice.fileID || fileIDs[i]
      
      if (!fileID) {
        console.log('跳过无文件ID的发票:', invoice.type)
        continue
      }
      
      console.log(`下载第 ${i + 1}/${sortedInvoices.length} 个文件:`, fileID)
      
      try {
        const res = await cloud.downloadFile({ fileID })
        pdfBuffers.push(res.fileContent)
        console.log(`成功下载文件`)
      } catch (err) {
        console.error('下载文件失败:', fileID, err.message)
      }
    }
    
    if (twoPerPage) {
      console.log('使用两页合一模式')
      
      for (let i = 0; i < pdfBuffers.length; i += 2) {
        const halfHeight = A4_HEIGHT / 2
        
        const srcDoc1 = await PDFDocument.load(pdfBuffers[i], { 
          ignoreEncryption: true
        })
        cleanPdf(srcDoc1)
        
        const srcPage1 = srcDoc1.getPage(0)
        const page1Width = srcPage1.getWidth()
        const page1Height = srcPage1.getHeight()
        
        let srcDoc2 = null
        let page2Width = page1Width
        let page2Height = page1Height
        
        if (i + 1 < pdfBuffers.length) {
          srcDoc2 = await PDFDocument.load(pdfBuffers[i + 1], { 
            ignoreEncryption: true
          })
          cleanPdf(srcDoc2)
          const srcPage2 = srcDoc2.getPage(0)
          page2Width = srcPage2.getWidth()
          page2Height = srcPage2.getHeight()
        }
        
        const scale1 = Math.min(A4_WIDTH / page1Width, halfHeight / page1Height) * 0.9
        const scale2 = Math.min(A4_WIDTH / page2Width, halfHeight / page2Height) * 0.9
        const finalScale = Math.min(scale1, scale2)
        
        console.log(`发票1尺寸: ${page1Width}x${page1Height}, 缩放: ${finalScale}`)
        console.log(`发票2尺寸: ${page2Width}x${page2Height}, 缩放: ${finalScale}`)
        
        const newPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
        
        const [embPage1] = await mergedPdf.embedPdf(srcDoc1, [0])
        
        const scaledWidth1 = page1Width * finalScale
        const scaledHeight1 = page1Height * finalScale
        const x1 = (A4_WIDTH - scaledWidth1) / 2
        const y1 = A4_HEIGHT - halfHeight + (halfHeight - scaledHeight1) / 2
        
        newPage.drawPage(embPage1, {
          x: x1,
          y: y1,
          xScale: finalScale,
          yScale: finalScale
        })
        
        console.log(`添加第 ${i + 1} 个发票到上半部分`)
        
        if (srcDoc2) {
          const [embPage2] = await mergedPdf.embedPdf(srcDoc2, [0])
          
          const scaledWidth2 = page2Width * finalScale
          const scaledHeight2 = page2Height * finalScale
          const x2 = (A4_WIDTH - scaledWidth2) / 2
          const y2 = (halfHeight - scaledHeight2) / 2
          
          newPage.drawPage(embPage2, {
            x: x2,
            y: y2,
            xScale: finalScale,
            yScale: finalScale
          })
          
          console.log(`添加第 ${i + 2} 个发票到下半部分`)
        }
      }
      
      const pageCount = mergedPdf.getPageCount()
      for (let i = 0; i < pageCount; i++) {
        const page = mergedPdf.getPage(i)
        try {
          const pageDict = page.node
          const annotsName = PDFName.of('Annots')
          if (pageDict.has(annotsName)) {
            pageDict.delete(annotsName)
          }
        } catch (e) {}
      }
    } else {
      console.log('使用普通模式')
      
      for (let i = 0; i < pdfBuffers.length; i++) {
        const pdfDoc = await PDFDocument.load(pdfBuffers[i], { 
          ignoreEncryption: true
        })
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
        pages.forEach(page => {
          mergedPdf.addPage(page)
        })
        console.log(`添加 ${pages.length} 页`)
      }
    }
    
    cleanPdf(mergedPdf)
    
    const mergedPdfBytes = await mergedPdf.save()
    console.log('合并后文件大小:', mergedPdfBytes.length)
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `merged_invoices_${timestamp}.pdf`
    const cloudPath = `merged/${fileName}`
    
    console.log('上传文件:', cloudPath)
    
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(mergedPdfBytes)
    })
    
    console.log('上传成功:', uploadResult.fileID)
    
    const tempUrlResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })
    
    const tempUrl = tempUrlResult.fileList[0]?.tempFileURL
    
    console.log('=== PDF 合并完成 ===')
    
    return {
      code: 0,
      message: '合并成功',
      data: {
        fileID: uploadResult.fileID,
        tempUrl: tempUrl,
        fileName: fileName,
        fileSize: mergedPdfBytes.length,
        pageCount: mergedPdf.getPageCount()
      }
    }
  } catch (err) {
    console.error('合并失败:', err)
    return { code: -1, message: '合并失败: ' + err.message }
  }
}
