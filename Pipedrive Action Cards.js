/*
 * Create a note in Pipedrive
 *
 * @param {EventObject} e
 * @returns {Card} Contact card
 */
function addPipedriveNote(e){
  var pipedriveId = e.commonEventObject.parameters.pipedriveId;
  var createdByName = e.commonEventObject.parameters.createdByName;
  var formInputs = e.commonEventObject.formInputs;
  var note = (formInputs  ? formInputs.note.stringInputs.value : "");
  var parsedNote = note.toString().replace(/\n/g, "<br>");
  var message = "Created Note!";
  
  if(note){
    PipedriveAPILibrary.addNoteToPerson(pipedriveId, parsedNote, createdByName);
  }
  else{
    message = "Error: Note not created";
  }
  
  return buildPipedrivePersonDetailsCard(e, message, false);
}

/*
 * Create an activity in Pipedrive
 *
 * @param {EventObject} e
 * @returns {Card} Contact card
 */
function addPipedriveActivity(e){
  var parameters = e.commonEventObject.parameters;
  var formInputs = e.commonEventObject.formInputs;
  var message = "Created Activity!";
  
  if(formInputs){
    var activityType = parameters.activity_type;
    var linkToId = parameters.pipedriveId;
    var date = null;
    var time = null;
    var startDateObj = (formInputs.start_date ? formInputs.start_date.dateTimeInput : null);
    if(startDateObj){
      var startDate = new Date(parseInt(startDateObj.msSinceEpoch));
      if(startDateObj.hasDate){
        date = Utilities.formatDate(msSinceEpochToDate(startDateObj.msSinceEpoch), "UTC", "YYYY-MM-dd");
      }
      if(startDateObj.hasTime){
        time = Utilities.formatDate(startDate, "UTC", "HH:mm");
      }
    }
    var duration = (formInputs.duration ? formInputs.duration.stringInputs.value.toString() : null);
    var note = (formInputs.note ? formInputs.note.stringInputs.value : "").toString();
    var subject = (formInputs.subject ? formInputs.subject.stringInputs.value : "").toString();
    var createdByName = (formInputs.assignee ? formInputs.assignee.stringInputs.value : null);
    var markDone = (formInputs.complete ? true : false);
    PipedriveAPILibrary.addActivity(activityType, subject, note, date, time, duration, createdByName, markDone, linkToId, "persons");
  }
  else{
    message = "Error: Activity not created";
  }
  
  return buildPipedrivePersonDetailsCard(e, message, false);
  
}

function getOrganizationMergeWidget(mergeOrg, deleteOrg){
  var map = PIPEDRIVE_SUGGESTION_MAP["organization"];
  var  widget = CardService.newSelectionInput()
        .setTitle(map.title)
        .setFieldName(map.fieldName)
        .setType(CardService.SelectionInputType.RADIO_BUTTON)
        .addItem((mergeOrg || "No Organization"),mergeOrg, true)
        .addItem((deleteOrg || "No Organization"), deleteOrg, false);
        
  return widget;
}

/*
 * Create card to update exising contact or add a new contact in Pipedrive
 *
 * @param {Event Object} e Optional
 * @return {Card}
 */
