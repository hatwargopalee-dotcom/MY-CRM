# GLOBXT HIVE CRM

A modern, LeadSquared-style CRM for your calling team that uses Google Sheets as a backend.

## How it works

This frontend is built with pure HTML, CSS, and JS to ensure it runs anywhere instantly without needing node or complex backend setups. 

The data is designed to be saved to and fetched from a **Google Apps Script Web App** which sits on top of your Google Sheets.

## Connecting to Google Sheets (Backend Setup)

To make the CRM actually talk to Google Sheets and handle the "New sheet for every month" requirement, follow these steps:

### Step 1: Create the Google Sheet
1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it **GLOBXT HIVE CRM Database**.
3. Rename the first tab at the bottom to the current month (e.g., `Oct 2026`).
4. In Row 1, add these headers exactly: `ID`, `Name`, `Phone`, `Email`, `Source`, `Status`, `FollowUp`, `Notes`, `DateAdded`.

### Step 2: Add the Apps Script Code
1. In your Google Sheet, click on `Extensions` > `Apps Script`.
2. Delete any code there and paste the following:

```javascript
// This function handles incoming GET and POST requests from the CRM UI
function doGet(e) {
  var action = e.parameter.action;
  if(action == 'getLeads') {
    return ContentService.createTextOutput(JSON.stringify(getLeads()))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var action = e.parameter.action;
  var data = JSON.parse(e.postData.contents);
  
  if(action == 'addLead') {
    addLead(data);
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to always get/create the sheet for the CURRENT MONTH
function getCurrentMonthSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var date = new Date();
  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var sheetName = monthNames[date.getMonth()] + " " + date.getFullYear();
  
  var sheet = ss.getSheetByName(sheetName);
  
  // If the new month has started and sheet doesn't exist, create it!
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Add headers to the new sheet
    sheet.appendRow(['ID', 'Name', 'Phone', 'Email', 'Source', 'Status', 'FollowUp', 'Notes', 'DateAdded']);
    // You can add logic here to copy pending leads from the previous month if needed.
  }
  return sheet;
}

function getLeads() {
  var sheet = getCurrentMonthSheet();
  var data = sheet.getDataRange().getValues();
  var leads = [];
  
  // Skip header row
  for(var i = 1; i < data.length; i++) {
    leads.push({
      id: data[i][0],
      name: data[i][1],
      phone: data[i][2],
      email: data[i][3],
      source: data[i][4],
      status: data[i][5],
      followUp: data[i][6],
      notes: data[i][7]
    });
  }
  return leads.reverse(); // Newest first
}

function addLead(lead) {
  var sheet = getCurrentMonthSheet();
  sheet.appendRow([
    lead.id || new Date().getTime(),
    lead.name,
    lead.phone,
    lead.email,
    lead.source,
    lead.status,
    lead.followUp,
    lead.notes,
    new Date().toISOString()
  ]);
}
```

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button at the top right of Apps Script, then **New deployment**.
2. Select **Web app** as the type.
3. Description: `CRM API`.
4. Execute as: **Me** (Your email).
5. Who has access: **Anyone** (So your HTML file can hit it).
6. Click **Deploy**. Authorize the permissions when prompted.
7. Copy the **Web app URL**.

### Step 4: Link UI to Backend
1. Open the `app.js` file in this project folder.
2. Find line 7: `const GOOGLE_SHEETS_API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";`
3. Replace the placeholder with the Web app URL you copied.
4. Refresh your `index.html` page, and you are live!
