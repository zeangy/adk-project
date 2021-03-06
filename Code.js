/** 
  * Universal Actions
  *
  */
function returnToMainMenu() {
  return CardService.newUniversalActionResponseBuilder()
     .displayAddOnCards(buildMainMenuCards())
     .build();
}
function returnToSearch() {
  return CardService.newUniversalActionResponseBuilder()
     .displayAddOnCards([buildApplicationSearchCard()])
     .build();
}
function returnToPipeline() {
  return CardService.newUniversalActionResponseBuilder()
     .displayAddOnCards([buildDisplayPipelineCard()])
     .build();
}

function returnToMyDeals(){
  return CardService.newUniversalActionResponseBuilder()
     .displayAddOnCards([buildDisplayMyDealsCard()])
     .build();
}

/*
 * Function that is run when the add-on launches
 *
 * @returns {Card} Lendesk search card.
 */
function buildAddOn(e) {
  // Activate temporary Gmail add-on scopes.
  try{
    var accessToken = e.gmail.accessToken;
    
    GmailApp.setCurrentMessageAccessToken(accessToken);
  }
  
  catch(err){
  }
  return buildGeneralSearchCard();
}

/*
 * Compiles a list of cards to display in the main menu
 *
 * @returns {Card[]} Array of cards to display in the main menu.
 */
function buildMainMenuCards(){
  
  var cards = [];
  
  cards.push(buildDisplayMyDealsCard());
  cards.push(getExpiredCommitmentApplications());
  cards.push(buildDisplayPipelineCard());
  cards.push(locationSearchCard());
  cards.push(buildGeneralSearchCard());
  cards.push(buildApplicationSearchCard());
  cards.push(buildPipedrivePersonSearchCard());
  
  return cards;
}


/*
 * Find folder based on borrower name, add any message email attachments to folder
 * 
 */
function addToFolder(e){
  var message = GmailApp.getMessageById(e.gmail.messageId);
  var folderName = e.parameters["name"];
  var dealsInProgressFolder = DriveApp.getFolderById("0B8H4kqo6F4_Wfm1uSmVKeDRud0p5TWFsZ215S3RLbXoxRzJsN1VoSlVpeW1IX3p4alVla1U");
  var destFolder = dealsInProgressFolder;
  var folderStatus = "";
  var attachmentNames = [];
  if(dealsInProgressFolder.getFoldersByName(folderName).hasNext()){
    Logger.log("folder exists");
    destFolder = dealsInProgressFolder.getFoldersByName(folderName).next();
    folderStatus = "Folder Updated!";
  }
  else{
    Logger.log("created new folder");
    destFolder = dealsInProgressFolder.createFolder(folderName);
    DriveApp.getFileById("1L1PFw7O1kd1JxllEVJzJDNiMWk2iNYa4qMXmI8NanJ8").makeCopy("UW Checklist - "+folderName, destFolder);
    folderStatus = "Folder Created!";
  }
  
  // Add messages from entire thread
  var attachments = [];
  var threadMessages = message.getThread().getMessages();
  for(var i in threadMessages){
    var messageAttachments = threadMessages[i].getAttachments();
    for(var j in messageAttachments){
      attachments.push(messageAttachments[j]);
    }
  }
  Logger.log(attachments);
  
  for(var i in attachments){  
  
   if(destFolder.getFilesByName(attachments[i].getName()).hasNext()){
     Logger.log("file exists");
   }
   else{
     if(attachments[i].getContentType() != "image/jpeg" && attachments[i].getContentType() != "image/png"){
       var attachmentBlob = attachments[i].copyBlob();
       var file = destFolder.createFile(attachmentBlob);
       Logger.log(file.getName());
       attachmentNames.push(file.getName());
     }
   }
 }
 var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(folderStatus));
 var section = CardService.newCardSection();
 
 section.addWidget(CardService.newTextButton()
   .setText(folderName)
   .setOpenLink(CardService.newOpenLink()
     .setUrl(destFolder.getUrl())));
 
 if(attachmentNames.length > 0){
   for(var i in attachmentNames){
     section.addWidget(CardService.newKeyValue()
       .setTopLabel("Added")
       .setContent(attachmentNames[i]));
    }
 }
 card.addSection(section);
 var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
       //.setNotification(CardService.newNotification().setType(CardService.NotificationType.WARNING).setText("WARNING: still in test phase"))
    .build();
    
  return actionResponse; 
}


function renderEmailTemplate(applicationId, templateId){
  
  var htmlEmailTemplate = LendeskAPILibrary.getLendeskEmailTemplate(templateId);
  
  var htmlBodyTemplate = htmlEmailTemplate.body.replace(/(\n)+/g, "");
  var htmlSubjectTemplate = htmlEmailTemplate.subject.replace(/(\n)+/g, "");
  Logger.log(htmlSubjectTemplate);
  Logger.log(htmlBodyTemplate);
  
  var response = LendeskAPILibrary.getLendeskEmailPreview(applicationId, htmlBodyTemplate, htmlSubjectTemplate);
  return response;
}

