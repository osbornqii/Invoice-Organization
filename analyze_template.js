const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '新建 XLS 工作表.xls');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('=== 报销单模板分析 ===');
console.log('工作表名称:', sheetName);
console.log('');

const range = XLSX.utils.decode_range(sheet['!ref']);
console.log('数据范围:', sheet['!ref']);
console.log('行数:', range.e.r + 1);
console.log('列数:', range.e.c + 1);
console.log('');

console.log('=== 全部内容 ===');
for (let r = 0; r <= range.e.r; r++) {
  let rowData = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
    const cell = sheet[cellAddress];
    rowData.push(cell ? cell.v : '');
  }
  console.log('第' + (r + 1) + '行:', JSON.stringify(rowData));
}

if (sheet['!merges']) {
  console.log('');
  console.log('=== 合并单元格 ===');
  sheet['!merges'].forEach((merge, i) => {
    console.log('合并' + (i + 1) + ':', XLSX.utils.encode_range(merge));
  });
}

console.log('');
console.log('=== 列宽 ===');
if (sheet['!cols']) {
  sheet['!cols'].forEach((col, i) => {
    console.log('列' + String.fromCharCode(65 + i) + ':', col);
  });
}
