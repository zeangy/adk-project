function pipedriveActivityButtonSet(pipedriveId, createdById){
  var parameters = {
    "pipedriveId" : pipedriveId,
    "createdById" : createdById
  };
  
  var activityTypes = {
    "call" : CardService.Icon.PHONE,
    "meeting" : CardService.Icon.EVENT_PERFORMER,
    "task" : CardService.Icon.CLOCK,
    "deadline" : CardService.Icon.INVITE,
    "email" : CardService.Icon.EMAIL,
    "lunch" : CardService.Icon.RESTAURANT_ICON
  };
  
  var buttonSet = CardService.newButtonSet();
  for(var i in activityTypes){
    parameters["activity_type"] = i;
    var button = CardService.newImageButton()
      .setIcon(activityTypes[i])
      .setAltText(i)
      .setOnClickAction(CardService.newAction()
        .setFunctionName("addPipedriveActivity")
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
  var title = e.commonEventObject.parameters.title;
  var subtitle = e.commonEventObject.parameters.subtitle;
  
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
  
  var pipedriveId = (e.commonEventObject.parameters.pipedriveId || null);
  var title = (e.commonEventObject.parameters.title || "Add New Activity");
  var subtitle = (e.commonEventObject.parameters.subtitle || "");
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(title)
    .setSubtitle(subtitle)
    .setImageUrl(IMAGES.PIPEDRIVE));
  
  var userDetails = LENDESK_USERS[getUserName()];
  var fontColour = userDetails.colour;
  
  var addActivitySection = CardService.newCardSection();
  
  var buttonSet = pipedriveActivityButtonSet(pipedriveId, userDetails.id);
  addActivitySection.addWidget(buttonSet);
    
  addActivitySection.addWidget(CardService.newTextInput()
    .setTitle("Subject")
    .setFieldName("subject")
    .setValue("Call with "+title)
  );
  
  addActivitySection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("Note")
    .setFieldName("note")
  );
  
  addActivitySection.addWidget(CardService.newDateTimePicker()
    .setTitle("Start Time")
    .setFieldName("start_date")
  );
  addActivitySection.addWidget(CardService.newDateTimePicker()
    .setTitle("End Time")
    .setFieldName("end_date")
  );
  
  addActivitySection.addWidget(CardService.newKeyValue()
    .setTopLabel("Linked To")
    .setContent(title).setButton(CardService.newTextButton().setText("Change").setOpenLink(CardService.newOpenLink().setUrl("google.ca")))
  );
  
  /*
  var durationSelection = CardService.newSelectionInput()
    .setTitle("Duration")
    .setFieldName("duration")
    .setType(CardService.SelectionInputType.DROPDOWN);
  
  var durationIncrement = 15;
  var maxDuration = 8*60;
  
  function formatTime(time){
    var formattedTime = "";
    try{
      var hours = Math.trunc(time);
      var minutes = time - hours;
      minutes = minutes * 60;
      formattedTime = hours+":"+(minutes == 0 ? "00" : minutes);
    }
    catch(e){
    }
    return formattedTime;
  }
  durationSelection.addItem("", 0, true);
  for(var i = 1; i <= maxDuration/durationIncrement; i++){
    durationSelection.addItem(formatTime(i*durationIncrement/60), i*durationIncrement, false);
  }
  addActivitySection.addWidget(durationSelection);
  */
  
  var assigneeSelection = CardService.newSelectionInput()
    .setTitle("Assignee")
    .setFieldName("assignee")
    .setType(CardService.SelectionInputType.DROPDOWN);
  
  var users = PipedriveAPILibrary.USER_MAP_BY_NAME;
  for(var i in users){
    assigneeSelection.addItem(i, users[i], (i == userDetails.name ? true : false));
  }
  addActivitySection.addWidget(assigneeSelection);
  
  //addActivitySection.addWidget(CardService.newSelectionInput().setType(CardService.SelectionInputType.CHECK_BOX).setFieldName("complete").addItem("Mark as done", 1, true));

  addActivitySection.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
    .setFunctionName("addPipedriveActivity")
    .setParameters({})));
 
  card.addSection(addActivitySection);
  
  var displayActivitySection = pipedriveActivityDisplaySection(pipedriveId, [], 50);
  card.addSection(displayActivitySection);
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}