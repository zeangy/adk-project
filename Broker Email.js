function sendBrokerEmail() {
  var referralAgentId = "1625c96b-98d4-4889-88a1-647eaf88129f";
  var payload = {
    "referral_sources": [
      referralAgentId
    ],
    "sort":"updated_status_at", 
    "limit":1000, 
    "reverse":true
  };
  var response = LendeskAPILibrary.searchApplicationsByPayload(JSON.stringify(payload));
  var body = "<table>";
  
  function asDate_(rawDate){
    return Utilities.formatDate(new Date(rawDate), "UTC", "MMMM dd, yyyy");
  }
  function asStatus_(state){
    var rx = /^([0-9]. )?(.*)/;
    var extracted = rx.exec(state);
    var status = (extracted.length > 2 ? extracted[2] : extracted[0]);
    status = status.replace("Complete", "Funded");
    status = status.replace("Declined", "Cancelled");
    return status;
  }
  function asList_(str){
    return str.join("; ");
  }
  function asDefault_(input){
    return input;
  }
  var extractFields = {
    "created_at" : asDate_,
    "updated_at" : asDate_,
    "state" : asStatus_,
    "primary_applicant_name" : asDefault_, 
    "collateral_description" : asList_,
    "loan_closing_at" : asDefault_,
    "loan_amount" : asDefault_
  };
  
  for(var i in response){
    body += "<tr>";
    
    for(var fieldName in extractFields){
      body += "<td>";
      body += extractFields[fieldName](response[i][fieldName]);
      body += "</td>";
    }
    
    body += "</tr>";
  }
  
  body += "</table>";
  Logger.log(body);
  
  var draft = GmailApp.createDraft("sasha@altmortgages.ca", "test email", "", {htmlBody:body, from:"sasha@neighbourhoodholdings.com"});
  /*
  return CardService.newComposeActionResponseBuilder()
       .setGmailDraft(draft)
       .build();
  */
}
