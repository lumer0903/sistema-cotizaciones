const fs = require('fs');
const csv = fs.readFileSync('/app/archivos_excel/PRODUCTOS-UNIDOS.xlsx.csv', 'utf8');
const lines = csv.split('\n');
const headers = lines[0].split(';');
console.log('Headers:', headers);

const targetLines = [253, 832, 1022, 1132, 1198, 1203, 1213];
targetLines.forEach((lineNum, i) => {
    const l = lines[lineNum - 1];
    if (l) {
        const cols = l.split(';');
        console.log(`Line ${lineNum}:`, cols[0], '|', cols[1].substring(0, 60), '| cols:', cols.length);
    }
});