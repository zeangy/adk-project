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
     .setTitle("Search by name, email, or phone number").setOnChangeAction(searchAction);
  
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
        .setBottomLabel(contactEmailList.concat(contactPhoneList).join(", "))
        .setOnClickAction(CardService.newAction()
          .setFunctionName('buildPipedrivePersonDetailsCard')
          .setParameters({'pipedriveId':contactId, 'organizationId':organizationId}));
      section.addWidget(keyValue);
    }  
  }
  return section;
}

/*
 * Create button set with icons for options to add notes and activities
 *
 * @param {String} pipedriveId The pipedrive contact id
 * @param {String} title Title for the header, nomally the name of the contact
 * @param {String} subtitle Title for the header, nomally the name of the organization
 * @return {ButtonSet} A button set of icons with actions functions attached
 */
function pipedriveActionButtonSet(pipedriveId, title, subtitle){
  var username = getUserName();
  var parameters = {
    "pipedriveId" : pipedriveId,
    "createdByName" : getUserName(), 
    "subtitle" : subtitle,
    "name" : title
  };
  
  var buttonSet = CardService.newButtonSet();
  var activityMap = ACTIVITY_ICON_MAP;
  for(var i in activityMap){
    parameters["activity_type"] = i;
    parameters["title"] = "Add New "+firstLetterUppercase(i)+" For "+title;
    var button = CardService.newImageButton()
      .setIcon(activityMap[i])
      .setAltText("Add "+i)
      .setOnClickAction(CardService.newAction()
        .setFunctionName((i == "note" ? "buildAddPipedriveNotesCard" : "buildAddPipedriveActivitiesCard"))
        .setParameters(parameters)
      );
    buttonSet.addButton(button);
  }
  return buttonSet;
}

/*
 * NOT IN USE - Create Add button for activities or notes
 *
 * @param {String} type The type: activity or note
 * @param {String} pipedriveId The ID of the entry, if applicable
 * @param {String} title Optional - title for page accessed by clicking add button
 * @param {String} subtitle Optional - subtitle for page accessed by clicking add button
 * @return {Button} An add button of the specified type
 */
function createPipedriveAddButton(type, pipedriveId, title, subtitle){
  var parameters = {
    'pipedriveId':pipedriveId, 
    'title':title, 
    'subtitle':subtitle
  };
  var button = CardService.newTextButton()
    .setText(PIPEDRIVE_TYPE_MAP[type]["buttonTitle"])
    .setOnClickAction(CardService.newAction()
    .setFunctionName(PIPEDRIVE_TYPE_MAP[type]["onClickFunctionName"])
    .setParameters(parameters));
  return button;
}

/*
 * Get notes from pipedrive and create key value widgets
 *
 * @param {String} personId The id of the contact in Pipedrive
 * @return {[Widgets]} Keyvalue widgets for each note
 */
function getNoteWidgets(personId){
  var widgetList = [];
  var notes = PipedriveAPILibrary.getPersonNotes(personId);
  if(notes){
    notes.sort(function(a, b){return new Date(b.add_time) - new Date(a.add_time);});
  }
  for(var i in notes){
    var currentNote = notes[i];
    var currentWidget = CardService.newKeyValue()
        .setTopLabel(currentNote.user.name)
        .setContent((currentNote.content || ""))
        .setBottomLabel(currentNote.add_time)
        .setMultiline(true);
    widgetList.push(currentWidget);
  }
  return widgetList;
}

/*
 * Get activities from pipedrive and create key value widgets
 *
 * @param {String} personId The id of the contact in Pipedrive
 * @param {[Strings]} excludeList Optional - A list of types of activities to exclude
 * @return {[Widgets]} Keyvalue widgets for each activity
 */
