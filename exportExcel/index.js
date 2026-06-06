const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const CATEGORY_ORDER = {
  'traffic': 1,
  'gas': 2,
  'restaurant': 3,
  'hotel': 4,
  'other': 5
}

const CATEGORY_NAMES = {
  'traffic': '交通',
  'gas': '加油站',
  'restaurant': '餐饮',
  'hotel': '酒店',
  'other': '其他'
}

const DEFAULT_TEMPLATE = {
  columns: [
    { field: 'index', title: '序号', width: 6 },
    { field: 'type', title: '发票类型', width: 18 },
    { field: 'date', title: '开票时间', width: 14 },
    { field: 'amountWithoutTax', title: '不含税金额', width: 12 },
    { field: 'tax', title: '税额', width: 10 },
    { field: 'amount', title: '价税合计', width: 12 },
    { field: 'buyer', title: '付款方', width: 30 },
    { field: 'number', title: '发票号码', width: 22 }
  ],
  headerStyle: {
    backgroundColor: '4A90D9',
    fontColor: 'FFFFFF'
  }
}

const EXPENSE_TEMPLATE_CONFIG = {
  templateFile: 'templates/expense_template.xls',
  dataStartRow: 9,
  maxDataRows: 24,
  fieldMapping: {
    departureMonth: { col: 'C' },
    departureDay: { col: 'D' },
    departurePlace: { col: 'E' },
    arrivalMonth: { col: 'F' },
    arrivalDay: { col: 'G' },
    arrivalPlace: { col: 'H' },
    vehicleType: { col: 'I' },
    vehicleAmount: { col: 'J' },
    tripDays: { col: 'K' },
    mealCount: { col: 'L' },
    mealStandard: { col: 'M' },
    mealAmount: { col: 'N' },
    cityTraffic: { col: 'O' },
    refundFee: { col: 'P' },
    subtotal: { col: 'S' }
  },
  headerRow: {
    passengerName: 'C6'
  },
  totalRow: 33
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0)
  
  const match = dateStr.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  }
  return new Date(0)
}

function extractMonth(dateStr) {
  if (!dateStr) return ''
  const match = dateStr.match(/(\d{1,2})月/)
  return match ? match[1] : ''
}

function extractDay(dateStr) {
  if (!dateStr) return ''
  const match = dateStr.match(/(\d{1,2})日/)
  return match ? match[1] : ''
}

function formatDateKey(dateStr) {
  if (!dateStr) return ''
  const match = dateStr.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/)
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  }
  return ''
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

async function getCompanyTemplate(password) {
  if (!password || password.trim() === '') {
    return null
  }
  
  try {
    const result = await db.collection('company_templates')
      .where({
        password: password,
        isActive: true
      })
      .limit(1)
      .get()
    
    if (result.data && result.data.length > 0) {
      console.log('找到匹配的公司模板:', result.data[0].companyName)
      return result.data[0]
    }
    
    console.log('密码不匹配任何公司模板')
    return null
  } catch (err) {
    console.error('查询公司模板失败:', err)
    return null
  }
}

async function downloadExpenseTemplate() {
  try {
    console.log('开始获取模板文件临时链接...')
    
    const result = await cloud.getTempFileURL({
      fileList: ['cloud://test-4g12u5jca3e8ec90.7465-test-4g12u5jca3e8ec90-1414384918/templates/expense_template.xlsx']
    })
    
    console.log('getTempFileURL 返回:', JSON.stringify(result))
    
    if (result.fileList && result.fileList.length > 0) {
      const fileItem = result.fileList[0]
      console.log('文件项状态:', fileItem.status, '临时链接:', fileItem.tempFileURL ? '有' : '无')
      
      if (fileItem.status === 0 && fileItem.tempFileURL) {
        const https = require('https')
        console.log('开始HTTPS下载:', fileItem.tempFileURL)
        return new Promise((resolve, reject) => {
          https.get(fileItem.tempFileURL, (res) => {
            console.log('HTTPS响应状态码:', res.statusCode)
            const chunks = []
            res.on('data', (chunk) => chunks.push(chunk))
            res.on('end', () => {
              const buffer = Buffer.concat(chunks)
              console.log('模板文件下载成功，大小:', buffer.length)
              resolve(buffer)
            })
          }).on('error', (err) => {
            console.error('HTTPS下载失败:', err)
            resolve(null)
          })
        })
      } else {
        console.log('文件状态异常或无临时链接')
      }
    } else {
      console.log('fileList 为空')
    }
    return null
  } catch (err) {
    console.error('下载报销单模板失败:', err)
    return null
  }
}

