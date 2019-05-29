function draft(){
  //var body = DocumentApp.openById("1n6KPeq1A4EOWIC2dgCjjY0Ey9N9fEQnJIsVOqDcoeGg").getBody().getText();
  //body = Utilities.base64Encode(body, Utilities.Charset.UTF_8);
  //GmailApp.createDraft("sasha@altmortgages.ca","subject", body);
}

function composeDraftFromAPI(subject, body){
//var forScope = GmailApp.getInboxUnreadCount(); // needed for auth scope
  var raw = 'From: Me <sasha@altmortgages.ca>\r\n' +
            'To: You <sasha@altmortgages.ca>\r\n' +
            'Subject: '+subject+'\r\n' +
            'Content-Type: text/html; charset=UTF-8\r\n' + 
            '\r\n' + body;
  var draftBody = Utilities.base64Encode(raw, Utilities.Charset.UTF_8).replace(/\//g,'_').replace(/\+/g,'-');
  var params = {
    method      : "post",
    contentType : "application/json",
    headers     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()},
    muteHttpExceptions:true,
    payload:JSON.stringify({
      "message": {
        "raw": draftBody
      }
    })
  };

  var resp = UrlFetchApp.fetch("https://www.googleapis.com/gmail/v1/users/me/drafts", params);
  Logger.log(resp.getContentText());
}

function database(){
  var params = {
    method      : "post",
    contentType : "application/json",
    headers     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()},
    payload:JSON.stringify({
      "query":{
        "kind":[
          {
            "name":"Completed"
          }
        ],
        "filter": {
          "propertyFilter": {
            "op": "EQUAL",
            "property": {
              "name": "Account"
            },
            "value": {
              "integerValue": "2855"
            }
          }
        }
     }
  })
};
  var resp = UrlFetchApp.fetch("https://datastore.googleapis.com/v1/projects/project-id-5607442590441105900:runQuery", params);
  Logger.log(JSON.parse(resp.getContentText()).batch.entityResults[0].entity.properties);
  
  
}