function getActivityWidgets(personId, excludeList){
  var widgetList = [];
  var activities = PipedriveAPILibrary.getPersonActivities(personId);
  
  if(activities){
    activities = (activities ? activities.filter(function(x){return (excludeList || []).indexOf(x["type"]) < 0;}) : activities);
    activities.sort(function(a, b){return new Date(b.add_time) - new Date(a.add_time);});
  }
  
  for(var i in activities){
    var currentActivity = activities[i];
    var currentWidget = CardService.newKeyValue()
        .setTopLabel(currentActivity.type)
        .setContent((currentActivity.note_clean || ""))
        .setBottomLabel(currentActivity.add_time);
    widgetList.push(currentWidget);
  }
  return widgetList;
}

/*
 * Create key values from deal details
 *
 * @param {JSON} dealDetails The deal details from Pipedrive
 * @return {[Widgets]} Keyvalue widgets for each deal
 */
function getDealWidgets(dealDetails){
  var widgetList = [];
  if(dealDetails){
    dealDetails.sort(function(a, b){return b.updated - a.updated;});
  }
  for(var i in dealDetails){
    var currentDeal = dealDetails[i];
    widgetList.push(CardService.newKeyValue()
      .setContent(currentDeal["title"])
      .setTopLabel(currentDeal["status"].toString())
      .setBottomLabel("Last Updated: "+currentDeal["updated"].toString())
      .setOnClickAction(CardService.newAction()
        .setFunctionName('onApplicationClick')
        .setParameters({'applicationId':currentDeal["lendeskId"], 'applicant_name':currentDeal["title"], 'referral_category': ""}))
      );
  }
  return widgetList;
}

/*
 * Generate a section with list of keyvalues
 *
 * @param {String} type The type: activity, note, or deal
 * @param {[Widgets]} widgets A list of widgets to display
 * @param {Number} limit Optional - the limit of number of keyvalues to display, 50 if not set
 * @return {Section} A section with the widgets specified in the widgets list added
 */
function pipedriveKeyValueDisplaySection(type, widgets, limit){
  var headerName = PIPEDRIVE_TYPE_MAP[type]["headerName"];
  var section = CardService.newCardSection();
  
  limit = (limit ? limit : 50);
  
  var count = 0;
  var displayCount = 0;
  for(var i in widgets){
    if(i < limit){
      section.addWidget(widgets[i]);
      displayCount ++;
    }
    count ++;
  }
  if(displayCount < 1){
    section.addWidget(CardService.newKeyValue().setContent("<i>No "+headerName+" Found</i>"));
  }
  
  section.setHeader(headerName+" ("+count+")");
  
  return section;
}

/*
 * Get notes from pipedrive and create section with list of keyvalues and optional additional widgets at top
 *
 * @param {String} personId The id of the contact in Pipedrive
 * @param {Number} limit Optional - the limit of number of keyvalues to display, 50 if not set
 * @param {[Widgets]} otherWidgets Optional - a list of widgets to display at top of section
 * @return {Section} The section with the keyvalues for activities added
 */
function pipedriveNoteDisplaySection(personId, limit, otherWidgets){
  var type = "note";
  var widgets = (otherWidgets || []).concat(getNoteWidgets(personId));
  var section = pipedriveKeyValueDisplaySection(type, widgets, limit);
  return section;
}

/*
 * Get notes from pipedrive and create section with list of keyvalues and optional additional widgets at top
 *
 * @param {String} personId The id of the contact in Pipedrive
 * @param {[Strings]} excludeList Optional - A list of types of activities to exclude
 * @param {Number} limit Optional - the limit of number of keyvalues to display, 50 if not set
 * @param {[Widgets]} otherWidgets Optional - a list of widgets to display at top of section
 * @return {Section} The section with the keyvalues for activities added
 */
function pipedriveActivityDisplaySection(personId, excludeList, limit, otherWidgets){
  var type = "activity";
  var widgets = (otherWidgets || []).concat(getActivityWidgets(personId, excludeList));
  var section = pipedriveKeyValueDisplaySection(type, widgets, limit);
  return section;
}

