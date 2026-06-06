const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const INVOICE_TYPE_RULES = [
  { type: '交通', keywords: ['通行费', '高速公路', 'ETC', '高速', '路桥费', '停车费', '过路费', '交通投资', '公路', '收费站', '交通控股', '交通集团', '机场'] },
  { type: '加油站', keywords: ['加油站', '石油', '石化', '加油', '汽油', '柴油', '成品油', '车用汽油', '车用柴油'] },
  { type: '餐饮', keywords: ['餐饮', '餐厅', '饭店', '酒楼', '家常菜', '美食', '小吃', '快餐', '火锅', '烧烤', '自助餐', '茶餐厅', '咖啡', '饮品', '食品', '外卖', '团餐', '食堂', '酒家', '菜馆', '食府', '大排档', '餐饮服务'] },
  { type: '酒店行业', keywords: ['酒店', '宾馆', '住宿', '旅馆', '民宿', '招待所', '公寓', '客房', '房费', '住宿费', '住宿服务'] },
  { type: '交通出行', keywords: ['出租车', '网约车', '滴滴', '打车', '客运', '汽车票', '火车票', '机票', '航空', '铁路', '地铁', '公交', '出行', '代驾'] }
]

function classifyInvoice(text, sellerName = '') {
  const searchText = (text + ' ' + sellerName).toLowerCase()
  for (const rule of INVOICE_TYPE_RULES) {
    for (const keyword of rule.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return rule.type
      }
    }
  }
  return '其他'
}

let cachedToken = null
let tokenExpireTime = 0

