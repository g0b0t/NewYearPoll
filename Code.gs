const SHEET_ID = '';
const SHEET_NAME = 'Responses';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME) ||
    SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);

  sheet.appendRow([
    new Date(),
    data.name,
    (data.selectedFoods || []).join(', '),
    data.alcoholLevel
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

function buildJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET,POST');
}