function buildAddContactCard(e){
  var eventData = parseEventObject(e);
  var parameters = eventData["parameters"];
  var formInput = eventData["formInputs"];
  
  var isMerge = parameters.mergeWithId;
  
  var title = (isMerge ? "Merge "+parameters.deleteName+" with "+parameters.mergeWithName : (parameters.pipedriveId ? "Update" : "Create")+" Contact");
  var subtitle = (isMerge ? "Delete "+parameters.deleteId+", Update "+parameters.mergeWithId : "");
  
  parameters = updatePrimary(parameters, formInput); 
  
  
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader()
    .setTitle(title)
    .setSubtitle(subtitle)
    .setImageUrl(IMAGES.PIPEDRIVE)
  );
  var section = CardService.newCardSection();
  
  // if organizations are the same, show regular widget
  var deleteOrg = parameters.deleteOrg;
  
  if(!deleteOrg || parameters.org_id == deleteOrg){
    section.addWidget(getOrganizationSuggestionWidget(parameters.org_id, "buildAddContactCard", parameters));
  }
  else{
    section.addWidget(getOrganizationMergeWidget(parameters.org_id, parameters.deleteOrg));
  }
  
  var name =  CardService.newTextInput()
    .setFieldName("name")
    .setTitle("Full Name")
    .setValue((parameters.name || ""));
  
  if(isMerge){
    name.setHint((parameters.deleteName || ""));
    var ownerSelectionInput = getOwnerIdDropdown(parameters.owner_id);
  }
  
  section.addWidget(name);
  if(ownerSelectionInput){
    section.addWidget(ownerSelectionInput);
  }
  
  var emailWidgets = getTextWidgetsByParameters(parameters, "email");
  for (var i in emailWidgets){
    section.addWidget(emailWidgets[i]);
  }

  var phoneWidgets = getTextWidgetsByParameters(parameters, "phone");
  for (var i in phoneWidgets){
    section.addWidget(phoneWidgets[i]);
  }
  
  var customFieldOptions = PipedriveAPILibrary.getPersonCustomFieldOptionsByName();
  
  var selectionInputs = {
    "type" : {
      "dic" : customFieldOptions["Type"],
      "selectionType" : CardService.SelectionInputType.DROPDOWN
     },
    "tag" : {
      "dic" : customFieldOptions["Tag"],
      "selectionType" : CardService.SelectionInputType.CHECK_BOX
     },
    "province" : {
      "dic" : customFieldOptions["Province"],
      "selectionType" : CardService.SelectionInputType.CHECK_BOX
     },
    "primaryBusiness" : {
      "dic" : customFieldOptions["Primary Business"],
      "selectionType" : CardService.SelectionInputType.CHECK_BOX
     }
  };
  
  for(var i in selectionInputs){
    var customFieldDic = selectionInputs[i]["dic"];
    var currentValue = (parameters[customFieldDic["key"]] || parameters[i]);
    var selectionWidget = getSelectionWidgetByParameters(currentValue, customFieldDic, selectionInputs[i]["selectionType"]);
    section.addWidget(selectionWidget);
  }
  
  section.addWidget(CardService.newTextInput()
    .setTitle("Years' of Experience")
    .setFieldName(customFieldOptions["Years' of Experience"]["key"])
    .setValue((parameters["yearsExperience"] || "")));
    
  var submitSection = CardService.newCardSection();
  var submitButton = CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
      .setFunctionName("addPipedriveContact")
      .setParameters(parameters));
  section.addWidget(submitButton);
  
  card.addSection(section);
  
  return (parameters.reload ? CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card.build())).build() : card.build()); 
}

/*
 * Update or add contact in pipedrive
 *
 * @param {Event Object} e
 * @return {Action Response}
 */