function composeFromTemplate(e){

  var applicationId = e.parameters.applicationId;
  var draftType = e.parameters["type"];
  var templateId = (e.formInput["template_selection_field"] ? e.formInput["template_selection_field"] :  e.parameters["templateId"]);
  
  var response = renderEmailTemplate(applicationId, templateId);
  
  // fix issue as of Jan 31 2020
  var rendered_body = response.rendered_body+"<br>";
  var rendered_subject = response.rendered_subject;
  
  //Logger.log(e);
  //Logger.log(rendered_body);
  //Logger.log(rendered_subject);
  
  var draft = null;
  
  if(draftType == "reply" && e.gmail && e.gmail.messageId){    
    var message = GmailApp.getMessageById(e.gmail.messageId);
    draft = message.createDraftReplyAll("", {htmlBody:rendered_body, from:EMAIL, bcc: "team.archive@neighbourhoodholdings.ca"});
  }
  else{
    draft = GmailApp.createDraft((e.parameters["email"] ? e.parameters["email"] : ""), rendered_subject, "", {htmlBody:rendered_body, from:EMAIL, bcc:"team.archive@neighbourhoodholdings.ca"});
  }
  
  var actionResponse = null;
  
  if(e.commonEventObject.hostApp == "GMAIL"){
    actionResponse = CardService.newComposeActionResponseBuilder().setGmailDraft(draft);
  }
  else{
    actionResponse = CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText("Draft Created in Gmail"));
  }
  return actionResponse.build();
}

function emailTemplateSelectionInput(){
  var selection = CardService.newSelectionInput()
    .setTitle("Template")
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("template_selection_field");
    
  for (var i in EMAIL_TEMPLATES){
    selection.addItem(i, EMAIL_TEMPLATES[i], false);
  }
  return selection;
}

function emailTemplateButton(applicationId, replyAllOption){
  
  var buttonSet = CardService.newButtonSet();
  if(replyAllOption){
    buttonSet.addButton(CardService.newTextButton()
      .setComposeAction(CardService.newAction().setFunctionName("composeFromTemplate").setParameters({'applicationId':applicationId, 'type':'reply'}), CardService.ComposedEmailType.REPLY_AS_DRAFT)
      .setText("Reply All"));
  }
  buttonSet.addButton(CardService.newTextButton()
    .setComposeAction(CardService.newAction().setFunctionName("composeFromTemplate").setParameters({'applicationId':applicationId, 'type':'create'}), CardService.ComposedEmailType.STANDALONE_DRAFT)
    .setText("New Draft"));
  return buttonSet;
}

function pipelineStatusSection(lendeskId){
  var updateRangeValues = getPipelineStatus(lendeskId);
  var section = CardService.newCardSection().setCollapsible(true).setHeader("Pipeline").addWidget(CardService.newKeyValue().setTopLabel("Status").setContent(updateRangeValues));
  
  return section;
}
function buildDisplayPipelineCard(){
  //PropertiesService.getUserProperties().deleteProperty("CURRENT_APPLICATION");
  
  var header = CardService.newCardHeader().setTitle("Pipeline Applications List").setImageUrl(IMAGES.GOOGLE_SHEET).setSubtitle("Max 100 applications displayed");
  var card = CardService.newCardBuilder()
    .setHeader(header)
    .addSection(displayPipelineSection())
  return card.build();
}

function displayPipelineSection(){
  
  var pipelineSheet = SpreadsheetApp.openById(PIPELINE.SHEET_ID).getSheetByName(PIPELINE.SHEET_NAME);
  var idRange = pipelineSheet.getRange('AB3:AB').getValues();
  var nameStatusRange = pipelineSheet.getRange('A3:B').getValues();
  
  var section = CardService.newCardSection();
  for(var i = 0; i <100; i++){
    if(idRange[i][0] != ""){
        section.addWidget(CardService.newKeyValue()
        .setTopLabel(nameStatusRange[i][1])
        .setContent(nameStatusRange[i][0])
        .setOnClickAction(CardService.newAction().setFunctionName('onApplicationClick').setParameters({'applicationId':idRange[i][0]})));
    }
  }
  return section;
}

/*
 * Display active deals for a specific user
 *
 * @param {Event Object} e Optional - Event Object containing dealLead forminput
 * @return {Card} A card with a list of applications for a specific user and a dropdown menu to filter by a different user
 */
function buildDisplayMyDealsCard(e){
  var leader = (e ? "*" : getUserName());
  if(e){
    try{
      leader = e.commonEventObject.formInputs.dealLead.stringInputs.value;
    }
    catch(err){
    }
  }
  var response = LendeskAPILibrary.searchActiveApplicationsByLeader(leader);
  
  var header = CardService.newCardHeader()
    .setTitle("Active Deals Created By "+leader)
    .setSubtitle(response.length+" Deals in Pipeline");
    
  header.setImageUrl((response.length > 0 ? IMAGES.SMILE : IMAGES.FROWN));
  
  var card = CardService.newCardBuilder().setHeader(header);
  
  var selectLeaderSection = filterDealLeadSection("buildDisplayMyDealsCard", leader);
  card.addSection(selectLeaderSection);
  
  var showListSection = searchListSection(response, "<i>No applications found</i>");
  card.addSection(showListSection);
  
  return (e ? CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card.build())).build() : card.build());
}

/*
 * Create card with text field for searching Lendesk and Pipedrive
 *
 * @return {Card}
 */
function buildGeneralSearchCard(){
   var card = CardService.newCardBuilder()
  .setHeader(CardService.newCardHeader()
    .setTitle("Search Applications and Contacts")
    .setImageUrl(IMAGES.SEARCH))
  .addSection(generalSearchSection());
   
   return card.build();
}

/*
 * Create card with text field for searching Lendesk only
 *
 * @return {Card}
 */
function buildApplicationSearchCard(){
   var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("Search Lendesk Applications")
      .setImageUrl(IMAGES.LENDESK))
    .addSection(applicationSearchSection());
   
   return card.build();
}

/*
 * Create a section with text field for searching Lendesk, Pipedrive, or both
 *
 * @param {Boolean} excludeLendesk Optional - whether to exclude Lendesk search
 * @param {Boolean} excludePipedrive Optional - whether to exclude Pipedrive search
 * @return {Section}
 */
