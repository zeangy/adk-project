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
 * @return {Section} New card section with the search field
 */
function pipedrivePersonSearchSection(){
  return generalSearchSection(true, false);
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
  
  var card = CardService.newCardBuilder(); 
  var sectionDetail = pipedrivePersonSearchSectionDetail(searchTerm);
  var section = sectionDetail.section;
  var numMatches = sectionDetail.count;
  
  var header = CardService.newCardHeader().setTitle("Search Term: "+searchTerm).setSubtitle(numMatches+" contacts found");
  var iconUrl = (numMatches < 1 ? IMAGES.FROWN : IMAGES.SMILE);
    
  header.setImageUrl(iconUrl);
  card.setHeader(header);
  card.addSection(section);
  card.addSection(pipedrivePersonSearchSection().setHeader("New Search"));
  
  return card.build();
}

/*
 * Creates an object containing:
 * section: Section containing all keyvalues of matching results or error message widget if not found
 * count: The number of results matching the serach term
 *
 * @param {String} searchTerm The term to search Pipedrive persons by
 * @param {Boolean} showIcon Whether to display the Pipedrive Icon in each widget
 * @return {{section : Section, count : Number}} An object containing the section and number of matches found
 */
function pipedrivePersonSearchSectionDetail(searchTerm, showIcon){

  var section = CardService.newCardSection();
  var widgets = [];
  var iconUrl = IMAGES.PIPEDRIVE;
  
  try{
    widgets = getSearchPipedrivePersonWidgets(searchTerm);
    for(var i in widgets){
      if(showIcon){
        widgets[i].setIconUrl(iconUrl);
      }
      section.addWidget(widgets[i]);
    }
  }
  catch(errorMessage){
    section.addWidget(CardService.newTextParagraph().setText(errorMessage));
    // add button to create new contact
    section.addWidget(CardService.newTextButton()
      .setText("Add New Pipedrive Contact")
      .setOnClickAction(CardService.newAction().setFunctionName("buildAddContactCard").setParameters({"name":searchTerm.toString()})));
  }
  var response = {
    "section" : section,
    "count" : widgets.length
  }
  return response;
}

/*
 * Creates a list of keyvalues for each search result in response
 * If no results in response an error message is thrown
 *
 * @param {String} searchTerm The term to search using a Pipedrive API call.
 * @return {[Widget]} A list of the widgets with the search results
 */
function getSearchPipedrivePersonWidgets(searchTerm){
  
  var widgets = [];
  var response = PipedriveAPILibrary.searchPersons((searchTerm ? searchTerm : "--"));
  
  if(response.error){
    var errorMessage = "<i>"+response.error.message+"</i>";
    errorMessage = errorMessage.replace("ServerError [ERR_INVALID_INPUT]: ", "");
    throw errorMessage;
  }
  if(response.length < 1) {
    throw "<i>No Pipedrive contacts found matching <b>"+searchTerm+"</b></i>";
  }
  else {
    for(var i in response){
      var currentContact = response[i].item;
      var keyValue = getPersonKeyValue(currentContact);
      widgets.push(keyValue);
    }  
  }
  return widgets;
}

/*
 * Create a key value for a broker search result
 *
 * @param {{}} currentContact The item returned by the searching persons in Pipedrive
 * @return {KeyValue} A key value widget for that contact, with on click function to open broker page
 */
function getPersonKeyValue(currentContact){
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
  
  return keyValue;
}

/*
 * Search for duplicate pipedrive persons and create a section to display them as keyvalues with merge button
 *
 * @param {{}} updateContactParameters The details of the current contact page, including name, email# and phone#
 * @return {Section} The possible duplicates
 */
