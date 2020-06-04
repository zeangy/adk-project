/** 
 *  Get applications to send for approval
 *  Filters applications by statuses: 3. Received Commitment, 4. Instructed, 5. Funded
 *  Pulls tasks for each application to check for Final Approval Received task
 *  Applications with Final Approval Received task checked off are excluded
 *  Applications with Final Approval Received task not checked off or not existing are included
 *
 *  @return {Card} The list of application links matching the criteria above.
 */
function getApprovalApplications() {
  var statusList = [
    LENDESK_STATUS_ARRAY["3. Received Commitment"],
    LENDESK_STATUS_ARRAY["4. Instructed"],
    LENDESK_STATUS_ARRAY["5. Funds Requested"],
    LENDESK_STATUS_ARRAY["6. Funded"]
  ];
  
  var response = LendeskAPILibrary.searchApplicationsByStatus(statusList);
  
  var approvalList = [];
  
  for(var i in response){
    var tasks = LendeskAPILibrary.getFinalApprovalTask(response[i].id);
    Logger.log(tasks);
    var approvalComplete = tasks["approval"];
    var appraisalComplete = tasks["appraisal"];
    if (!approvalComplete){
      approvalList.push({"data": response[i], "label" : "Approval: "+approvalComplete+" Appraisal: "+appraisalComplete, "template": EMAIL_TEMPLATES["Underwriting Summary"], "email":""});
    }
  }
  // sort by status
  approvalList.sort(function sortState(a, b){ 
    var x = a["data"]["state"].substring(0,1); 
    var y = b["data"]["state"].substring(0,1);
    return y - x;
  });
  
  // sort by appraisal received
  approvalList.sort(function sortAppraisal(a, b){ 
    var x = (a["label"].split("Appraisal: ")[1] == "true" ? 1 : 0); 
    var y = (b["label"].split("Appraisal: ")[1] == "true" ? 1 : 0);
    return y - x;
  });
  
  return filteredApplicationCard(approvalList, "Send for Approval"); 
}

/** 
 *  Get applications near expiry to follow up with
 *  Filters applications by status: 2. Sent Commitment
 *  Filters applications by current user as deal lead
 *  Pulls commitment expiry date for each application to check if close to expiry
 *  Compares dates ****INCOMPLETE****
 *
 *  @return {Card} The list of application links matching the criteria above.
 */
function getExpiredCommitmentApplications(e){
  var statusList = [
     LENDESK_STATUS_ARRAY["1. Quote"],
     LENDESK_STATUS_ARRAY["2. Sent Commitment"]
  ];
  var formDealLead = e.formInput.dealLead;
  var dealLead = (formDealLead ? formDealLead : getUserName());
  var dealLeadList = [dealLead];
  
  var response = LendeskAPILibrary.searchApplicationsByStatusAndLeader(statusList, dealLeadList);
  
  var expiredList = [];
  
  for(var i in response){
  
    var commitmentExpiry = LendeskAPILibrary.getCommitmentExpiry(response[i].id);
    
    if(commitmentExpiry != ""){
      function equalDates(date1, date2){
        return(date1.getDate() == date2.getDate() && date1.getMonth() == date2.getMonth() && date1.getFullYear() == date2.getFullYear());
      }
      
      var today = new Date();
      var twoDays = new Date();
      twoDays.setDate(today.getDate()+2);
      
      var commitmentExpiryDate = new Date();
      commitmentExpiryDate.setFullYear(commitmentExpiry.split("-")[0]);
      commitmentExpiryDate.setMonth(commitmentExpiry.split("-")[1]-1);
      commitmentExpiryDate.setDate(commitmentExpiry.split("-")[2]);
      
      var note = "Expiring Soon";
      var template = null;
      
      Logger.log(response[i]);
      Logger.log(commitmentExpiry);
      if(commitmentExpiryDate < today){
        note = "Already Expired";
        template = EXPIRY_TEMPLATES["Expired"];
      }
      else if(equalDates(commitmentExpiryDate, today)){
        note = "Expiring Today";
        template = EXPIRY_TEMPLATES["Expires Today"];
      }
      else if(commitmentExpiryDate <= twoDays){
        note = (equalDates(commitmentExpiryDate, twoDays) ? "Expires in 2 days" : "Expiring Tomorrow");
        template = EXPIRY_TEMPLATES["Expires Tomorrow"];
      }
      Logger.log(response[i].referral_source_code[0]);
      Logger.log(response[i].referral_source_code[1]);
      
      var email = LendeskAPILibrary.getReferralAgentEmail(response[i].referral_source_code[0], response[i].referral_source_code[1]);
      
      expiredList.push({"data": response[i], "label" : "Expires: "+commitmentExpiry+" "+note, "template": template, "email": (email ? email : "")});
    }
  }
  
  var section = CardService.newCardSection();
  var selectionInput = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("dealLead")
    .setTitle("Filter By Deal Lead")
    .setOnChangeAction(CardService.newAction().setFunctionName("reload").setLoadIndicator(CardService.LoadIndicator.SPINNER));
  
  selectionInput.addItem("All", "*", (dealLead == "*"));
  for(var i in LENDESK_USERS){
    selectionInput.addItem(LENDESK_USERS[i].name, LENDESK_USERS[i].name, (dealLead == LENDESK_USERS[i].name));
  }  
  
  section.addWidget(selectionInput);
    
  return filteredApplicationCard(expiredList, "Expiring Offers", section);
}