function generalSearchSection(excludeLendesk, excludePipedrive){
  var titleList = [];
  var functionName = "generalSearchCard";
  var includeLendesk = !excludeLendesk;
  var includePipedrive = !excludePipedrive;
  
  if(includeLendesk){
    titleList.push("Search Lendesk by name or address");
    if(excludePipedrive){
      functionName = "applicationSearchCard";
    }
  }
  if(includePipedrive){
    titleList.push("Search Pipedrive by name, email, or phone");
    if(excludeLendesk){
      functionName = "pipedrivePersonSearchCard";
    }
  }
  var section = CardService.newCardSection();
  var searchAction = CardService.newAction().setFunctionName(functionName);
  
  var searchTextInput = CardService.newTextInput()
     .setFieldName("search_term")
     .setTitle(titleList.join(" and ")).setOnChangeAction(searchAction);
  
  section.addWidget(searchTextInput);
  return section;
}

/*
 * Create a section with text field for searching Lendesk
 *
 * @return {Section}
 */
function applicationSearchSection(){
  return generalSearchSection(false, true);
}

/*
 * Creates a card section with a list of keyvalues for each search result in response
 * If no results in response error message is displayed
 *
 * @param {JSON Object} response Search result from lendesk API call.
 * @param {String} errorMsg The message to display if response does not contain any results
 * @param {Boolean} showIcon Optional - whether to display the Lendesk Icon in each widget
 * @returns {Section} New card section with the results listed as key values.
 */
function searchListSection(response, errorMsg, showIcon){
  
  var iconUrl = IMAGES.LENDESK;
  var section = CardService.newCardSection();
  
  if(response.length < 1) {
    section.addWidget(CardService.newTextParagraph().setText(errorMsg));
  }
  else {
    for(var i in response){
      var applicantName = (response[i].primary_applicant_name ? response[i].primary_applicant_name : "NO PRIMARY APPLICANT SET");
      
      // response[i].collateral_description[0];
      // response[i].loan_amount;
      // response[i].referral_source_code[1];
      // response[i].loan_closing_at;
      // Logger.log(response[i]);
      var currentSource = LendeskAPILibrary.REFERRAL_SOURCE_ARRAY[response[i].referral_sources_company_category_id];
      var referralSource = (currentSource ? currentSource : "");
      var keyValue = CardService.newKeyValue()
        .setTopLabel(response[i].state+" | Broker: "+(response[i].referral_source_code && response[i].referral_source_code[1] ? response[i].referral_source_code[1] : "NOT SET"))
        .setBottomLabel(response[i].collateral_description.join("/ "))
        .setContent(applicantName);
      if(response[i].primary_applicant_name){
        keyValue.setOnClickAction(CardService.newAction()
          .setFunctionName('onApplicationClick')
          .setParameters({'applicationId':response[i].id, 'applicant_name':applicantName, 'referral_category': referralSource}));
      }
      else{
        keyValue.setBottomLabel(response[i].id);
      }
      if(showIcon){
        keyValue.setIconUrl(iconUrl);
      }
      section.addWidget(keyValue);
    }  
  }
  return section;
}

/*
 * Creates a card with search results for Lendesk, Pipedrive, or both
 *
 * @param {Event Object} e Event object passed from call to create card, must include form input search_term
 * @param {Boolean} excludeLendesk Optional - Whether to exclude Lendesk search results
 * @param {Boolean} excludePipedrive Optional - Whether to exclude Pipedrive search results
 * @return {Card} A card with the search results
 */
function generalSearchCard(e, excludeLendesk, excludePipedrive){
    
  var searchTerm = e.formInput["search_term"];
  var card = CardService.newCardBuilder(); 
  var subtitleList = [];
  var responseCount = 0;
  var includeLendesk = !excludeLendesk;
  var includePipedrive = !excludePipedrive;
  
  if(includeLendesk){
    var response = LendeskAPILibrary.searchApplications(searchTerm);
    var section = searchListSection(response, "<i>No Lendesk applications found matching <b>"+searchTerm+"</b></i>", includePipedrive);
    card.addSection(section);
    
    var numLendeskMatches = response.length;
    subtitleList.push(numLendeskMatches+" applications");
    responseCount += numLendeskMatches;
  }
  if(includePipedrive){
    var pipedriveSectionDetail = pipedrivePersonSearchSectionDetail(searchTerm, includeLendesk);
    var pipedriveSection = pipedriveSectionDetail.section;
    card.addSection(pipedriveSection);
    
    var numPipedriveMatches = pipedriveSectionDetail.count;
    subtitleList.push(numPipedriveMatches+" contacts");
    responseCount += numPipedriveMatches;
  }
  
  var header = CardService.newCardHeader().setTitle("Search Term: "+searchTerm).setSubtitle(subtitleList.join(" and ")+" found");

  card.addSection(generalSearchSection(excludeLendesk, excludePipedrive).setHeader("New Search"));
  
  header.setImageUrl((responseCount < 1 ? IMAGES.FROWN : IMAGES.SMILE));
  card.setHeader(header);
  return card.build();
}

/*
 * Creates a card with search results for Lendesk
 *
 * @return {Card} A card with the search results
 */
function applicationSearchCard(e) {
  return generalSearchCard(e, false, true);
}

function onApplicationClick(e){
  return buildApplicationDetailsCard(e, null, true);
}