/*
 * Create key values from deal details
 *
 * @param {JSON} dealDetails The deal details from Pipedrive
 * @param {Number} limit Optional - the limit of number of keyvalues to display, 50 if not set
 * @param {[Widgets]} otherWidgets Optional - a list of widgets to display at top of section
 * @return {Section} The section with the keyvalues for deals
 */
function pipedriveDealDisplaySection(dealDetails, limit, otherWidgets){
  var type = "deal";
  var widgets = (otherWidgets || []).concat(getDealWidgets(dealDetails));
  var section = pipedriveKeyValueDisplaySection(type, widgets, limit);
  return section;
}

/*
 * Creates a card with Pipedrive contact details
 *
 * @param {EventObject} e
 * @return {Card} Card with details on Pipedrive contact
 */
function buildPipedrivePersonDetailsCard(e, message, actionResponseBoolean) {
  var personId = e.commonEventObject.parameters["pipedriveId"];
      
  var contactDetailSection = CardService.newCardSection();
  
  var contactDetails = PipedriveAPILibrary.getPersonDetails(personId);
  var dealInfo = PipedriveAPILibrary.getPersonDeals(personId);
  var title = contactDetails.name;
  var subtitle = (contactDetails.org_id && contactDetails.org_id.name ? contactDetails.org_id.name : "No Linked Organization");
  var header = CardService.newCardHeader()
      .setTitle((message ? message+" | " : "")+title)
      .setSubtitle(subtitle)
      .setImageUrl(IMAGES.PIPEDRIVE);
  var card = CardService.newCardBuilder().setHeader(header);
  
  var nameKeyValue = CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Contact Type: "+(contactDetails.type || "Not Set"))
    .setContent(formatLink(contactDetails.name)).setOpenLink(CardService.newOpenLink()
      .setUrl("https://neighbourhoodholdings-originations.pipedrive.com/person/"+personId)
    );
  if(!contactDetails.type || contactDetails.type == "Broker"){
    nameKeyValue.setBottomLabel(formatPipedriveClosingStats(dealInfo));
  }
  contactDetailSection.addWidget(nameKeyValue);
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Email Addresses")
    .setContent(contactDetails.email.map(function(x){return "<a href='mailto:"+x["value"]+"'>"+x["value"]+"</a>";}).join("<br>"))
  );
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Phone Numbers")
    .setContent(contactDetails.phone.map(function(x){return x["value"];}).join("<br>"))
  );
  var otherInfo = "Years' of Experience: <b>"+(contactDetails.yearsExperience || "")+"</b><br>"+
      "Primary Business: <b>"+(contactDetails.primaryBusiness || "")+"</b><br>"+
      "Tag: <b>"+(contactDetails.tag || "")+"</b><br>"+
      "Province: <b>"+(contactDetails.province || "")+"</b>";
      
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Other Info")
    .setContent(otherInfo)
  );
  
  contactDetailSection.addWidget(pipedriveActionButtonSet(personId, title, subtitle));

  var notesSection = pipedriveNoteDisplaySection(personId);
  var noteHeader = "Notes: "+contactDetails["notes_count"];
  notesSection.setHeader(noteHeader)
    .setNumUncollapsibleWidgets(2)
    .setCollapsible(true);
  
  var activitySection = pipedriveActivityDisplaySection(personId, ["email"]);
  var activityHeader = "Activities: "+contactDetails["done_activities_count"]+" Done / "+contactDetails["undone_activities_count"]+" Pending";
  activitySection.setHeader(activityHeader)
    .setNumUncollapsibleWidgets(2)
    .setCollapsible(true);
  
  var dealSection = pipedriveDealDisplaySection(dealInfo.dealDetails);
  var dealHeader = "Lendesk Deals: "+(dealInfo["open"] || "0")+" Open / "+(dealInfo["won"] || "0")+" Won / "+(dealInfo["lost"] || "0")+" Lost";
  dealSection.setHeader(dealHeader)
    .setNumUncollapsibleWidgets(2)
    .setCollapsible(true);

  card.addSection(contactDetailSection);
  card.addSection(notesSection);
  card.addSection(activitySection);
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
