/**
 * EDUTEST LITE - HYBRID SERVER (v4.0)
 * Simpan data ke Spreadsheet (Visual) + JSON (App Sync).
 * 
 * PETUNJUK:
 * 1. Simpan script ini di Google Apps Script (script.google.com)
 * 2. Klik 'Deploy' > 'New Deployment'
 * 3. Pilih 'Web App'
 * 4. Set 'Execute as' ke 'Me' (Anda)
 * 5. Set 'Who has access' ke 'Anyone' (PENTING!)
 */

function doGet(e) {
  if (e.parameter.check === "true") {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "ONLINE", 
      message: "Server Hybrid EduTest berhasil terhubung!",
      owner: Session.getActiveUser().getEmail()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Digunakan oleh App untuk tarik data JSON
  try {
    var fileId = e.parameter.fileId;
    if (fileId) {
       var content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
       return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {}
  
  return ContentService.createTextOutput("EduTest Server is Running").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  return handleSubmission(e);
}

function handleSubmission(e) {
  try {
    var data = {};
    if (e.parameter.data) {
      var base64Str = e.parameter.data.replace(/ /g, "+");
      var decoded = Utilities.newBlob(Utilities.base64Decode(base64Str)).getDataAsString();
      data = JSON.parse(decoded);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    var folderName = 'EduTest_Data';
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    // --- PART 1: UPDATE JSON (Untuk Dashboard App) ---
    var jsonFileName = 'results.json';
    var jsonFiles = targetFolder.getFilesByName(jsonFileName);
    var jsonFile = jsonFiles.hasNext() ? jsonFiles.next() : targetFolder.createFile(jsonFileName, '[]', 'application/json');
    
    var results = JSON.parse(jsonFile.getBlob().getDataAsString() || "[]");
    data.server_received_at = new Date().toISOString();
    results.push(data);
    jsonFile.setContent(JSON.stringify(results));
    
    // --- 2. SIMPAN KE SPREADSHEET (Untuk Guru Lihat Langsung) ---
    var ssName = 'EduTest_Hasil_Ujian';
    var ssFiles = targetFolder.getFilesByName(ssName);
    var ss;
    
    if (ssFiles.hasNext()) {
      ss = SpreadsheetApp.open(ssFiles.next());
    } else {
      ss = SpreadsheetApp.create(ssName);
      var ssFile = DriveApp.getFileById(ss.getId());
      targetFolder.addFile(ssFile);
      DriveApp.getRootFolder().removeFile(ssFile);
      
      var sheet = ss.getSheets()[0];
      sheet.appendRow(["Timestamp", "Nama Siswa", "Kelas", "Judul Ujian", "Skor", "Waktu Mulai", "Waktu Selesai"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
    
    var sheet = ss.getSheets()[0];
    sheet.appendRow([
      data.server_received_at,
      data.student?.nama || data.student?.name || "-",
      data.student?.kelas || "-",
      data.examTitle || "-",
      data.score || 0,
      data.startTime || "-",
      data.endTime || "-"
    ]);
    
    return ContentService.createTextOutput("SUCCESS").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}