function addPipedriveContact(e){
  var eventData = parseEventObject(e);
  var parameters = eventData["parameters"];
  var formInput = eventData["formInputs"];

  var parsedFormInput = {
    "email" : [],
    "phone" : []
  };
  for(var i in formInput){
    var currentValue = formInput[i];
    parsedFormInput[i] = currentValue;
  }

  for(var i in parameters){
    var keyFullString = i;
    var keyWord = matchKeyWord(keyFullString);
    if(keyWord && parameters[keyFullString+"delete"] != "true"){
      parsedFormInput[keyWord].push({
        "value" : parameters[keyFullString].trim(), 
        "label" : (parameters[keyFullString+"label"] || ""), 
        "primary" : (parameters[keyFullString+"primary"] == "true" ? true : false)
      });
    }
  }
  
  var orgId = parsePipedriveIdFromSuggestion((formInput["org_id"] || parameters["org_id"]));
  
  // if the parsed string is not numeric, do not assign an organization
  if(orgId){
    parsedFormInput["org_id"] = orgId;
  }

  var message = "";
  var response = {"success": false};

  if(parameters.mergeWithId && parameters.deleteId){
    var mergeResponse = PipedriveAPILibrary.mergePersons(parameters.mergeWithId, parameters.deleteId);
    if(mergeResponse.success){
      message = "Merged and ";
      e.commonEventObject.parameters["pipedriveId"] = parameters.mergeWithId;
      e.commonEventObject.parameters["reload"] = "true";
    }
    else{
      message = "Merge Failed. ";
    }
  }
  
  // update
  if(parameters.pipedriveId){
    response = PipedriveAPILibrary.updatePersonFromData(parsedFormInput, parameters.pipedriveId);
    message = message+"Updated Contact!";
  }
  // create
  else {
    // if pipedrive user, then assign the contact to them
    var ownerId = getPipedriveUserId();
    if(ownerId){
      parsedFormInput["owner_id"] = ownerId;
    }
    response = PipedriveAPILibrary.createPersonFromData(parsedFormInput);
    e.commonEventObject.parameters = {};
    if(response && response.data && response.data.id){
      e.commonEventObject.parameters["pipedriveId"] = response.data.id.toString();
    }
    message = message+"Created Contact!";
  }  
  
  var actionResponse = CardService.newActionResponseBuilder();
  if(e.commonEventObject.parameters["pipedriveId"] && response.success){
    actionResponse.setNavigation(CardService.newNavigation()
      .updateCard(buildPipedrivePersonDetailsCard(e, message)))
      .setNotification(CardService.newNotification().setText(message));
  }
  else {
    actionResponse.setNavigation(CardService.newNavigation().popCard())
      .setNotification(CardService.newNotification().setText("Contact Creation Failed"));
  }
  return actionResponse.build();
}

/* 
 * Create a selection input widget with selected values if given in parameters
 *
 * @param {String} currentValue The current values selected
 * @param {{}} customFieldDic The custom field data from Pipedrive for that field
 * @param {String} selectionType Optional - The type of selection input, dropdown menu if not given
 * @return {Widget} A selection input widgets to display, with current values selected if provided
 */
function getSelectionWidgetByParameters(currentValue, customFieldDic, selectionType){
  var options = customFieldDic["options"];
  
  if(!selectionType){
    selectionType = CardService.SelectionInputType.DROPDOWN;
  }
  var widget = CardService.newSelectionInput()
    .setFieldName(customFieldDic["key"])
    .setTitle(customFieldDic["name"])
    .setType(selectionType);
  for(var i in options){
    widget.addItem(options[i]["label"], options[i]["id"].toString(), (currentValue ? (currentValue.indexOf(options[i]["label"]) >= 0 || currentValue.indexOf(options[i]["id"]) >= 0) : false));
  }
  return widget;
}

/* 
 * Create a selection input widget with selected values for pipedrive owners
 *
 * @param {String} currentUserId Optional - The current user id selected, otherwise the current user
 * @return {Widget} A selection input widgets to display
 */
function getOwnerIdDropdown(currentUserId){
  var userDic = PipedriveAPILibrary.USER_MAP_BY_NAME;
  if(!currentUserId){
    currentUserId = (userDic[getUserName()] || "");
  }
  var widget = CardService.newSelectionInput()
    .setFieldName("owner_id")
    .setTitle("Contact Owner")
    .setType(CardService.SelectionInputType.DROPDOWN);
  for(var user in userDic){
    widget.addItem(user, userDic[user], userDic[user] == currentUserId);
  }
  return widget;
}

function updatePrimary(parameters, formInput){
  var newPrimary = formInput["newPrimary"];
  if(newPrimary){
    var keyWord = matchKeyWord(newPrimary.replace("primary", ""));
    for(var i in parameters){
      if(i.indexOf(keyWord) >= 0 && i.indexOf("primary") >= 0){
        parameters[i] = "false";
      }
    }
    parameters[newPrimary] = "true";
  }
  return parameters;
}

