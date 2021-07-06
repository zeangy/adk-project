/* {
      "text": "Send Search Email",
      "runFunction": "sendEmailCard"
    },         
*/
//      "text": "Move To Dead Test",
//      "runFunction": "moveToDeadCard"

function moveToDeadCard(){
  var applicationId = "b87894d9-0b23-4ba4-9e4e-86ffcc68698f";
  var type = "Declined";

  var header = CardService.newCardHeader()
    .setTitle("Move To "+type);
  
  var section = CardService.newCardSection();
  
  section.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("dead_reason")
    .setTitle(type+" Reason")
    .addItem("test", "test", false)
  );
  
  var card = CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section);
  
  return CardService.newUniversalActionResponseBuilder()
     .displayAddOnCards([card.build()]).build();
  
}


/* add to manifest: 
, {
      "text": "Send Search Email", 
      "runFunction": "sendEmailCard"
    }
*/
function emailQuestions2(e){
  var threadId = GmailApp.getMessageById(e.messageMetadata.messageId).getThread().getId();//"1508b9f91fd8190c";
  var messages = GmailApp.getThreadById(threadId).getMessages();
  var body = "";
  for(var i in messages){
    body = body+messages[i].getPlainBody();
  }
  
  var file = DriveApp.createFile("results.txt", body, MimeType.PLAIN_TEXT);
  var options = {
    attachments : [file.getBlob()]
  };
  var draft = GmailApp.createDraft("sasha@altmortgages.ca", "Messages", "see attached", options);
  return CardService.newComposeActionResponseBuilder()
       .setGmailDraft(draft)
       .build();
}

// one page, get each thread
function emailQuestions(e){
 var query = e.formInput["query"];
  
  var params = {
    method      : "get",
    contentType : "application/json",
    headers     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()}
  };
  var url = "https://www.googleapis.com/gmail/v1/users/"+Session.getActiveUser().getEmail()+"/threads/?q="+query;
  var result = UrlFetchApp.fetch(url, params);
  var fullResults = result.getContentText();
  var json = JSON.parse(result)["threads"];
  
  var body = "";
  var count = 1;
  for(var i in json){
    if(count < 50){
      var messages = GmailApp.getThreadById(json[i]["id"]).getMessages();
      for(var i in messages){
        var currentMessage = messages[i].getPlainBody();
        if(currentMessage.search("option 1") >= 0 || currentMessage.search("option 2") >= 0 || currentMessage.search("option 3") >= 0){
          body += currentMessage;
        }
      }
      count ++;
    }
  }

  var file = DriveApp.createFile("results.json", fullResults, MimeType.JAVASCRIPT);
  var file2 = DriveApp.createFile("results.txt", body, MimeType.PLAIN_TEXT);
  var options = {
    attachments : [file.getBlob(), file2.getBlob()]
  };
  var draft = GmailApp.createDraft("sasha@altmortgages.ca", "Gmail Search", url, options);
  
  return CardService.newComposeActionResponseBuilder()
       .setGmailDraft(draft)
       .build();
}

function emailQuestions3(e){
  var query = e.formInput["query"];
  
  var params = {
    method      : "get",
    contentType : "application/json",
    headers     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()}
  };
  var url = "https://www.googleapis.com/gmail/v1/users/"+Session.getActiveUser().getEmail()+"/threads/?q="+query;
  var result = UrlFetchApp.fetch(url, params);
  var fullResults = result.getContentText();
  var json = JSON.parse(result);
  
  Logger.log(query);
  var count = 0; 
  while(json.nextPageToken && count < 50){
  
    Logger.log(json.nextPageToken);
    result = UrlFetchApp.fetch(url+"&pageToken="+json.nextPageToken, params);
    json = JSON.parse(result);
    
    fullResults = fullResults + result.getContentText();
    count++;
  };
  var file = DriveApp.createFile("results.json", fullResults, MimeType.JAVASCRIPT);
  var options = {
    attachments : [file.getBlob()]
  };
  var draft = GmailApp.createDraft("sasha@altmortgages.ca", "Gmail Search", url, options);
  
  return CardService.newComposeActionResponseBuilder()
       .setGmailDraft(draft)
       .build();
}

function sendEmailCard(){
  return CardService.newUniversalActionResponseBuilder().displayAddOnCards([
    CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle("Run Search")).addSection(CardService.newCardSection()
    .addWidget(CardService.newTextInput().setFieldName("query").setValue("from:(-altmortgages.ca -neighbourhoodholdings.com -conconi.ca) ? -label:unroll.me").setTitle("Search For").setMultiline(true))
    .addWidget(
      CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setComposeAction(CardService.newAction().setFunctionName("emailQuestions"), CardService.ComposedEmailType.STANDALONE_DRAFT)
        .setText("Run")
        )
     )
   ).build()]).build();
        
}