function buildApplicationDetailsCard(e, customTitle, actionResponseBoolean){
  //PropertiesService.getUserProperties().deleteProperty("CURRENT_APPLICATION");
  //Logger.log("remove");
  //PropertiesService.getUserProperties().setProperty("CURRENT_APPLICATION", applicationId);
  var referralCategory = e.parameters.referral_category;
  var applicationId = e.parameters.applicationId;
  
  var response = LendeskAPILibrary.getApplication(applicationId);

  var applicationUrl = "https://app.lendesk.com/applications/"+applicationId+"/overview";
  
  var openInLendeskLink = CardService.newOpenLink()
    .setUrl(applicationUrl);
 
  var name = ( response.applicants[0].name ? response.applicants[0].name : response.name );
  // FIX: if comes from search will show full name, otherwise shows Lastname Application
  
  var status = response.status.name;
  var closingDate = response.loans[0].funding_date;
  var amount = response.loans[0].liability.credit_limit;
  
  var ltv = response.loans[0].cltv;
  
  // locked state applications have data stored differently, ltv is in form 55.00 instead of 0.55
  if(response.is_locked){
    ltv = ltv/100;
  }
  
  var collateral_list = response["loans"][0]["collateral"];
  
  var initialRate = response.loans[0].liability.initial_interest_rate;
  var interestRate = initialRate;
  
  var lenderFee = 0;
  var fees = response.loans[0].fees;
  for (var i in fees){
    if(fees[i].name == "Lender Fee"){
      lenderFee += fees[i].funds_required/amount;
    }
    else if(fees[i].name == "Rate Buydown Cost"){
      var buydown_rate =  fees[i].funds_required/amount;
      interestRate -= buydown_rate;
      lenderFee += buydown_rate;
    }
  }
  var formattedInterestRate = (interestRate ? formatPercent(interestRate) : "");
  var formattedLenderFee = (lenderFee ? formatPercent(lenderFee) : "0");
  var registeredRate = (interestRate == initialRate ? "" : formatPercent(initialRate));
  
  var tasks = response.tasks; //.filter(function removePipelineNote(x){return x.assignee_id != LendeskAPILibrary.PIPELINE_NOTE_ID});
  
  var card = CardService.newCardBuilder();
  var header = CardService.newCardHeader()
      .setTitle(name);
      
  header.setSubtitle(( collateral_list[0] && collateral_list[0].description ? collateral_list[0].description : "Missing Address"));

  if(customTitle){
    header.setSubtitle(customTitle+" | Broker: "+(response.referral_source && response.referral_source.subtitle ? response.referral_source.subtitle : "NOT SET"));
    header.setImageUrl(IMAGES.UPDATE);
  }
  else{
    if(response.clients.length > 1){
      header.setImageUrl(IMAGES.INDIVIDUAL);
    }
    else{
      header.setImageUrl(IMAGES.MULTIPLE);
    }
  }
  
  card.setHeader(header);
  
  var fontColour = (response.owner && LENDESK_USERS[response.owner.first_name] && LENDESK_USERS[response.owner.first_name].colour ? LENDESK_USERS[response.owner.first_name].colour : "#000000"); 
  var section = CardService.newCardSection()
    .setHeader("<font color=\""+fontColour+"\">Deal Lead: "+response.owner.name+"</font>"+(referralCategory ? "<br><font color=\"#70767f\">Category: "+referralCategory+"</font>" : ""));  
  

  section.addWidget(CardService.newTextButton()
    .setText("BDM and Underwriting Notes")
    .setOnClickAction(CardService.newAction().setFunctionName("buildAddNotesCard").setParameters({'applicationId':applicationId, 'name':name})));
  
  var brokerName = "NOT SET";
  var pipedriveBrokerDetail = {};
  
  if(response.referral_source && response.referral_source.subtitle){
    brokerName = response.referral_source.subtitle;
    if(response.referral_source.referable_id){
      pipedriveBrokerDetail = PipedriveAPILibrary.getLendeskPersonDeals(response.referral_source.referable_id);
    }
  }
  
  var brokerKeyValue = CardService.newKeyValue()
    .setTopLabel("Broker")
    .setContent(brokerName)
    .setBottomLabel(formatPipedriveClosingStats(pipedriveBrokerDetail)
  );
  
  if(pipedriveBrokerDetail.id){
    brokerKeyValue.setIconUrl(IMAGES.PIPEDRIVE);
    brokerKeyValue.setOnClickAction(CardService.newAction().setFunctionName("buildPipedrivePersonDetailsCard").setParameters({'pipedriveId':pipedriveBrokerDetail.id}));
  }
  
  section.addWidget(brokerKeyValue);
  
  var statusList = LendeskAPILibrary.STATUS_NAME_LIST;//["1. Lead", "2. Sent Commitment", "3. Received Commitment", "4. Instructed", "5. Funded", "Complete", "Declined", "Cancelled"];
  
  if(statusList.indexOf(status) >= 0){
    var statusSelection = CardService.newSelectionInput()
      .setTitle("Status")
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName("status_selection_field")
      .setOnChangeAction(CardService.newAction().setFunctionName("updateStatus").setParameters({'applicationId':applicationId}));
    for(var i in statusList){
      statusSelection.addItem(statusList[i], statusList[i], status==statusList[i])
    }
    section.addWidget(statusSelection);
  }
  else{
    section.addWidget(CardService.newKeyValue()
      .setTopLabel("Status")
      .setContent(status)
    );
  }
  
  // Show cancelled/declined reason
  if(response.account_status && status.indexOf("Declined") >= 0 || status.indexOf("Cancelled") >= 0 || status.indexOf("On Hold") >= 0){
    section.addWidget(CardService.newKeyValue()
      .setTopLabel(status+" Reason: "+(response.account_status.end_state_reason ? response.account_status.end_state_reason.title || "" : ""))
      .setContent("<font color='#ab0000'>"+(response.account_status.description || "--")+"</font>")
      .setMultiline(true)
    );
  }
  
  if(response.applicants.length > 1){
    for(var i = 1; i<response.applicants.length; i++){
     name += ", "+response.applicants[i].name; 
    }
  }
  section.addWidget(CardService.newKeyValue()
    .setTopLabel("Applicant Names")
    .setContent((name ? formatLink(name) : ""))
    .setOpenLink(openInLendeskLink)); 
  
  if(status.indexOf("Sent Commitment") >= 0 || status.indexOf("Quote") >= 0 || status.indexOf("TEST") >= 0){
      var commitmentExpiry = (response.loans[0].commitment && response.loans[0].commitment.expiry_date ? response.loans[0].commitment.expiry_date : "");
      var formattedCommitmentExpiry = (commitmentExpiry ? Utilities.formatDate(new Date(commitmentExpiry), "UTC", "MMMM d, yyyy") : "");
      var commitmentParameters = {
        "applicationId":applicationId,
        "loanId" : response.loans[0].id,
        "currentDate" : commitmentExpiry,
        "title" : "Update Commitment Details", 
        "datePickerTitle" : "Commitment Expiry Date", 
        "submitFunctionName" : "submitCommitmentUpdate"
      };
      section.addWidget(CardService.newKeyValue()
        .setTopLabel("Commitment Expiry Date")
        .setContent(formattedCommitmentExpiry)
        .setButton(CardService.newTextButton()
          .setText("Edit")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("buildUpdateDateCard")
            .setParameters(commitmentParameters)
          )
        )
      );
  }
  
  var dailyInterest = amount*(Math.pow(1+response.loans[0].liability.effective_annual_rate,1/365)-1);
    
  var fundingParameters = {
    "applicationId":applicationId,
    "loanId" : response.loans[0].id,
    "currentDate" : (closingDate ? closingDate : ""),
    "title" : "Update Funding Details", 
    "datePickerTitle" : "Estimated Closing Date", 
    "submitFunctionName" : "submitFundingUpdate"
  };
  
  section.addWidget(CardService.newKeyValue()
    .setTopLabel("Funding Date and Daily Interest")
    .setContent((closingDate ? Utilities.formatDate(new Date(closingDate), "UTC", "MMMM d, yyyy") : "ASAP")+" | $"+dailyInterest.toFixed(2))
    .setButton(CardService.newTextButton()
      .setText("Edit")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("buildUpdateDateCard")
        .setParameters(fundingParameters) 
      )
    )
  );  
      
  section.addWidget(CardService.newKeyValue()
    .setTopLabel("Loan Amount")
    .setContent((amount ? formatCurrency(amount) : "")));
  
  var totalInterestRate = "Rate: "+formattedInterestRate+(registeredRate ? " (Reg. @"+registeredRate+")" : "")+" | "+"Fee: "+formattedLenderFee;

  section.addWidget(CardService.newKeyValue()
    .setTopLabel("Interest Rate and Lender Fee")
    .setContent(totalInterestRate));
  
  section.addWidget(CardService.newKeyValue()
    .setTopLabel("LTV")
    .setContent((ltv ? formatPercent(ltv) : "")));
  
  var tags = response.tags;
  var formattedTags = "";
  var sep = " ";
  for(var i in tags){
    if(i > 0){
      sep = ", ";
    }
    formattedTags = tags[i].name + sep + formattedTags;
  }
  
  if(formattedTags != ""){
    section.addWidget(CardService.newKeyValue()
        .setTopLabel("Tags")
        .setContent(formattedTags)
        //.setButton(CardService.newTextButton().setText("Edit").setOnClickAction(CardService.newAction().setFunctionName("buildTagsCard").setParameters({"applicationId":applicationId, "tags" : formattedTags})))
       );
  }

  var appraisalValue = null;
  var appraisalDate = new Date();
  
  for(var i in collateral_list){
    
    var property_values = collateral_list[i]["property_detail"]["values"];
    for (var j in property_values){
      if (property_values[j]["value_type"] == "appraised_value"){
        appraisalValue = property_values[j]["value"];
        if(property_values[j]["year"] && property_values[j]["month"] && property_values[j]["day"]){
          appraisalDate = new Date(property_values[j]["year"], property_values[j]["month"]-1, property_values[j]["day"]);
        }
      }
    }
    
    var currentDate = new Date();
    var propertyUpdateParameters = {
      'applicationId':applicationId, 
      'collateralId':collateral_list[i].id,
      'collateralDescription': (collateral_list[i].description ? collateral_list[i].description : ""),
      'legalAddress': (collateral_list[i].property_detail.legal_address ? collateral_list[i].property_detail.legal_address : ""),
      'appraisalValue': (appraisalValue ? appraisalValue.toString() : ""), 
      'appraisalDate': appraisalDate.getTime().toString()
    };
    
    section.addWidget(CardService.newKeyValue()
      .setTopLabel((collateral_list[i].description ? collateral_list[i].description : "Missing Address"))
      .setContent((appraisalValue ? formatCurrency(appraisalValue) : (collateral_list[i].value ? formatCurrency(collateral_list[i].value) : "Missing Value")))
      .setBottomLabel((appraisalValue ? "Appraised Value" : "Estimated Value"))
      .setButton(CardService.newTextButton()
        .setText("Edit")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("buildUpdatePropertyCard")
          .setParameters(propertyUpdateParameters))));

  }    
  //section.addWidget(CardService.newKeyValue()
  //  .setTopLabel("Appraisal Date")
  //  .setContent((appraisalDate ? appraisalDate : "Outstanding")));
  var pipelineNote = "";
  var pipelineNoteId = "";
  
  var checkboxGroup = CardService.newSelectionInput()
     .setType(CardService.SelectionInputType.CHECK_BOX)
     .setTitle("Subjects")
     .setFieldName("checkbox_field");
  var checked =  {};
  
  for (var i in tasks){
  
    if(tasks[i].assignee_id != LendeskAPILibrary.PIPELINE_NOTE_ID){
     
      // May 1 2018 - google changed style of checkboxes
      // April 2020 - google changed style back but still too difficult to read when size not reduced
      var fullDescription = tasks[i]["description"].toString();
      var description = fullDescription.substring(0,70)+(fullDescription.length > 70 ? "..." : ""); 
      checkboxGroup.addItem(description, tasks[i]["id"], tasks[i]["completed"]);
      if(tasks[i]["completed"]){
        checked[tasks[i]["id"].toString()] = tasks[i]["completed"].toString();
      }
    }
    else{
      pipelineNote = tasks[i]["description"].toString();
      pipelineNoteId = tasks[i]["id"].toString();
    }
  }
  
  var checkbox_action = CardService.newAction().setFunctionName('updateLendeskTasks').setParameters({'applicationId':applicationId});
  checkboxGroup.setOnChangeAction(checkbox_action);
  
  if (tasks.length > 0){
    section.addWidget(checkboxGroup);
  }
  
  section.addWidget(CardService.newTextInput()
    .setFieldName("pipelineNote")
    .setTitle("Pipeline Note")
    .setValue(pipelineNote)
    .setOnChangeAction(CardService.newAction().setFunctionName("updatePipelineNote").setParameters({"applicationId":applicationId, "taskId":pipelineNoteId, "description":pipelineNote})));
  
  var moreOptionsSection = CardService.newCardSection()
    //.setCollapsible(true)
    .setHeader("More Options");
  
  var duplicateSearch = [];
  // borrower names
  duplicateSearch.push(name);
  // full address
  duplicateSearch.push(collateral_list.map(function(x){ return (x.unit_number ? x.unit_number+" - " : "")+x.street_address+" "+x.city+" "+x.province+" "+(x.postal_code || "").substring(0,3);}).join(", "));
  // condo building name
  var condoList = collateral_list.filter(function(x){ return x.unit_number != null; });
  if(condoList.length > 0){
    duplicateSearch.push(condoList.map(function(x){ return x.street_address+" "+x.city+" "+x.province; }).join(", "));
  }
  
  var quickLinksParameters = {
    'applicationId':applicationId, 
    'status': status, 
    'folderName': getFolderName(response.applicants), 
    'duplicateSearchTerm': duplicateSearch.join(", ")
  };
  
  moreOptionsSection.addWidget(CardService.newTextButton()
    .setText("Quick Links")
    .setOnClickAction(CardService.newAction().setFunctionName("buildQuickLinksCard").setParameters(quickLinksParameters)));

  moreOptionsSection.addWidget(CardService.newTextButton()
    .setText("Broker and Solicitor Notes")
    .setOnClickAction(CardService.newAction().setFunctionName("buildUpdateNotesCard").setParameters({'applicationId':applicationId, 'name':name})));
  
  var testOptionsSection = CardService.newCardSection()
    .setCollapsible(true)
    .setHeader("Options in Test Phase");
  
  testOptionsSection.addWidget(CardService.newTextButton()
    .setText("Rate Calculator")
    .setOnClickAction(CardService.newAction().setFunctionName("buildRateCalculatorCard").setParameters({'applicationId':applicationId, 'name':name, 'rate':formattedInterestRate, 'fee':formattedLenderFee})));
  testOptionsSection.addWidget(CardService.newTextButton()
    .setText("Update Loan Details")
    .setOnClickAction(CardService.newAction().setFunctionName("buildUpdateLendeskCard").setParameters({'applicationId':applicationId})));
  
  card.addSection(section);
  
  var emailSection = CardService.newCardSection()
    .setHeader("Email")
    .addWidget(emailTemplateSelectionInput())
    .addWidget(emailTemplateButton(applicationId, (e.gmail && e.gmail.messageId)));
  
  
  card.addSection(emailSection);
  //card.addSection(folderSection);
  card.addSection(moreOptionsSection);
  //card.addSection(testOptionsSection);
  //card.addSection(pipelineStatusSection(applicationId));
  
  
  if(actionResponseBoolean){
    var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card.build()))
    .build();
    return actionResponse;
  }
  else{
    return card.build();
  }
  
}

