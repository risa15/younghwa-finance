const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let SPREADSHEET_ID = '';
let SERVICE_ACCOUNT_KEY = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('GOOGLE_SHEETS_ID=')) {
      SPREADSHEET_ID = line.replace('GOOGLE_SHEETS_ID=', '').replace(/"/g, '').trim();
    }
    if (line.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY=')) {
      // Extract everything inside the single quotes
      const startIdx = envContent.indexOf("GOOGLE_SERVICE_ACCOUNT_KEY='") + "GOOGLE_SERVICE_ACCOUNT_KEY='".length;
      const endIdx = envContent.lastIndexOf("'");
      SERVICE_ACCOUNT_KEY = envContent.substring(startIdx, endIdx);
      break;
    }
  }
} catch (err) {
  console.error('Failed to read .env.local:', err.message);
  process.exit(1);
}

console.log('Spreadsheet ID:', SPREADSHEET_ID);
if (!SERVICE_ACCOUNT_KEY) {
  console.error('Error: GOOGLE_SERVICE_ACCOUNT_KEY is missing in env!');
  process.exit(1);
}

try {
  const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  console.log('Service Account Email:', credentials.client_email);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '현금입출금!A2:E',
  }).then(res => {
    console.log('Success! Retrieved rows count:', res.data.values ? res.data.values.length : 0);
    if (res.data.values && res.data.values.length > 0) {
      console.log('First row example:', res.data.values[0]);
    }
  }).catch(err => {
    console.error('API Error Response:', err.message);
    if (err.response && err.response.data) {
      console.error('API Detailed Error:', JSON.stringify(err.response.data, null, 2));
    }
  });
} catch (err) {
  console.error('Error parsing JSON key:', err.message);
}
