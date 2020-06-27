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
  var currentUserTeam = userDetails.team;
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
  
  var displayNoteSection = CardService.newCardSection();
  
  var noteWidgetList = getNoteWidgets(pipedriveId);
  var numNotes = 0;
  for(var i in noteWidgetList){
    displayNoteSection.addWidget(noteWidgetList[i]);
    numNotes ++;
  }
  displayNoteSection.setHeader("Notes ("+numNotes+")");
  if(numNotes < 1){
    displayNoteSection.addWidget(CardService.newKeyValue().setContent("<i>No notes found</i>"));
  }
  card.addSection(displayNoteSection);
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}