/*
 * Create quick links card
 *
 * @param {Event Object} e
 * @return {Card}
 */
function buildQuickLinksCard(e){
  var parameters = e.commonEventObject.parameters;
  var applicationId = (parameters.applicationId || "");
  var folderName = (parameters.folderName || "");
  var currentStatus = (parameters.status || "");
  var duplicateSearchTerm = (parameters.duplicateSearchTerm || "");
  
  var alphaId = "AKfycbz-4g3tn2CA9U_E3S484ifOYtLIJ2Q_BfPqymtaCPUxVZIfzoc";
  var betaId = "AKfycbwOTfWnfi-m6FT1IKZiZGI5215X8V0_lgFv-kQ3adXNUlGth5c";
  
  var rateCalculatorLink = "https://script.google.com/a/macros/altmortgages.ca/s/"+betaId+"/exec?ID="+applicationId+"&User="+getUserName()//renderEmailTemplate(applicationId, "b6b098e2-6dc3-4593-a095-2607a3d16cdb").rendered_body;
  //rateCalculatorLink = rateCalculatorLink.replace(/<!--[\s\S]*?-->/g, "").replace(/\&amp\;/g, "&");
  //rateCalculatorLink = rateCalculatorLink.replace(/User\=.*/, "User="+getUserName());
  
  var applicantGoogleSearchLink = renderEmailTemplate(applicationId, "d64f8a83-b8dc-43b4-877a-256ccc5a128d").rendered_body;
  applicantGoogleSearchLink = applicantGoogleSearchLink.replace(/<!--[\s\S]*?-->/g, "").replace(/\&amp\;/g, "&");
  
  //var pipelineAndFolderLink = renderEmailTemplate(applicationId, "d4f70918-545e-46e2-8cd1-74c26851d275").rendered_body;
  //pipelineAndFolderLink = pipelineAndFolderLink.replace(/<!--[\s\S]*?-->/g, "").replace(/\&amp\;/g, "&");
  //var folderName = pipelineAndFolderLink.match(/Name\=(.*?)\&/)[1];
  
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(folderName));

  var section = CardService.newCardSection();
  
  if(e.parameters.reload){
    section.addWidget(CardService.newTextParagraph().setText("<font color=\"#21C004\"><b><i>Updated!</i></b></font>"));
  }
  section.addWidget(CardService.newTextParagraph().setText("<b>QuickLink Steps:</b>"));
  section.addWidget(CardService.newTextButton()
    .setText("1. Rate Calculator")
    .setOpenLink(CardService.newOpenLink()
      .setUrl(rateCalculatorLink)));
      
  section.addWidget(CardService.newTextButton()
    .setText("2. Update Rate (if applicable)")
    .setOpenLink(CardService.newOpenLink()
      .setUrl("https://app.lendesk.com/applications/"+applicationId)));
  
  section.addWidget(createStatusDropdown(currentStatus, applicationId, "3. Update Status (if applicable)"));
  
  /*section.addWidget(CardService.newTextButton()
    .setText("3. Set to Lead (if applicable)")
    .setOnClickAction(CardService.newAction()
      .setFunctionName("buildQuickLinksCard")
      .setParameters({'applicationId':applicationId, 'reload':"true"})));
      */
  var cutoff = 1300;
  if(applicantGoogleSearchLink.length > cutoff){
    applicantGoogleSearchLink = applicantGoogleSearchLink.substring(0, cutoff);
    section.addWidget(CardService.newTextParagraph().setText("<b>**URL too long, link has been truncated**</b>"));
  }
  section.addWidget(CardService.newTextButton()
    .setText("4. Applicant Google Search")
    .setOpenLink(CardService.newOpenLink()
      .setUrl(applicantGoogleSearchLink)));
  /*
  section.addWidget(CardService.newTextButton()
    .setText("5. Add to Pipeline")
    .setOpenLink(CardService.newOpenLink()
      .setUrl(pipelineAndFolderLink)));
  */
  section.addWidget(CardService.newTextButton()
      .setText("5. Create Folder and Add Attachments")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("addToFolder")
        .setParameters({'name':folderName})));
  
  var folderSearch = DriveApp.getFolderById("0B8H4kqo6F4_Wfm1uSmVKeDRud0p5TWFsZ215S3RLbXoxRzJsN1VoSlVpeW1IX3p4alVla1U").getFoldersByName(folderName);
  var driveFolderDesc = CardService.newKeyValue()
    .setTopLabel("Google Drive Folder")
    .setContent(folderName);
  if(folderSearch.hasNext()){
    driveFolderDesc.setOpenLink(CardService.newOpenLink().setUrl(folderSearch.next().getUrl()));
  }
  section.addWidget(driveFolderDesc);      
  
  card.addSection(section);
  
  // search for duplicates
  var searchList = duplicateSearchTerm.split(", ");
  for(var i in searchList){
    var searchTerm = searchList[i];
    var response = LendeskAPILibrary.searchApplications(searchTerm).filter(function(x){return x.id != applicationId;});
    card.addSection(searchListSection(response, "<i>No duplicates suspected</b></i>", false).setHeader("Duplicate search: <b>"+searchTerm+"</b>"));
  }
  
  if(e.parameters.reload){
    var actionResponse = card.build();
  }
  else{
    var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
  }
  
  return actionResponse;
}