/* 
 * Create phone / email selection input widgets
 *
 * @param {String} fieldName The name of the field (e.g. email0)
 * @param {String} title The title to display for the text input
 * @param {String} value The curent email/phone value
 * @param {String} label The current type (work, home, etc)
 * @param {String} primary Whether the current value is primary or not
 * @param {{}} parameters The parameters
 * @return {[Widget]} A text input and selection input widgets to display
 */
function getEditPhoneEmailInputWidgets(fieldName, title, value, label, primary, parameters){
  var widgets = [];

  var emailTextInput = CardService.newTextInput()
    .setFieldName(fieldName)
    .setValue(value)
    .setTitle(title);
    
  var primarySelection = CardService.newSelectionInput()
    .setFieldName("newPrimary")
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem("Set As Primary", fieldName+"primary", primary == "true");
  
  var labelOptions = (fieldName.indexOf("phone") >= 0 ? ["work", "home", "mobile", "other"] : ["work", "home", "other"]);
  
  var labelSelectionWidget = CardService.newSelectionInput()
    .setFieldName(fieldName+"label")
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setTitle("Type");
    
  for(var i in labelOptions){
    labelSelectionWidget.addItem(labelOptions[i], labelOptions[i], label == labelOptions[i]);
  }
  
  var editParameters = Object.assign({}, parameters);
  editParameters[fieldName+"edit"] = "false";
  var editButton = CardService.newTextButton()
    .setOnClickAction(CardService.newAction().setFunctionName("buildAddContactCard").setParameters(editParameters))
    .setText("Save");
    
  var deleteParameters = Object.assign({}, parameters);
  deleteParameters[fieldName+"delete"] = "true";  
  var deleteButton = CardService.newTextButton()
    .setOnClickAction(CardService.newAction().setFunctionName("buildAddContactCard").setParameters(deleteParameters))
    .setText("Delete");
    
  var buttonSet = CardService.newButtonSet().addButton(editButton).addButton(deleteButton);
  widgets.push(emailTextInput);
  widgets.push(labelSelectionWidget);
  widgets.push(primarySelection);
  widgets.push(buttonSet);
  
  return widgets;
}

/* 
 * Create phone / email selection input widgets
 *
 * @param {String} fieldName The name of the field (e.g. email0)
 * @param {String} title The title to display for the text input
 * @param {String} value The curent email/phone value
 * @param {String} type The type (phone or email)
 * @param {{}} parameters The parameters
 * @return {Widget} A key value widget to display
 */
function getEditPhoneEmailDisplayWidget(fieldName, title, value, type, parameters){
  var editParameters = Object.assign({}, parameters);
  editParameters[fieldName+"edit"] = "true";
  var editAction = CardService.newAction().setFunctionName("buildAddContactCard").setParameters(editParameters);
  
  var widget = CardService.newKeyValue()
    .setButton(CardService.newTextButton()
      .setText("Edit")
      .setOnClickAction(editAction))
    .setIcon((type == "email" ? CardService.Icon.EMAIL : CardService.Icon.PHONE))
    .setTopLabel(title)
    .setContent(value);
    
  return widget;
}

/* 
 * Populate a list of widgets for phone or email address text inputs with values if given in parameters
 *
 * @param {{}} parameters The parameters with current values, {} if none
 * @param {String} keyWord The keyword to match in parameters to include as current values
 * @return {[Widget]} A list of widgets to display, with current values and one spot for new entries
 */