async function getBaiduToken() {
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken
  }
  
  const apiKey = 'd5lWBiRSoqSmKYS6feYpxCWF'
  const secretKey = 'SOETJIV9UnnCPsetIB6n7y6yRCkgRP0D'
  
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  
  const res = await new Promise((resolve, reject) => {
    const https = require('https')
    https.get(url, (resp) => {
      let data = ''
      resp.on('data', chunk => data += chunk)
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
  
  if (res.access_token) {
    cachedToken = res.access_token
    tokenExpireTime = Date.now() + (res.expires_in - 300) * 1000
    return cachedToken
  }
  
  throw new Error('获取百度Token失败: ' + JSON.stringify(res))
}

async function callBaiduOCR(imageBase64, token) {
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${token}`
  
  return new Promise((resolve, reject) => {
    const https = require('https')
    const postData = `image=${encodeURIComponent(imageBase64)}`
    
    const options = {
      hostname: 'aip.baidubce.com',
      path: `/rest/2.0/ocr/v1/vat_invoice?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = https.request(options, (resp) => {
      let data = ''
      resp.on('data', chunk => data += chunk)
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

async function callGeneralOCR(imageBase64, token) {
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`
  
  return new Promise((resolve, reject) => {
    const https = require('https')
    const postData = `image=${encodeURIComponent(imageBase64)}`
    
    const options = {
      hostname: 'aip.baidubce.com',
      path: `/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = https.request(options, (resp) => {
      let data = ''
      resp.on('data', chunk => data += chunk)
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

async function callBaiduPdfOCR(pdfBase64, token) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const postData = `pdf_file=${encodeURIComponent(pdfBase64)}`
    
    const options = {
      hostname: 'aip.baidubce.com',
      path: `/rest/2.0/ocr/v1/vat_invoice?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = https.request(options, (resp) => {
      let data = ''
      resp.on('data', chunk => data += chunk)
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

exports.main = async (event, context) => {
  const { fileID, imageBase64, isImage } = event
  
  console.log('=== 云函数开始 ===')
  console.log('参数:', { fileID: fileID ? '有' : '无', imageBase64: imageBase64 ? '有' : '无', isImage: isImage ? '是' : '否' })
  
  if (!fileID && !imageBase64) {
    return { code: -1, message: '缺少文件ID或图片数据' }
  }
  
  try {
    const invoices = []
    let totalPages = 0
    let pdfText = ''
    
    if (isImage && fileID) {
      console.log('步骤1: 下载图片')
      const res = await cloud.downloadFile({ fileID })
      const imageBuffer = res.fileContent
      console.log('图片大小:', imageBuffer.length)
      
      const base64Image = imageBuffer.toString('base64')
      
      console.log('步骤2: 调用百度 OCR')
      const token = await getBaiduToken()
      const ocrResult = await callBaiduOCR(base64Image, token)
      console.log('OCR 结果:', JSON.stringify(ocrResult).substring(0, 500))
      
      let invoice = { 
        type: '其他', 
        number: '', 
        date: '', 
        amount: 0, 
        tax: 0, 
        seller: '', 
        buyer: '',
        passengerName: '',
        departure: '',
        arrival: '',
        vehicleType: '',
        vehicleNumber: ''
      }
      
      if (ocrResult.words_result) {
        const wr = ocrResult.words_result
        if (wr.InvoiceNum) invoice.number = wr.InvoiceNum
        if (wr.InvoiceDate) invoice.date = wr.InvoiceDate
        if (wr.TotalAmount) invoice.amount = parseFloat(wr.TotalAmount) || 0
        if (wr.TotalTax) invoice.tax = parseFloat(wr.TotalTax) || 0
        if (wr.SellerName) invoice.seller = wr.SellerName
        if (wr.PurchaserName) invoice.buyer = wr.PurchaserName
        if (wr.InvoiceType) invoice.type = wr.InvoiceType
        
        if (wr.PassengerName) invoice.passengerName = wr.PassengerName
        if (wr.DepartureStation) invoice.departure = wr.DepartureStation
        if (wr.ArrivalStation) invoice.arrival = wr.ArrivalStation
        if (wr.TrainNumber) {
          invoice.vehicleNumber = wr.TrainNumber
          invoice.vehicleType = '火车'
        }
        if (wr.FlightNumber) {
          invoice.vehicleNumber = wr.FlightNumber
          invoice.vehicleType = '飞机'
        }
        if (wr.CarNumber) invoice.vehicleNumber = wr.CarNumber
        if (wr.InvoiceType) invoice.type = wr.InvoiceType
        
        if (!invoice.amount && wr.AmountInFiguers) {
          invoice.amount = parseFloat(wr.AmountInFiguers) || 0
        }
        if (!invoice.date && wr.InvoiceDate) {
          invoice.date = wr.InvoiceDate
        }
      }
      
      if (ocrResult.error_code) {
        console.log('OCR 错误:', ocrResult.error_msg)
        if (ocrResult.error_code === 216201 || ocrResult.error_code === 18) {
          const generalResult = await callGeneralOCR(base64Image, token)
          if (generalResult.words_result) {
            const text = generalResult.words_result.map(w => w.words).join('\n')
            console.log('通用 OCR 文本:', text)
            invoice = parseInvoiceFromText(text)
          }
        }
      }
      
      invoice.type = classifyInvoice(invoice.seller + ' ' + invoice.buyer, invoice.seller)
      
      if (invoice.amount > 0 || invoice.number) {
        invoices.push(invoice)
      }
      
      totalPages = 1
    } else if (fileID) {
      console.log('步骤1: 下载 PDF')
      const res = await cloud.downloadFile({ fileID })
      const pdfBuffer = res.fileContent
      console.log('文件大小:', pdfBuffer.length)
      
      console.log('步骤2: 解析 PDF 文本')
      const pdfParse = require('pdf-parse')
      const pdfData = await pdfParse(pdfBuffer)
      totalPages = pdfData.numpages
      pdfText = pdfData.text
      console.log('PDF 页数:', totalPages, '文本长度:', pdfText.length)
      console.log('PDF 文本内容:', pdfText)
      
      let invoice = parseInvoiceFromText(pdfText)
      console.log('文本解析结果:', JSON.stringify(invoice))
      
      if (invoice.amount > 0 || invoice.number) {
        invoices.push(invoice)
      } else {
        console.log('文本解析失败，尝试百度 PDF OCR 识别')
        
        try {
          const pdfBase64 = pdfBuffer.toString('base64')
          const token = await getBaiduToken()
          const ocrResult = await callBaiduPdfOCR(pdfBase64, token)
          console.log('PDF OCR 结果:', JSON.stringify(ocrResult).substring(0, 500))
          
          if (ocrResult.words_result) {
            const wr = ocrResult.words_result
            const ocrInvoice = {
              type: '其他',
              number: '',
              date: '',
              amount: 0,
              amountWithoutTax: 0,
              tax: 0,
              seller: '',
              buyer: '',
              passengerName: '',
              departure: '',
              arrival: '',
              vehicleType: '',
              vehicleNumber: ''
            }
            
            if (wr.InvoiceNum) ocrInvoice.number = wr.InvoiceNum
            if (wr.InvoiceDate) ocrInvoice.date = wr.InvoiceDate
            if (wr.SellerName) ocrInvoice.seller = wr.SellerName
            if (wr.PurchaserName) ocrInvoice.buyer = wr.PurchaserName
            if (wr.InvoiceType) ocrInvoice.type = wr.InvoiceType
            
            if (wr.PassengerName) ocrInvoice.passengerName = wr.PassengerName
            if (wr.DepartureStation) ocrInvoice.departure = wr.DepartureStation
            if (wr.ArrivalStation) ocrInvoice.arrival = wr.ArrivalStation
            if (wr.TrainNumber) {
              ocrInvoice.vehicleNumber = wr.TrainNumber
              ocrInvoice.vehicleType = '火车'
            }
            if (wr.FlightNumber) {
              ocrInvoice.vehicleNumber = wr.FlightNumber
              ocrInvoice.vehicleType = '飞机'
            }
            if (wr.CarNumber) ocrInvoice.vehicleNumber = wr.CarNumber
            
            if (wr.TotalTax) ocrInvoice.tax = parseFloat(wr.TotalTax) || 0
            
            if (wr.AmountWithoutTax) {
              ocrInvoice.amountWithoutTax = parseFloat(wr.AmountWithoutTax) || 0
            } else if (wr.CommodityAmount && wr.CommodityAmount.length > 0) {
              ocrInvoice.amountWithoutTax = parseFloat(wr.CommodityAmount[0].word) || 0
            }
            
            ocrInvoice.amount = (ocrInvoice.amountWithoutTax || 0) + (ocrInvoice.tax || 0)
            
            ocrInvoice.type = classifyInvoice(ocrInvoice.seller + ' ' + ocrInvoice.buyer, ocrInvoice.seller)
            
            if (ocrInvoice.amount > 0 || ocrInvoice.number) {
              invoices.push(ocrInvoice)
              console.log('PDF OCR 识别成功:', JSON.stringify(ocrInvoice))
            }
          }
          
          if (ocrResult.error_code) {
            console.log('PDF OCR 错误:', ocrResult.error_msg)
          }
        } catch (ocrErr) {
          console.log('PDF OCR 失败:', ocrErr.message)
        }
      }
    }
    
    if (imageBase64) {
      console.log('处理图片')
      let invoice = { 
        type: '其他', 
        number: '', 
        date: '', 
        amount: 0, 
        amountWithoutTax: 0, 
        tax: 0, 
        seller: '', 
        buyer: '',
        passengerName: '',
        departure: '',
        arrival: '',
        vehicleType: '',
        vehicleNumber: ''
      }
      
      try {
        const token = await getBaiduToken()
        const ocrResult = await callBaiduOCR(imageBase64, token)
        console.log('OCR 结果:', JSON.stringify(ocrResult).substring(0, 500))
        
        if (ocrResult.words_result) {
          const wr = ocrResult.words_result
          if (wr.InvoiceNum) invoice.number = wr.InvoiceNum
          if (wr.InvoiceDate) invoice.date = wr.InvoiceDate
          if (wr.SellerName) invoice.seller = wr.SellerName
          if (wr.PurchaserName) invoice.buyer = wr.PurchaserName
          if (wr.InvoiceType) invoice.type = wr.InvoiceType
          
          if (wr.PassengerName) invoice.passengerName = wr.PassengerName
          if (wr.DepartureStation) invoice.departure = wr.DepartureStation
          if (wr.ArrivalStation) invoice.arrival = wr.ArrivalStation
          if (wr.TrainNumber) {
            invoice.vehicleNumber = wr.TrainNumber
            invoice.vehicleType = '火车'
          }
          if (wr.FlightNumber) {
            invoice.vehicleNumber = wr.FlightNumber
            invoice.vehicleType = '飞机'
          }
          if (wr.CarNumber) invoice.vehicleNumber = wr.CarNumber
          
          if (wr.TotalTax) invoice.tax = parseFloat(wr.TotalTax) || 0
          
          if (wr.AmountWithoutTax) {
            invoice.amountWithoutTax = parseFloat(wr.AmountWithoutTax) || 0
          } else if (wr.CommodityAmount && wr.CommodityAmount.length > 0) {
            invoice.amountWithoutTax = parseFloat(wr.CommodityAmount[0].word) || 0
          }
          
          invoice.amount = (invoice.amountWithoutTax || 0) + (invoice.tax || 0)
        }
      } catch (e) {
        console.log('图片 OCR 失败:', e.message)
      }
      
      invoice.type = classifyInvoice(invoice.seller + ' ' + invoice.buyer, invoice.seller)
      invoices.push(invoice)
    }
    
    console.log('=== 完成, 发票数:', invoices.length, '===')
    
    return {
      code: 0,
      message: '解析成功',
      data: {
        totalPages,
        images: [],
        text: pdfText,
        invoices
      }
    }
  } catch (err) {
    console.error('错误:', err)
    return { code: -1, message: '处理失败: ' + err.message }
  }
}

function parseInvoiceFromText(text) {
  const invoice = {
    type: '其他',
    number: '',
    date: '',
    amount: 0,
    amountWithoutTax: 0,
    tax: 0,
    seller: '',
    buyer: '',
    passengerName: '',
    departure: '',
    arrival: '',
    vehicleType: '',
    vehicleNumber: ''
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  console.log('解析行数:', lines.length, '行内容:', JSON.stringify(lines))
  
  for (const line of lines) {
    if (/^\d{20}$/.test(line)) {
      invoice.number = line
      console.log('找到发票号码(纯数字):', line)
    }
    
    const numberMatch = line.match(/发票号码[：:]\s*(\d{20})/)
    if (numberMatch) {
      invoice.number = numberMatch[1]
      console.log('找到发票号码(带前缀):', numberMatch[1])
    }
    
    const dateMatch = line.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)
    if (dateMatch) {
      invoice.date = `${dateMatch[1]}年${dateMatch[2].padStart(2, '0')}月${dateMatch[3].padStart(2, '0')}日`
      console.log('找到日期(纯日期):', invoice.date)
    }
    
    const dateMatch2 = line.match(/开票日期[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (dateMatch2) {
      invoice.date = `${dateMatch2[1]}年${dateMatch2[2].padStart(2, '0')}月${dateMatch2[3].padStart(2, '0')}日`
      console.log('找到日期(带前缀):', invoice.date)
    }
  }
  
  const taxIdPattern = /^[A-Z0-9]{18}$/
  const taxIdPositions = []
  
  for (let i = 0; i < lines.length; i++) {
    if (taxIdPattern.test(lines[i])) {
      taxIdPositions.push(i)
    }
    
    const taxIdMatch = lines[i].match(/统一社会信用代码[\/\\]纳税人识别号[：:]\s*([A-Z0-9]{18})/)
    if (taxIdMatch) {
      taxIdPositions.push(i)
    }
  }
  
  console.log('税号位置:', taxIdPositions)
  
  const isCompanyName = (line) => {
    return line.length >= 4 && /^[\u4e00-\u9fa5（）()]+$/.test(line)
  }
  
  if (taxIdPositions.length >= 1) {
    for (let i = taxIdPositions[0] - 1; i >= 0; i--) {
      if (isCompanyName(lines[i])) {
        invoice.buyer = lines[i]
        console.log('找到购买方:', lines[i])
        break
      }
    }
    
    const nameMatch = lines[taxIdPositions[0] - 1]?.match(/名称[：:]\s*(.+)$/)
    if (nameMatch && !invoice.buyer) {
      invoice.buyer = nameMatch[1].trim()
      console.log('找到购买方(名称行):', invoice.buyer)
    }
  }
  
  if (taxIdPositions.length >= 2) {
    for (let i = taxIdPositions[1] - 1; i > taxIdPositions[0]; i--) {
      if (isCompanyName(lines[i])) {
        invoice.seller = lines[i]
        console.log('找到销售方:', lines[i])
        break
      }
    }
    
    const nameMatch = lines[taxIdPositions[1] - 1]?.match(/名称[：:]\s*(.+)$/)
    if (nameMatch && !invoice.seller) {
      invoice.seller = nameMatch[1].trim()
      console.log('找到销售方(名称行):', invoice.seller)
    }
  }
  
  const amountMatches = text.match(/[¥￥]([\d,]+\.?\d*)/g)
  if (amountMatches) {
    const amounts = amountMatches.map(m => parseFloat(m.replace(/[¥￥,]/g, ''))).filter(n => n > 0)
    if (amounts.length > 0) {
      invoice.amount = Math.max(...amounts)
      console.log('找到价税合计:', invoice.amount)
    }
  }
  
  const doubleYuanMatch = text.match(/[¥￥]([\d,]+\.?\d*)[¥￥]([\d,]+\.?\d*)/)
  if (doubleYuanMatch) {
    const first = parseFloat(doubleYuanMatch[1].replace(/,/g, ''))
    const second = parseFloat(doubleYuanMatch[2].replace(/,/g, ''))
    if (first > 0 && second > 0 && second < first) {
      invoice.amountWithoutTax = first
      invoice.tax = second
      console.log('找到不含税金额(双¥格式):', invoice.amountWithoutTax)
      console.log('找到税额(双¥格式):', invoice.tax)
    }
  }
  
  if (!invoice.tax) {
    const taxPercentMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*([\d,]+\.\d{2})(?:\s|$)/)
    if (taxPercentMatch) {
      const taxValue = parseFloat(taxPercentMatch[2].replace(/,/g, ''))
      if (taxValue > 0 && taxValue < invoice.amount) {
        invoice.tax = taxValue
        console.log('找到税额(税率格式):', invoice.tax)
      }
    }
  }
  
  if (!invoice.amountWithoutTax && invoice.amount > 0 && invoice.tax > 0) {
    invoice.amountWithoutTax = invoice.amount - invoice.tax
    console.log('计算不含税金额:', invoice.amountWithoutTax)
  }
  
  if (invoice.tax >= invoice.amount) {
    invoice.tax = 0
    console.log('税额异常，重置为0')
  }
  
  if (text.includes('电子发票') || text.includes('增值税')) {
    if (text.includes('专用')) {
      invoice.type = '增值税专用发票'
    } else if (text.includes('普通')) {
      invoice.type = '电子发票（普通发票）'
    }
  }
  
  for (const line of lines) {
    const passengerMatch = line.match(/(?:旅客姓名|乘车人|乘客|姓名)[：:]\s*(.+)/)
    if (passengerMatch) {
      invoice.passengerName = passengerMatch[1].trim()
      console.log('找到出行人:', invoice.passengerName)
    }
    
    const departureMatch = line.match(/(?:出发站|始发站|出发地)[：:]\s*(.+)/)
    if (departureMatch) {
      invoice.departure = departureMatch[1].trim()
      console.log('找到出发地:', invoice.departure)
    }
    
    const arrivalMatch = line.match(/(?:到达站|终点站|到达地)[：:]\s*(.+)/)
    if (arrivalMatch) {
      invoice.arrival = arrivalMatch[1].trim()
      console.log('找到到达地:', invoice.arrival)
    }
    
    const trainMatch = line.match(/(?:车次|列车)[：:]\s*([A-Z]?\d+)/)
    if (trainMatch) {
      invoice.vehicleNumber = trainMatch[1]
      invoice.vehicleType = '火车'
      console.log('找到车次:', invoice.vehicleNumber)
    }
    
    const flightMatch = line.match(/(?:航班|航班号)[：:]\s*([A-Z]{2}\d+)/)
    if (flightMatch) {
      invoice.vehicleNumber = flightMatch[1]
      invoice.vehicleType = '飞机'
      console.log('找到航班:', invoice.vehicleNumber)
    }
  }
  
  if (text.includes('火车票') || text.includes('铁路')) {
    invoice.vehicleType = '火车'
  }
  if (text.includes('机票') || text.includes('航空')) {
    invoice.vehicleType = '飞机'
  }
  if (text.includes('出租车') || text.includes('网约车')) {
    invoice.vehicleType = '出租车'
  }
  
  invoice.type = classifyInvoice(text, invoice.seller)
  
  return invoice
}