function submitPropertyUpdate(e){

  var oldValues = e.parameters;
  var newValues = e.commonEventObject.formInputs;
  var newAppraisalValue = newValues.appraisalValue.stringInputs.value;
  var newDate = msSinceEpochToDate(newValues.appraisalDate.dateInput.msSinceEpoch);
  var oldDate = msSinceEpochToDate(oldValues["appraisalDate"]);
  
  var legalAddress = newValues.legalAddress.stringInputs.value;
  
  if(oldValues.appraisalValue != newAppraisalValue || oldDate.getTime() != newDate.getTime()){
    LendeskAPILibrary.updateLendeskPropertyValue(oldValues.collateralId, newAppraisalValue, newDate.getDate(), newDate.getMonth()+1, newDate.getFullYear());
  }
  if(legalAddress && oldValues.legalAddress != legalAddress){
    LendeskAPILibrary.updateLendeskLegalAddress(oldValues.collateralId, legalAddress);
  }

  return buildApplicationDetailsCard(e, "", false);
}

function updateLendeskNotes(e){
  
  var applicationId = e.parameters.applicationId;
  
  var compare = [
    {
      "updated" : e.formInputs.broker_notes_field,
      "old" : e.parameters.brokerNote,
      "keyWord" : e.parameters.brokerNoteKey
    },
    {
      "updated" : e.formInputs.borrower_solicitor_contact_field,
      "old" : e.parameters.borrowerSolicitor,
      "keyWord" : e.parameters.borrowerSolicitorNoteKey
    }
  ];
  
  Logger.log("Compare");
  
  for(var i in compare){
    if(compare[i].updated && compare[i].updated != compare[i].old){
      LendeskAPILibrary.createLendeskNote(applicationId, compare[i].keyWord+"<br>"+compare[i].updated.toString().replace(/\n/g, "<br>"));
    }
  }
  return buildApplicationDetailsCard(e, "Updated Notes!", false);
  
}

