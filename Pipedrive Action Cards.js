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
  var currentUserTeam = userDetails.team;
  var fontColour = userDetails.colour;
  
  var addActivitySection = CardService.newCardSection();
  
  addActivitySection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("ADD NEW ACTIVITY")
    .setFieldName("activity")
  );
    
  var parameters = {
    "pipedriveId" : pipedriveId,
    "createdById" : userDetails.id
  };
  
  addActivitySection.addWidget(CardService.newTextButton()
    .setText("Submit")
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