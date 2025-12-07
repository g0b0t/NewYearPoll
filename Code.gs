const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'Responses';

function doPost(e) {
  // Для отладки — что реально прилетает
  Logger.log('doPost event: ' + JSON.stringify(e));

  let raw = '';

  // 1) Если тело пришло как text/plain / application/json
  if (e.postData && e.postData.contents) {
    raw = e.postData.contents;
  }
  // 2) Если отправляли как form-urlencoded: data=...
  if (!raw && e.parameter && e.parameter.data) {
    raw = e.parameter.data;
  }

  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (err) {
    Logger.log('JSON parse error: ' + err + ' | raw=' + raw);
    data = {};
  }

  const sheet =
    SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME) ||
    SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);

  sheet.appendRow([
    new Date(),
    data.name || '',
    (data.selectedFoods || []).join(', '),
    (data.alcoholLevel !== undefined && data.alcoholLevel !== null)
      ? data.alcoholLevel
      : ''
  ]);

  return buildJsonResponse({ status: 'ok' });
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