function updateStatus(e){

  var statusString = e.formInputs["status_selection_field"][0];
  var applicationId = e.parameters.applicationId;

  Logger.log(statusString);
  Logger.log(applicationId);
  
  //var pipelineUpdated = setPipelineStatus(applicationId, statusString);
  if(statusString == "Declined" || statusString == "Cancelled"){
    return passedCard(applicationId, statusString);
  }
  else{
    var response = LendeskAPILibrary.updateLendeskStatus(applicationId, statusString);
    if(!response){
      return buildApplicationDetailsCard(e, "**STATUS UPDATE FAILED**", false);
    }
  }
  

  // find row by id
  // update col B with status name
  // find status in AC:AH
  // add timestamp in AC:AH
  // sort
  // find lendesk status id
  // update lendesk status
}

function passedCard(applicationId, status){

  var section = CardService.newCardSection();
  
  var statusList = ["Declined", "Cancelled"];
  
  if(statusList.indexOf(status) >= 0){
    var statusSelection = CardService.newSelectionInput()
      .setTitle("Status")
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName("status_selection_field")
      .setOnChangeAction(CardService.newAction().setFunctionName("updateStatus").setParameters({'applicationId':applicationId}));
    for(var i in statusList){
      statusSelection.addItem(statusList[i], statusList[i], status==statusList[i])
    }
    section.addWidget(statusSelection);
  }
 
  
  var reasons = LendeskAPILibrary.getEndStateReasons(status);

  var reasonSelection = CardService.newSelectionInput()
    .setFieldName("end_state_reason")
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle("Reason");
    
  for(var i in reasons){
    reasonSelection.addItem(reasons[i].title, reasons[i].id, false);
  }
  
  section.addWidget(reasonSelection);
  
  section.addWidget(CardService.newTextInput().setFieldName("description").setTitle("Note"));
  
  section.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction().setFunctionName("setPassedStatus").setParameters({"applicationId":applicationId})));
  var card = CardService.newCardBuilder().addSection(section);
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .updateCard(card.build()))
    .build();
    
  return actionResponse;
}
function setPassedStatus(e){
  Logger.log(e);
  var applicationId = e.parameters.applicationId;
  var statusId = LendeskAPILibrary.LENDESK_STATUS_ARRAY[e.formInputs.status_selection_field[0]];
  var endStateReasonId = e.formInputs.end_state_reason[0];
  var description = (e.formInputs.description ? e.formInputs.description[0] : "");
  
  Logger.log(applicationId);
  Logger.log(statusId);
  Logger.log(endStateReasonId);
  Logger.log(description);
  var response = LendeskAPILibrary.setEndState(applicationId, statusId, endStateReasonId, description);
  if(!response){
    return buildApplicationDetailsCard(e, "**STATUS UPDATE FAILED**", false);
  }
  else{
    return buildApplicationDetailsCard(e, "", false);
  }
}

