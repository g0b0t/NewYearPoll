const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'Responses';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME) ||
    SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);

  sheet.appendRow([
    new Date(),
    data.name,
    (data.selectedFoods || []).join(', '),
    (data.selectedDrinks || []).join(', '),
    data.foodAmountLevel,
    data.alcoholLevel,
    (data.restrictions || []).join(', ')
  ]);

  return buildJsonResponse({ status: 'ok' });
}

function doGet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) {
    return buildJsonResponse({ foods: {}, drinks: {}, restrictions: {}, totalResponses: 0 });
  }

  const rows = sheet.getDataRange().getValues();
  const foods = {};
  const drinks = {};
  const restrictions = {};

  rows.slice(1).forEach(row => {
    const [timestamp, name, foodStr, drinkStr, foodLevel, alcoholLevel, restrictionStr] = row;
    (foodStr || '').split(/,\s*/).filter(Boolean).forEach(item => foods[item] = (foods[item] || 0) + 1);
    (drinkStr || '').split(/,\s*/).filter(Boolean).forEach(item => drinks[item] = (drinks[item] || 0) + 1);
    (restrictionStr || '').split(/,\s*/).filter(Boolean).forEach(item => restrictions[item] = (restrictions[item] || 0) + 1);
  });

  return buildJsonResponse({
    foods,
    drinks,
    restrictions,
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
