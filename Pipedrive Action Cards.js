
function pipedriveActionButtonSet(pipedriveId, title, subtitle){
  var parameters = {
    "pipedriveId" : pipedriveId,
    "createdById" : LENDESK_USERS[getUserName()]["id"], 
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
 * Upload note to Pipedrive contact
 *
 * @param {EventObject} e
 * @returns {Card} Contact card
 */
function addPipedriveNote(e){
  var pipedriveId = e.commonEventObject.parameters.pipedriveId;
  var createdById = e.commonEventObject.parameters.createdById;
  var formInputs = e.commonEventObject.formInputs;
  var note = (formInputs  ? formInputs.note.stringInputs.value : "");
  var parsedNote = note.toString().replace(/\n/g, "<br>");
  var message = "Created Note!";
  
  if(note){
    PipedriveAPILibrary.addNoteToPerson(pipedriveId, parsedNote, createdById);
  }
  else{
    message = "Error: Note not created";
  }
  
  return buildPipedrivePersonDetailsCard(e, message, false);
}

function addPipedriveActivity(e){
  
}

/*
 * Add a new note to a Pipedrive contact and view all old notes
 *
 * @param {EventObject} e
 * @returns {ActionResponse}
 */
function buildAddPipedriveNotesCard(e){
  
  var pipedriveId = e.commonEventObject.parameters.pipedriveId;
  var title = (e.commonEventObject.parameters.title || "Add Note");
  var subtitle = (e.commonEventObject.parameters.subtitle || "");
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(title)
    .setSubtitle(subtitle)
    .setImageUrl(IMAGES.PIPEDRIVE));
  
  var userDetails = LENDESK_USERS[getUserName()];
  var fontColour = userDetails.colour;
  
  var addNoteSection = CardService.newCardSection();
  
  addNoteSection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("ADD NEW NOTE")
    .setFieldName("note")
  );
    
  var parameters = {
    "pipedriveId" : pipedriveId,
    "createdById" : userDetails.id
  };
  
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
  var activityType = (parameters.activity_type || "task");
  var formattedActivityType = firstLetterUppercase(activityType);

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(title)
    .setSubtitle(subtitle)
    .setImageUrl(IMAGES.PIPEDRIVE));
  
  var userDetails = LENDESK_USERS[getUserName()];
  var fontColour = userDetails.colour;
  
  var addActivitySection = CardService.newCardSection();
  
  addActivitySection.addWidget(CardService.newKeyValue()
    .setTopLabel(firstLetterUppercase(activityType)+" Linked To")
    .setContent(name)
    .setIcon(ACTIVITY_ICON_MAP[activityType])
    .setButton(CardService.newTextButton().setText("Change").setOpenLink(CardService.newOpenLink().setUrl("google.ca")))
  );
  
  addActivitySection.addWidget(CardService.newTextInput()
    .setTitle("Subject")
    .setFieldName("subject")
    .setValue(formattedActivityType+" with "+name)
  );
   
  addActivitySection.addWidget(CardService.newDateTimePicker()
    .setTitle("Start Time")
    .setFieldName("start_date")
  );
  addActivitySection.addWidget(CardService.newDateTimePicker()
    .setTitle("End Time")
    .setFieldName("end_date")
  );
  
  addActivitySection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("Note")
    .setFieldName("note")
  );
  
  var assigneeSelection = CardService.newSelectionInput()
    .setTitle("Assignee")
    .setFieldName("assignee")
    .setType(CardService.SelectionInputType.DROPDOWN);
  
  var users = PipedriveAPILibrary.USER_MAP_BY_NAME;
  for(var i in users){
    assigneeSelection.addItem(i, users[i], (i == userDetails.name ? true : false));
  }
  addActivitySection.addWidget(assigneeSelection);
  
  addActivitySection.addWidget(CardService.newTextButton()
    .setText("Submit").setDisabled(true)
    .setOnClickAction(CardService.newAction()
    .setFunctionName("addPipedriveActivity")
    .setParameters(parameters)));
 
  card.addSection(addActivitySection);
  
  var displayActivitySection = pipedriveActivityDisplaySection(pipedriveId, [], 50);
  card.addSection(displayActivitySection);
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}