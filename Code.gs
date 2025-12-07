const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'Responses';
const TOKEN_SHEET_NAME = 'Tokens';

function doPost(e) {
  // Разбор тела запроса
  let raw = '';

  if (e.postData && e.postData.contents) {
    raw = e.postData.contents; // text/plain или application/json
  } else if (e.parameter && e.parameter.data) {
    raw = e.parameter.data; // вариант с form-urlencoded
  }

  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (err) {
    Logger.log('JSON parse error: ' + err + ' | raw=' + raw);
    return buildJsonResponse({
      status: 'error',
      code: 'BAD_JSON',
      message: 'Некорректные данные запроса'
    });
  }

  const token = (data.token || '').trim();

  // 1. Проверяем, что токен есть
  if (!token) {
    return buildJsonResponse({
      status: 'error',
      code: 'NO_TOKEN',
      message: 'Нет токена доступа. Обратись к организатору.'
    });
  }

  // 2. Ищем токен в листе Tokens
  const tokenInfo = findTokenRow(token);
  if (!tokenInfo) {
    return buildJsonResponse({
      status: 'error',
      code: 'TOKEN_NOT_FOUND',
      message: 'Неверная ссылка или токен. Обратись к организатору.'
    });
  }

  const rowValues = tokenInfo.values;
  const usedFlag = rowValues[2]; // колонка C: used

  // 3. Уже использован?
  if (usedFlag === true || usedFlag === 'TRUE' || usedFlag === 'Да') {
    return buildJsonResponse({
      status: 'error',
      code: 'TOKEN_USED',
      message: 'По этой ссылке уже был отправлен ответ.'
    });
  }

  // 4. Пишем ответ в Responses
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const respSheet =
    ss.getSheetByName(SHEET_NAME) ||
    ss.insertSheet(SHEET_NAME);

  const row = [
    new Date(),
    data.name || '',
    (data.selectedFoods || []).join(', '),
    data.alcoholLevel,
    token // можно сохранить, чтобы всегда знать, чей ответ
  ];

  respSheet.appendRow(row);

  // 5. Помечаем токен как использованный
  tokenInfo.sheet.getRange(tokenInfo.rowIndex, 3).setValue(true); // колонка C = TRUE

  return buildJsonResponse({ status: 'ok' });
}

function findTokenRow(token) {
  if (!token) return null;

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(TOKEN_SHEET_NAME);
  if (!sheet) return null;

  const values = sheet.getDataRange().getValues(); // вся таблица
  // Предполагаем заголовки в первой строке
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowToken = row[0]; // колонка A: token
    if (rowToken === token) {
      return {
        sheet,
        rowIndex: i + 1,   // номер строки в таблице
        values: row        // [token, name, used]
      };
    }
  }

  return null;
}


function doGet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) {
    return buildJsonResponse({ foods: {}, alcoholLevels: {}, totalResponses: 0 });
  }

  const rows = sheet.getDataRange().getValues();
  const foods = {};
  const alcoholLevels = {};

  rows.slice(1).forEach(row => {
    const [timestamp, name, foodStr, alcoholLevel] = row;
    (foodStr || '').split(/,\s*/).filter(Boolean).forEach(item => foods[item] = (foods[item] || 0) + 1);
    const levelKey = alcoholLevel !== undefined && alcoholLevel !== '' ? String(alcoholLevel) : null;
    if (levelKey !== null) {
      alcoholLevels[levelKey] = (alcoholLevels[levelKey] || 0) + 1;
    }
  });

  return buildJsonResponse({
    foods,
    alcoholLevels,
    totalResponses: Math.max(rows.length - 1, 0)
  });
}

function doOptions() {
  // Handle CORS preflight so fetch() from GitHub Pages/local works without errors.
  return buildJsonResponse({ status: 'ok' });
}

function buildJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}