function getTextWidgetsByParameters(parameters, keyWord){
  // create copy so it doesn't effect other input
  var updatedParameters = Object.assign({}, parameters);
  updatedParameters.reload = "true";
  
  var keys = Object.keys(parameters);
  var widgetDic = {};
  var widgets = [];
  var count = 0;
  var displayList = [];
  
  // get widgets with current values
  for(var i in keys){
    if(matchKeyWord(keys[i]) == keyWord){
      var label = (parameters[keys[i]+"label"] || "");
      var primary = (parameters[keys[i]+"primary"] || "");
      
      var index = parseInt(keys[i].replace(keyWord, ""));
      var fieldName = keys[i];
      var title = firstLetterUppercase(keyWord)+" "+(label ? " ("+label+")" : "")+(primary == "true" ? " - PRIMARY" : "");
      var value = parameters[keys[i]];
      if(parameters[fieldName+"delete"] == "true"){
        // don't display
      }
      else if(parameters[fieldName+"edit"] == "true"){
        widgetDic[index] = getEditPhoneEmailInputWidgets(fieldName, title, value, label, primary, parameters);
      }
      else{
        widgetDic[index] = [getEditPhoneEmailDisplayWidget(fieldName, title, value, keyWord, updatedParameters)];
      }
      count ++;
    }
  }
  for (var i = 0; i < count; i++){
    for (var j in widgetDic[i]){
      widgets.push(widgetDic[i][j]);
    }
  }
  
  var addNewParameters = Object.assign({}, updatedParameters);
  addNewParameters[keyWord+count] = " ";
  addNewParameters[keyWord+count+"edit"] = "true";
  
  widgets.push(CardService.newTextButton()
    .setText("+ Add new "+keyWord)
    .setOnClickAction(CardService.newAction().setFunctionName("buildAddContactCard").setParameters(addNewParameters))
  );
  return widgets;
}

/*
 * Add a new note to a Pipedrive contact and view all old notes
 *
 * @param {EventObject} e
 * @returns {ActionResponse}
 */
function buildAddPipedriveNotesCard(e){
  var parameters = e.commonEventObject.parameters;
  var pipedriveId = parameters.pipedriveId;
  var title = (parameters.title || "Add Note");
  var subtitle = (parameters.subtitle || "");
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(title)
    .setSubtitle(subtitle)
    .setImageUrl(IMAGES.PIPEDRIVE));
  
  var userDetails = getUserDetails();
  var fontColour = userDetails.colour;
  
  var addNoteSection = CardService.newCardSection();
  
  addNoteSection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("ADD NEW NOTE")
    .setFieldName("note")
  );
  
  addNoteSection.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
    .setFunctionName("addPipedriveNote")
    .setParameters(parameters)));
  
  card.addSection(addNoteSection);
  
  var displayNoteSection = pipedriveNoteDisplaySection(pipedriveId);
  card.addSection(displayNoteSection);
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}

/*
 * Add a new activity to a Pipedrive and view all activities if on contact page
 *
 * @param {EventObject} e
 * @returns {ActionResponse}
 */