function updateLendeskTasks(e){
  var current = (e.formInputs["checkbox_field"] == undefined ? [] : e.formInputs["checkbox_field"]);
  var tasks = LendeskAPILibrary.getLendeskTasks(e.parameters.applicationId);
  var previous = [];
  for (var i in tasks){
    if(tasks[i]["completed"]){
      previous.push(tasks[i]["id"]);
    }
  }
  
  Logger.log(current);
  Logger.log(previous);
  
  // box unchecked
  for (var i in previous){
    if(current.indexOf(previous[i]) < 0){
      Logger.log("unchecked");
      Logger.log(previous[i]);
      
      LendeskAPILibrary.updateTask(previous[i], false);
    }
  }
  // box checked
  for (var i in current){
    if(previous.indexOf(current[i]) < 0){
      Logger.log("checked");
      Logger.log(current[i]);
      
      LendeskAPILibrary.updateTask(current[i], true);
    }
  }
}

function updatePipelineNote(e){
  var taskId = (e.parameters.taskId ? e.parameters.taskId : "");
  var applicationId = (e.parameters.applicationId ? e.parameters.applicationId : "");
  var note = (e.formInputs["pipelineNote"] ? e.formInputs["pipelineNote"][0] : "");
  
  if(note.trim().length < 1){
    note = "-";
  }
  if(taskId != ""){
    if(note == "-"){
      LendeskAPILibrary.deleteTask(taskId);
    }
    else{
      LendeskAPILibrary.updateTaskDescription(taskId, note);
    }
  }
  else if(applicationId != ""){
    var taskId = LendeskAPILibrary.addGeneralTask(applicationId, note);
    if(taskId){
      LendeskAPILibrary.assignTask(taskId,LendeskAPILibrary.PIPELINE_NOTE_ID);
    }
  }
  return buildApplicationDetailsCard(e, "", false);
}

function createStatusDropdown(currentStatus, applicationId, title){
  var statusList = LendeskAPILibrary.STATUS_NAME_LIST; //["1. Lead", "2. Sent Commitment", "3. Received Commitment", "4. Instructed", "5. Funded", "Complete", "Declined", "Cancelled"];
  var statusSelection = null;
  
  if(statusList.indexOf(currentStatus) >= 0){
    statusSelection = CardService.newSelectionInput()
      .setTitle(title)
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName("status_selection_field")
      .setOnChangeAction(CardService.newAction().setFunctionName("updateStatus").setParameters({'applicationId':applicationId}));
    for(var i in statusList){
      statusSelection.addItem(statusList[i], statusList[i], currentStatus==statusList[i])
    }
  }
  else{
    statusSelection = CardService.newKeyValue()
      .setTopLabel("Status")
      .setContent(currentStatus);
  }
  return statusSelection;
}