function fillExpenseTemplate(invoices, templateBuffer) {
  console.log('=== 填充报销单模板 ===')
  
  const workbook = XLSX.read(templateBuffer)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  const trafficInvoices = invoices.filter(i => 
    i.category === 'traffic' || 
    i.type?.includes('交通') || 
    i.type?.includes('火车') || 
    i.type?.includes('飞机') ||
    i.type?.includes('出租车')
  )
  
  const foodInvoices = invoices.filter(i => 
    i.category === 'restaurant' || 
    i.type?.includes('餐饮')
  )
  
  console.log('交通发票数:', trafficInvoices.length)
  console.log('餐饮发票数:', foodInvoices.length)
  
  const foodCountByDate = {}
  foodInvoices.forEach(inv => {
    const dateKey = formatDateKey(inv.date)
    foodCountByDate[dateKey] = (foodCountByDate[dateKey] || 0) + 1
  })
  
  const sortedTraffic = sortInvoices(trafficInvoices)
  
  const mapping = EXPENSE_TEMPLATE_CONFIG.fieldMapping
  const startRow = EXPENSE_TEMPLATE_CONFIG.dataStartRow
  const maxRows = EXPENSE_TEMPLATE_CONFIG.maxDataRows
  
  let totalAmount = 0
  
  sortedTraffic.slice(0, maxRows).forEach((invoice, index) => {
    const row = startRow + index
    
    const month = extractMonth(invoice.date)
    const day = extractDay(invoice.date)
    
    if (month) sheet[mapping.departureMonth.col + row] = { v: month }
    if (day) sheet[mapping.departureDay.col + row] = { v: day }
    if (invoice.departure) sheet[mapping.departurePlace.col + row] = { v: invoice.departure }
    
    if (month) sheet[mapping.arrivalMonth.col + row] = { v: month }
    if (day) sheet[mapping.arrivalDay.col + row] = { v: day }
    if (invoice.arrival) sheet[mapping.arrivalPlace.col + row] = { v: invoice.arrival }
    
    if (invoice.vehicleType) sheet[mapping.vehicleType.col + row] = { v: invoice.vehicleType }
    if (invoice.amount) {
      sheet[mapping.vehicleAmount.col + row] = { v: invoice.amount }
      totalAmount += invoice.amount
    }
    
    const dateKey = formatDateKey(invoice.date)
    const mealCount = foodCountByDate[dateKey] || 0
    if (mealCount > 0) {
      sheet[mapping.mealCount.col + row] = { v: mealCount }
    }
    
    if (invoice.amount) {
      sheet[mapping.subtotal.col + row] = { v: invoice.amount }
    }
  })
  
  if (sortedTraffic.length > 0 && sortedTraffic[0].passengerName) {
    const passengerCell = EXPENSE_TEMPLATE_CONFIG.headerRow.passengerName
    const existingValue = sheet[passengerCell]?.v || ''
    sheet[passengerCell] = { v: existingValue + sortedTraffic[0].passengerName }
  }
  
  const totalRow = EXPENSE_TEMPLATE_CONFIG.totalRow
  sheet[mapping.vehicleAmount.col + totalRow] = { v: totalAmount }
  sheet[mapping.subtotal.col + totalRow] = { v: totalAmount }
  
  console.log('报销单填充完成，总金额:', totalAmount)
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

function generateExcelWithTemplate(invoices, template) {
  const columns = template?.columns || DEFAULT_TEMPLATE.columns
  
  const sortedInvoices = sortInvoices([...invoices])
  
  const workbook = XLSX.utils.book_new()
  
  const header = columns.map(col => col.title)
  const data = [header]
  
  let currentIndex = 1
  let currentCategory = null
  let categorySubtotals = {}
  let totals = {}
  
  columns.forEach(col => {
    categorySubtotals[col.field] = 0
    totals[col.field] = 0
  })
  
  for (const invoice of sortedInvoices) {
    const category = invoice.category || 'other'
    
    if (currentCategory !== null && currentCategory !== category) {
      const subtotalRow = columns.map(col => {
        if (col.field === 'index') return ''
        if (col.field === 'type') return `${CATEGORY_NAMES[currentCategory] || currentCategory}小计`
        if (['amountWithoutTax', 'tax', 'amount'].includes(col.field)) {
          return categorySubtotals[col.field]
        }
        return ''
      })
      data.push(subtotalRow)
      data.push([])
      
      columns.forEach(col => {
        categorySubtotals[col.field] = 0
      })
      currentIndex++
    }
    
    currentCategory = category
    
    const row = columns.map(col => {
      const field = col.field
      if (field === 'index') return currentIndex
      if (field === 'type') return invoice.type || CATEGORY_NAMES[category] || '未知'
      
      const value = invoice[field] || 0
      if (['amountWithoutTax', 'tax', 'amount'].includes(field)) {
        categorySubtotals[field] += value
        totals[field] += value
      }
      return value
    })
    data.push(row)
    currentIndex++
  }
  
  if (currentCategory !== null) {
    const subtotalRow = columns.map(col => {
      if (col.field === 'index') return ''
      if (col.field === 'type') return `${CATEGORY_NAMES[currentCategory] || currentCategory}小计`
      if (['amountWithoutTax', 'tax', 'amount'].includes(col.field)) {
        return categorySubtotals[col.field]
      }
      return ''
    })
    data.push(subtotalRow)
  }
  
  data.push([])
  const totalRow = columns.map(col => {
    if (col.field === 'index') return ''
    if (col.field === 'type') return '总计'
    if (['amountWithoutTax', 'tax', 'amount'].includes(col.field)) {
      return totals[col.field]
    }
    return ''
  })
  data.push(totalRow)
  
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  
  worksheet['!cols'] = columns.map(col => ({ wch: col.width || 15 }))
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '发票汇总')
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

exports.main = async (event, context) => {
  const { invoices, customFileName, password } = event
  
  console.log('=== Excel 导出开始 ===')
  console.log('发票数量:', invoices?.length || 0)
  console.log('自定义文件名:', customFileName)
  console.log('是否提供密码:', !!password)
  
  if (!invoices || invoices.length === 0) {
    return { code: -1, message: '缺少发票数据' }
  }
  
  try {
    let excelBuffer
    let templateUsed = 'default'
    let companyName = ''
    let fileExt = 'xlsx'
    
    if (password && password.trim() !== '') {
      const companyTemplate = await getCompanyTemplate(password)
      if (companyTemplate) {
        companyName = companyTemplate.companyName
        console.log('使用公司定制模板:', companyName)
        
        if (companyTemplate.useExpenseTemplate) {
          console.log('尝试使用报销单模板')
          const templateBuffer = await downloadExpenseTemplate()
          
          if (templateBuffer) {
            excelBuffer = fillExpenseTemplate(invoices, templateBuffer)
            templateUsed = 'expense'
            fileExt = 'xlsx'
            console.log('报销单模板填充成功')
          } else {
            console.log('报销单模板下载失败，使用默认模板')
            excelBuffer = generateExcelWithTemplate(invoices, DEFAULT_TEMPLATE)
          }
        } else {
          const template = companyTemplate.templateConfig || DEFAULT_TEMPLATE
          excelBuffer = generateExcelWithTemplate(invoices, template)
          templateUsed = 'custom'
        }
      } else {
        console.log('密码验证失败，使用默认模板')
        excelBuffer = generateExcelWithTemplate(invoices, DEFAULT_TEMPLATE)
      }
    } else {
      excelBuffer = generateExcelWithTemplate(invoices, DEFAULT_TEMPLATE)
    }
    
    console.log('Excel 文件大小:', excelBuffer.length)
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = customFileName ? `${customFileName}.${fileExt}` : `invoices_${timestamp}.${fileExt}`
    const cloudPath = `excel/${fileName}`
    
    console.log('上传文件:', cloudPath)
    
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(excelBuffer)
    })
    
    console.log('上传成功:', uploadResult.fileID)
    
    const tempUrlResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })
    
    const tempUrl = tempUrlResult.fileList[0]?.tempFileURL
    
    console.log('=== Excel 导出完成 ===')
    
    return {
      code: 0,
      message: '导出成功',
      data: {
        fileID: uploadResult.fileID,
        tempUrl: tempUrl,
        fileName: fileName,
        fileSize: excelBuffer.length,
        invoiceCount: invoices.length,
        templateUsed: templateUsed,
        companyName: companyName
      }
    }
  } catch (err) {
    console.error('导出失败:', err)
    return { code: -1, message: '导出失败: ' + err.message }
  }
}