function buildAddPipedriveActivitiesCard(e){

  var parameters = e.commonEventObject.parameters;
  
  var pipedriveId = parameters.pipedriveId;
  var title = (parameters.title || "Add New Activity");
  var subtitle = (parameters.subtitle || "");
  var name = (parameters.name || "");
  var userName = (parameters.createdByName || "");
  var activityType = (parameters.activity_type || "task");
  var formattedActivityType = firstLetterUppercase(activityType);

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(title)
    .setSubtitle(subtitle)
    .setImageUrl(IMAGES.PIPEDRIVE));
  
  var userDetails = getUserDetails();
  var fontColour = userDetails.colour;
  
  var addActivitySection = CardService.newCardSection();
  //var formInputs = parseFormInputs(e);
  //addActivitySection.addWidget(getPersonSuggestionWidget((formInputs["person_id"] ? formInputs["person_id"] : pipedriveId+" - "+name), "buildAddPipedriveActivitiesCard", parameters));
  addActivitySection.addWidget(CardService.newKeyValue()
    .setTopLabel(firstLetterUppercase(activityType)+" Linked To")
    .setContent(name)
    .setIcon(ACTIVITY_ICON_MAP[activityType])
    .setButton(CardService.newTextButton().setText("Change").setDisabled(true).setOpenLink(CardService.newOpenLink().setUrl("google.ca")))
  );
  
  addActivitySection.addWidget(CardService.newTextInput()
    .setTitle("Subject")
    .setFieldName("subject")
    .setValue(formattedActivityType+" with "+name)
  );
     
  addActivitySection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("Note")
    .setFieldName("note")
  );
  
  addActivitySection.addWidget(CardService.newDateTimePicker()
    .setTitle("Due Date")
    .setFieldName("start_date")
    .setValueInMsSinceEpoch((new Date()).getTime())
  );
  
  var durationSelection = CardService.newSelectionInput()
    .setTitle("Duration (HH:MM)")
    .setFieldName("duration")
    .setType(CardService.SelectionInputType.DROPDOWN);
  
  var durationIncrement = 5;
  var maxDuration = 4*60;

  for(var i = 1; i <= maxDuration/durationIncrement; i++){
    var durationItem = formatTime(i*durationIncrement/60);
    durationSelection.addItem(durationItem, durationItem, (i == 3));
  }
  addActivitySection.addWidget(durationSelection);

  var assigneeSelection = CardService.newSelectionInput()
    .setTitle("Assignee")
    .setFieldName("assignee")
    .setType(CardService.SelectionInputType.DROPDOWN);
  
  var users = PipedriveAPILibrary.USER_MAP_BY_NAME;
  for(var i in users){
    assigneeSelection.addItem(i, i, (i == userName ? true : false));
  }
  addActivitySection.addWidget(assigneeSelection);
  
  
  addActivitySection.addWidget(CardService.newSelectionInput()
    .setFieldName("complete")
    .setType(CardService.SelectionInputType.CHECK_BOX).addItem("Mark as done", 1, true)
  );
    
  addActivitySection.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
    .setFunctionName("addPipedriveActivity")
    .setParameters(parameters)));
 
  card.addSection(addActivitySection);
  
  var displayActivitySection = pipedriveActivityDisplaySection(pipedriveId);
  card.addSection(displayActivitySection);
  
  /*
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    */
  return (parameters.reload ? CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card.build())).build() : card.build()); 
}

/*
 * Display a card to confirm merge details
 *
 * @param {Event Object} e
 * @return {Card}
 */
function mergePersonsCard(e){
  var parameters = e.commonEventObject.parameters;

  e.commonEventObject.parameters = getCombinedContacts(parameters);
  
  return buildAddContactCard(e);
}

/*
 * Create a new deal based on form input
 *
 * @param {Event Object} e
 * @return {ActionResponse} Pop to last card and display message
 */
function createNewPipedriveDeal(e){
  var eventData = parseEventObject(e);
  var parameters = eventData["parameters"];
  var formInputs = eventData["formInputs"];
  
  var data = {};
  for(var i in formInputs){
    var value = formInputs[i];
    var ltvFieldName = PipedriveAPILibrary.DEAL_FIELDS["ltv"];
    if(i == ltvFieldName || i == "value"){
      value = parseFloat(value.match(/(\d|\.+)/g).join(""));
      
      if(i == ltvFieldName && value > 1){
        value = value/100;
      }
    }
    data[i] = value;
  }
  var personId = parsePipedriveIdFromSuggestion(parameters["person_id"]);
  if(personId){
    // if the parsed string is not all numbers, do not assign a person
    data["person_id"] = personId;
  }
  
  var ownerId = getPipedriveUserId();
  if(ownerId){
    data["user_id"] = ownerId;
  }
  var response = PipedriveAPILibrary.createDealFromData(data);
  
  var message = (response.success ? "Deal Recorded! - " : "Deal Record Failed  - ")+(data["title"] || "");
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .setNotification(CardService.newNotification().setText(message))
    .build();
}