function prepEmails(){

}

function reload(e){
  return getExpiredCommitmentApplications(e);
}

/** 
 *  Prepares a card using application data given in response parameter
 *  Displays No applications found message if response is empty
 *  Calculates number of applications displayed
 *
 *  @param {Object} response The data and label for each application to display, [{"data":{}, "label":"text"}].
 *  @param {String} title The title to display in the card header.
 *  @param {Section} extraSection Optional section to include at the top of the card. 
 *  @return {Card} The card displaying links to the applications given in the response param.
 */
function filteredApplicationCard(response, title, extraSection){
  
  var card = CardService.newCardBuilder(); 
  
  var iconUrl = (response.length < 1 ? IMAGES.SMILE : IMAGES.FROWN);
  
  var count = 0;
  var section = CardService.newCardSection();
  
  if(response.length < 1) {
    section.addWidget(CardService.newTextParagraph().setText("<i>No applications found</i>"));
  }
  else {
    for(var i in response){
      var data = response[i]["data"];
      var label = response[i]["label"];
      var template = response[i]["template"];
      var email =  response[i]["email"]; 
      
      var keyValue = CardService.newKeyValue()
        .setTopLabel(data.state+" | Broker: "+(data.referral_source_code && data.referral_source_code[1] ? data.referral_source_code[1] : "NOT SET"))
        .setBottomLabel(label)
        .setContent(data.primary_applicant_name)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onApplicationClick')
          .setParameters({'applicationId':data.id, 'applicant_name':data.primary_applicant_name}));
        
        if(template){
          keyValue.setButton(CardService.newImageButton().setIcon(CardService.Icon.EMAIL).setAltText("Send Email").setComposeAction(
            CardService.newAction()
              .setFunctionName("composeFromTemplate")
              .setParameters({'applicationId':data.id, 'type':'create', 'templateId': template, "email": email}), CardService.ComposedEmailType.STANDALONE_DRAFT))
        }
        
        count++;
        
        section.addWidget(keyValue);
     }
  }
  
  var header = CardService.newCardHeader().setTitle(title).setSubtitle(count+" applications found");
  
  header.setImageUrl(iconUrl);
  card.setHeader(header);
  
  if(extraSection){
    card.addSection(extraSection);
  }
  card.addSection(section);
  
  return card.build(); // April 28 2020 fix to error, revisit later
}