function getMergeSection(updateContactParameters){

  var mergeResultSection = CardService.newCardSection();
  var keys = Object.keys(updateContactParameters);
  var search = keys.filter(function(x){return ((x.indexOf("name") >= 0 || x.indexOf("email") >= 0 || x.indexOf("phone") >= 0) && updateContactParameters[x].length > 2);});
  var matchDetails = {};
  
  for(var i in search){
    var response = PipedriveAPILibrary.searchPersons(updateContactParameters[search[i]]);
    for(var j in response){
      var currentContact = response[j].item;

      if(currentContact.id != updateContactParameters.pipedriveId){
        var match = [updateContactParameters[search[i]]];
        if(matchDetails[currentContact.id]){
          matchDetails[currentContact.id]["match"] = matchDetails[currentContact.id]["match"].concat(match);
        }
        else{
          var widget = getPersonKeyValue(currentContact);
          var mergeParameters = {
            "mergeWithId" : updateContactParameters.pipedriveId,
            "mergeWithName" : updateContactParameters.name,
            "ownerId" : updateContactParameters.ownerId,
            "deleteId" : currentContact.id.toString(),
            "deleteName" : currentContact.name
          };
          widget.setButton(CardService.newTextButton()
            .setText("Merge")
              .setOnClickAction(CardService.newAction()
                .setFunctionName("mergePersonsCard")
                .setParameters(mergeParameters)));
          
          // probably has lendesk id
          if(currentContact.custom_fields.filter(function(x){return x.length > 35;}).length > 0){
            widget.setIconUrl(IMAGES.LENDESK);
          }
          matchDetails[currentContact.id] = {
            "match" : match,
            "widget" : widget
          };
        }
      }
    }
  }
  
  for(var i in matchDetails){
    var currentWidget = matchDetails[i]["widget"];
    currentWidget.setBottomLabel("Matches ("+matchDetails[i]["match"].length+"): "+matchDetails[i]["match"].join(", "));
    mergeResultSection.addWidget(currentWidget);
  }
  
  var matchCount = Object.keys(matchDetails).length;
  if(matchCount <= 0){
    mergeResultSection.addWidget(CardService.newTextParagraph().setText("<i>No suspected duplicates</i>"));
  }
  mergeResultSection.setHeader("Possible Duplicates: "+matchCount);
  return mergeResultSection;
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
    var topLabel = (currentNote.person && currentNote.person.name ? "Contact Note: "+currentNote.person.name : "");
    if(currentNote.deal && currentNote.deal.title){
      topLabel = "Deal Note: "+currentNote.deal.title;
    }
    var bottomLabel = "Created by "+(currentNote.user.name.split(" ")[0] || currentNote.user.name || "Unknown")+" at "+currentNote.add_time;
    if(currentNote.add_time != currentNote.update_time){
      bottomLabel = bottomLabel+" | Updated "+(currentNote.last_update_user_id ? " by "+PipedriveAPILibrary.getUserById(currentNote.last_update_user_id) : "")+" at "+currentNote.update_time;
    }
    var currentWidget = CardService.newKeyValue()
      .setMultiline(true)
      .setTopLabel(topLabel)
      .setContent((currentNote.content ? currentNote.content.replace(/<a href="(.*?)"/gi, "<i>[$1]</i> <a") : "")) // remove external links, since
      .setBottomLabel(bottomLabel);
    widgetList.push(currentWidget);
    Logger.log(currentNote.content);
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
    activities = activities.filter(function(x){return (excludeList || []).indexOf(x["type"]) < 0;});
    activities.sort(function(a, b){return new Date(b.add_time) - new Date(a.add_time);});
  }
  
  for(var i in activities){
    var currentActivity = activities[i];
    var bottomLabel = firstLetterUppercase(currentActivity.type)+" Assigned to "+PipedriveAPILibrary.getUserById(currentActivity.assigned_to_user_id)+" at "+currentActivity.add_time;
    var currentWidget = CardService.newKeyValue()
      //.setIcon(ACTIVITY_ICON_MAP[currentActivity.type])
      //.setSwitch(CardService.newSwitch().setFieldName("task_status").setSelected(currentActivity.done).setControlType(CardService.SwitchControlType.CHECK_BOX))
      .setTopLabel((currentActivity.subject || ""))
      .setContent((currentActivity.note_clean || ""))
      .setBottomLabel(bottomLabel);
    if(currentActivity.type != "email"){
      currentWidget.setMultiline(true);
    }
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
  
  for(var i in dealDetails){
    var currentDeal = dealDetails[i];
    widgetList.push(CardService.newKeyValue()
      .setContent(currentDeal["title"])
      .setTopLabel(currentDeal["status"].toString())
      .setBottomLabel("Last updated at "+currentDeal["updated"].toString())
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

function getUpdateContactParameters(contactDetails){
  var updateContactParameters = {
    "name" : (contactDetails.name || ""),
    "type" : (contactDetails.type || ""),
    "tag" : (contactDetails.tag || ""),
    "province" : (contactDetails.province || ""),
    "pipedriveId" : (contactDetails.id || "").toString(),
    "ownerId" : (contactDetails.owner_id && contactDetails.owner_id.id ? contactDetails.owner_id.id.toString() : ""),
  };
  if(contactDetails.org_id && contactDetails.org_id.name && contactDetails.org_id.value){
    updateContactParameters["org_id"] = contactDetails.org_id.value.toString()+" - "+contactDetails.org_id.name;
  }
  
  var keyWords = ["email", "phone"];
  
  for(var key in keyWords){
    var keyWord = keyWords[key];
    for(var i in contactDetails[keyWord]){
      var currDetail = contactDetails[keyWord][i];
      
      updateContactParameters[keyWord+i] = (currDetail.value || "");
      updateContactParameters[keyWord+i+"label"] = (currDetail.label || "");
      updateContactParameters[keyWord+i+"primary"] = (currDetail.primary || "").toString();
    }
  }
  
  return updateContactParameters;
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

  var updateContactParameters = getUpdateContactParameters(contactDetails);
  var updateContactButton = CardService.newTextButton()
    .setText("Edit")
    .setDisabled(true)    
    .setOnClickAction(CardService.newAction()
      .setFunctionName("buildAddContactCard")
      .setParameters(updateContactParameters)
    );
  var nameKeyValue = CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Contact Type: "+(contactDetails.type || "Not Set"))
    .setButton(updateContactButton)
    .setContent(formatLink(contactDetails.name)).setOpenLink(CardService.newOpenLink()
      .setUrl("https://neighbourhoodholdings-originations.pipedrive.com/person/"+personId)
    );
  if(!contactDetails.type || contactDetails.type == "Broker"){
    nameKeyValue.setBottomLabel(formatPipedriveClosingStats(dealInfo));
  }
  if(contactDetails.tag && contactDetails.tag.indexOf("Preferred") >= 0){
    nameKeyValue.setIcon(CardService.Icon.STAR);
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
  var link = "https://script.google.com/a/macros/neighbourhoodholdings.com/s/AKfycbzRm92-feDnnM0C_mfe_dv1EXRVbzpD01iLNtquPsrSPJ5763Y/exec?";
  link = link+"ef="+title;
  for(var i in contactDetails.email){
    link = link+"&ef="+contactDetails.email[i].value;
  }
  for(var i in contactDetails.phone){
    link = link+"&ef="+contactDetails.phone[i].value;
  }
  
  var otherInfo = "Years' of Experience: <b>"+(contactDetails.yearsExperience || "")+"</b><br>"+
      "Primary Business: <b>"+(contactDetails.primaryBusiness || "")+"</b><br>"+
      "Tag: <b>"+(contactDetails.tag || "")+"</b><br>"+
      "Province: <b>"+(contactDetails.province || "")+"</b><br>"+
      "Contact in Lendesk: <b>"+(contactDetails.lendeskId ? "Yes" : "No")+"</b><br>"+
      "<a href='"+link+"'><b>Search Online</b></a>";
      
  contactDetailSection.addWidget(CardService.newKeyValue().setMultiline(true)
    .setTopLabel("Other Info")
    .setContent(otherInfo)
  );
  
  contactDetailSection.addWidget(pipedriveActionButtonSet(personId, title, subtitle));

  var notesSection = pipedriveNoteDisplaySection(personId, 10);
  var noteHeader = "Notes: "+contactDetails["notes_count"];
  notesSection.setHeader(noteHeader)
    .setNumUncollapsibleWidgets(2)
    .setCollapsible(true);
  
  var activitySection = pipedriveActivityDisplaySection(personId, [], 10);
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
  
  var mergeResultSection = getMergeSection(updateContactParameters);
  card.addSection(mergeResultSection);
  
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
 * Create a suggestions widget that updated to a key value if item slected
 *
 * @param {String} type The type of selector, person or organization
 * @param {String} onChangeFunctionName The name of the function to call if the text input value changes
 * @param {String} currentValue Optional - The value currently set, if any
 * @param {String} pipedriveId Optional - The pipedrive Id to pass on when form is submitted
 * @return {Widget} Either a text input or key value depending on if current value is a valid selection
 */
function getSuggestionsWidget(type, onChangeFunctionName, currentValue, parameters){
  var map = PIPEDRIVE_SUGGESTION_MAP[type];
  var title = map.title;
  var fieldName = map.fieldName;
  var suggestionFunctionName = map.suggestionFunctionName;
  
  var widget = null;
  parameters = Object.assign({}, parameters);
  var reload = parameters.reload;
  parameters["reload"] = "true";
  
  var invalidSelection = false;
  var selectedId = null;
  
  // check that current value is in proper format
  if(currentValue){
    selectedId = parsePipedriveIdFromSuggestion(currentValue);
    if(!selectedId){
      invalidSelection = true;
    }
  }
  if(selectedId && parameters["selected"] != "true"){
    parameters["selected"] = "true";
    // reset selection if change is clicked
    widget = CardService.newKeyValue()
      .setMultiline(true)//.setIcon(CardService.Icon.PERSON)
      .setContent("<a href=\"https://neighbourhoodholdings-originations.pipedrive.com/"+type+"/"+selectedId+"\">"+currentValue+"</a>")
      .setTopLabel(title)
      .setButton(CardService.newTextButton()
        .setOnClickAction(CardService.newAction().setFunctionName(onChangeFunctionName).setParameters(parameters))
        .setText("Change"));
  }
  else{
    parameters["selected"] = "false";
    widget = CardService.newTextInput()
      .setTitle(title)
      .setFieldName(fieldName)
      .setOnChangeAction(CardService.newAction().setFunctionName(onChangeFunctionName).setParameters(parameters))
      .setSuggestionsAction(CardService.newAction().setFunctionName("getSuggestionOptions").setParameters({"type":type}));
    if(invalidSelection){
      widget.setHint("Invalid option. Please select an option from the suggestions, it must start with a number.");
    }
  }
  return widget;
}

function getPersonSuggestionWidget(currentValue, parameters){
  return getSuggestionsWidget("person", "buildAddOutsideLendingCard", currentValue, parameters);
}

function getOrganizationSuggestionWidget(currentValue, parameters){
  return getSuggestionsWidget("organization", "buildAddContactCard", currentValue, parameters);
}

/*
 * Get generalized suggestion options
 *
 * @param {Event Object} e Containss form inputs with searchTerm to search for and parameters with type person or organization
 * @return {SuggestionsResponse} The suggestions
 */
function getSuggestionOptions(e){
  var eventData = parseEventObject(e);
  var parameters = eventData.parameters;
  var formInputs = eventData.formInputs;
  
  var map = PIPEDRIVE_SUGGESTION_MAP[parameters.type];
  var searchFunction = map.searchFunction;
  var mapFunction = map.mapFunction;
  var searchTerm = formInputs[map.fieldName];
  var errorMessage = map.errorMessage+searchTerm;
  
  var options = [];
  if(searchTerm.length > 2){
    options = searchFunction(searchTerm).map(function(x){return x.item;}).map(mapFunction);
  }
  if(options.length < 1){
    options = [errorMessage];
  }
  var suggestions = CardService.newSuggestions().addSuggestions(options);
  return CardService.newSuggestionsResponseBuilder()
      .setSuggestions(suggestions)
      .build();
}

/*
 * Create card for adding new declined deal submission or inquiry
 *
 * @param {Even Object} e Optional - for reload
 * @return {Card} 
 */
function buildAddOutsideLendingCard(e){
  var eventData = parseEventObject(e);
  var parameters = eventData["parameters"];
  
  var header = CardService.newCardHeader()
      .setTitle("Record Submission Decline")
      .setSubtitle("For Files Outside Lending Guidelines")
      .setImageUrl(IMAGES.PIPEDRIVE);
  
  var card = CardService.newCardBuilder().setHeader(header);
  var section = CardService.newCardSection();
  
  var customFieldOptions = PipedriveAPILibrary.getDealCustomFieldOptionsByName();
  
  section.addWidget(getPersonSuggestionWidget(parameters.person_id));
  
  section.addWidget(CardService.newTextInput()
    .setFieldName("title")
    .setTitle("Description")
    .setValue((parameters.title || ""))
  );
  
  var ltvOptions = customFieldOptions["LTV"];
  section.addWidget(CardService.newTextInput()
    .setFieldName(ltvOptions["key"])
    .setTitle("Requested LTV")
    .setValue((parameters[ltvOptions["key"]] || ""))
  );
  
  section.addWidget(CardService.newTextInput()
    .setFieldName("value")
    .setTitle("Requested Loan Amount")
    .setValue((parameters.value || ""))
  );
  
  var provinceOptions = customFieldOptions["Province"];
  var provinceSelectionWidget = getSelectionWidgetByParameters(parameters[provinceOptions["key"]], provinceOptions,  CardService.SelectionInputType.DROPDOWN);
  section.addWidget(provinceSelectionWidget);
  
  var stageOptions = PipedriveAPILibrary.OUTSIDE_LENDING_GUIDELINE_STAGES;
  var stageSelectionWidget = CardService.newSelectionInput().setFieldName("stage_id").setTitle("Type").setType(CardService.SelectionInputType.RADIO_BUTTON);
  for(var i in stageOptions){
    stageSelectionWidget.addItem(stageOptions[i], i, (parameters.stage_id == i));
  }
  section.addWidget(stageSelectionWidget);
  
  section.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
    .setFunctionName("createNewPipedriveDeal")
    .setParameters({"person_id" : (parameters.person_id || "")})
    )
  );
  
  card.addSection(section);

  return (parameters.reload ? CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card.build())).build() : card.build());
}
