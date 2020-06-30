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
  var parameters = e.commonEventObject.parameters;
  var formInputs = e.commonEventObject.formInputs;
  var message = "Created Activity!";
  
  if(formInputs){
    var activityType = parameters.activity_type;
    var linkToId = parameters.pipedriveId;
    var date = null;
    var time = null;
    var duration = null;
    var startDateObj = (formInputs.start_date ? formInputs.start_date.dateTimeInput : null);
    if(startDateObj){
      var startDate = new Date(parseInt(startDateObj.msSinceEpoch));
      if(startDateObj.hasDate){
        date = Utilities.formatDate(msSinceEpochToDate(startDateObj.msSinceEpoch), "UTC", "YYYY-MM-dd");
      }
      if(startDateObj.hasTime){
        time = Utilities.formatDate(startDate, "UTC", "hh:mm");
      }
      var endDateObj = (formInputs.end_date ? formInputs.end_date.dateTimeInput : null);
      if(endDateObj){
        var endDate = new Date(parseInt(endDateObj.msSinceEpoch));
        if(endDateObj.hasDate){
          var newEndDate = endDate;
        }
        else if(endDateObj.hasTime){
          var newEndDate = new Date(startDate);
          newEndDate.setHours(endDate.getHours());
          newEndDate.setMinutes(endDate.getMinutes());
        }
        var difference = newEndDate.getTime() - startDate.getTime();
        var hours = parseInt(Math.abs(difference) / (1000 * 60 * 60) );
        var minutes = parseInt(Math.abs(difference) / (1000 * 60) % 60);
        duration = hours+":"+minutes;
      }
    }
    
    var note = (formInputs.note ? formInputs.note.stringInputs.value : "").toString();
    var subject = (formInputs.subject ? formInputs.subject.stringInputs.value : "").toString();
    var createdById = (formInputs.assignee ? formInputs.assignee.stringInputs.value : null);
    var markDone = (formInputs.complete ? true : false);
    PipedriveAPILibrary.addActivity(activityType, subject, note, date, time, duration, createdById, markDone, linkToId, "persons");
  }
  else{
    message = "Error: Activity not created";
  }
  
  return buildPipedrivePersonDetailsCard(e, message, false);
  
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
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}