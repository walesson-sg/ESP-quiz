const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

const csvPath = path.join(__dirname, 'banco_questoes.csv');
const rawCSV = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(rawCSV);

const headers = rows[0].map(h => h.trim().toLowerCase());
console.log('Headers encontrados:', headers);

function getCol(row, name) {
  const idx = headers.findIndex(h => h === name.toLowerCase());
  return idx !== -1 ? (row[idx] || '').trim() : '';
}

const questions = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const id = getCol(row, 'id');
  const enunciado = getCol(row, 'enunciado');
  if (!id && !enunciado) continue;

  const alternativas = {};
  ['a', 'b', 'c', 'd', 'e'].forEach(letter => {
    const val = getCol(row, `alternativa ${letter}`);
    if (val) {
      alternativas[letter.toUpperCase()] = val;
    }
  });

  const gabaritoRaw = getCol(row, 'gabarito');
  const gabarito = gabaritoRaw ? gabaritoRaw.trim().toUpperCase() : '';

  questions.push({
    id: id || `ESP-${String(i).padStart(4, '0')}`,
    disciplina: getCol(row, 'disciplina'),
    assunto: getCol(row, 'assunto'),
    subassunto: getCol(row, 'subassunto'),
    dificuldade: getCol(row, 'dificuldade'),
    tipo: getCol(row, 'tipo'),
    fonte: getCol(row, 'fonte'),
    enunciado: enunciado,
    alternativas: alternativas,
    gabarito: gabarito,
    comentario: getCol(row, 'comentário') || getCol(row, 'comentario')
  });
}

const outputPath = path.join(__dirname, 'questoes.json');
fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf8');

// Also write questions as a JS variable for direct file:// or offline opening without CORS issues
const jsOutputPath = path.join(__dirname, 'questoes_data.js');
fs.writeFileSync(jsOutputPath, `window.BANCO_QUESTOES = ${JSON.stringify(questions, null, 2)};`, 'utf8');

console.log(`Sucesso: ${questions.length} questões processadas e salvas em questoes.json e questoes_data.js!`);
