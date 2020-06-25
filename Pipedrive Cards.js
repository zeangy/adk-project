/*
 * Creates a card to search for broker contacts in Pipedrive
 *
 * @return {Card} New card with the search field.
 */
function buildPipedrivePersonSearchCard(){
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("Search Pipedrive Contacts")
      .setImageUrl(IMAGES.PIPEDRIVE))
    .addSection(pipedrivePersonSearchSection());
   
   return card.build();
}

/*
 * Creates a section with a search field, submit by pressing enter
 *
 * @return {Section} New card section with the search field.
 */
function pipedrivePersonSearchSection(){
  var section = CardService.newCardSection();
  var searchAction = CardService.newAction().setFunctionName('pipedrivePersonSearchCard');
  
  var searchTextInput = CardService.newTextInput()
     .setFieldName("search_term")
     .setTitle("Search by name or email").setOnChangeAction(searchAction);
  
  section.addWidget(searchTextInput);
  return section;
}

/*
 * Creates a card with a list of keyvalues for each search result in response
 * If no results in response error message is displayed
 *
 * @param {JSON Object} response Search result from Pipedrive API call.
 * @param {String} errorMsg The message to display if response does not contain any results
 * @return {Card} New card section with the results listed as key values.
 */
function pipedrivePersonSearchCard(e) {
  var formInputs = e.commonEventObject.formInputs;
  var searchTerm = (formInputs  ? formInputs.search_term.stringInputs.value : "--");
  var response = PipedriveAPILibrary.searchPersons(searchTerm);
  var errorMessage = "<i>No contacts found matching <b>"+searchTerm+"</b></i>";
  if(response.error){
    errorMessage = "<i>"+response.error.message+"</i>";
    errorMessage = errorMessage.replace("ServerError [ERR_INVALID_INPUT]: ", "");
    response = [];
  }
  var card = CardService.newCardBuilder(); 
  var header = CardService.newCardHeader().setTitle("Search Term: "+searchTerm).setSubtitle(response.length+" contacts found");
  var iconUrl = (response.length < 1 ? IMAGES.FROWN : IMAGES.SMILE);
  
  var section = searchPipedrivePersonListSection(response, errorMessage);
  
  header.setImageUrl(iconUrl);
  card.setHeader(header);
  card.addSection(section);
  card.addSection(pipedrivePersonSearchSection().setHeader("New Search"));
  
  return card.build();
}

/*
 * Creates a section with a list of keyvalues for each search result in response
 * If no results in response error message is displayed
 *
 * @param {JSON Object} response Search result from Pipedrive API call.
 * @param {String} errorMsg The message to display if response does not contain any results
 * @return {Section} New card section with the results listed as key values.
 */
function searchPipedrivePersonListSection(response, errorMsg){
  
  var section = CardService.newCardSection();
  
  if(response.length < 1) {
    section.addWidget(CardService.newTextParagraph().setText(errorMsg));
  }
  else {
    for(var i in response){
      var currentContact = response[i].item;
      var contactName = currentContact.name;
      var contactPhoneList = currentContact.phones;
      var contactEmailList = currentContact.emails;
      var contactId = currentContact.id.toString();
      var contactOrganizationName = "NOT SET";
      var contactOrganizationAddress = "N/A";
      var organizationId = "";
      
      if (currentContact.organization){
        contactOrganizationName = currentContact.organization.name;
        contactOrganizationAddress = currentContact.organization.address;
        organizationId = currentContact.organization.id.toString();
      }
      
      var keyValue = CardService.newKeyValue()
        .setTopLabel("Organization: "+contactOrganizationName)
        .setContent(contactName)
        .setBottomLabel(contactEmailList.join(", "))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('buildPipedrivePersonDetailsCard')
          .setParameters({'personId':contactId, 'organizationId':organizationId}));
      section.addWidget(keyValue);
    }  
  }
  return section;
}

/*
 * Creates a card with Pipedrive contact details
 *
 * @param {EventObject} e
 * @return {Card} Card with details on Pipedrive contact
 */
function buildPipedrivePersonDetailsCard(e, actionResponseBoolean) {
  var personId = e.commonEventObject.parameters["personId"];
      
  var contactDetailSection = CardService.newCardSection().setHeader("Contact Details");
  var contactDetails = PipedriveAPILibrary.getPersonDetails(personId, false);
  var dealInfo = PipedriveAPILibrary.getPersonDeals(personId, false);
  
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Name")
    .setContent(formatLink(contactDetails.name)).setOpenLink(CardService.newOpenLink()
      .setUrl("https://neighbourhoodholdings-originations.pipedrive.com/person/"+personId))
    .setBottomLabel(formatPipedriveClosingStats(dealInfo))
  );
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Email Addresses")
    .setContent(contactDetails.email.map(function(x){return x["value"]+"<br>";}).join(""))
  );
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Phone Numbers")
    .setContent(contactDetails.phone.map(function(x){return x["value"]+"<br>";}).join(""))
  );
  
  var dealSection = CardService.newCardSection().setHeader("Deals");
  var dealDetails = dealInfo.dealDetails;
  if(!dealDetails || dealDetails.length < 1) {
    dealSection.addWidget(CardService.newTextParagraph().setText("<i>No Deals Found</i>"));
  }
  else{
    dealSection.setHeader("Deals: "+dealInfo["open"]+" Open / "+dealInfo["won"]+" Won / "+dealInfo["lost"]+" Lost");
    dealSection.setNumUncollapsibleWidgets(2).setCollapsible(true);
    for(var i in dealDetails){
      if(i < 50){
        var currentDeal = dealDetails[i];
        dealSection.addWidget(CardService.newKeyValue()
          .setContent(currentDeal["title"])
          .setTopLabel(currentDeal["status"].toString())
          .setBottomLabel("Last Updated: "+currentDeal["updated"].toString())
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onApplicationClick')
            .setParameters({'applicationId':currentDeal["lendeskId"], 'applicant_name':currentDeal["title"], 'referral_category': ""}))
          );
      }
    }
    
  }
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(contactDetails.name)
      .setImageUrl(IMAGES.PIPEDRIVE));
      
  card.addSection(contactDetailSection);
  card.addSection(dealSection);
    
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
