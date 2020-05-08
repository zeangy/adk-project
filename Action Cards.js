/*
 * Update commitment expiry and return to application card
 *
 * @param {EventObject} e
 * @returns {Card}
 */
function submitCommitmentUpdate(e){
  var parameters = e.commonEventObject.parameters;
  var formInputs = e.commonEventObject.formInputs;
  var loanId = parameters.loanId;
  var message = "";
  
  try{
    var expiryDate = msSinceEpochToDate(formInputs.dateUpdate.dateInput.msSinceEpoch);
    LendeskAPILibrary.updateCommitmentExpiry(loanId, expiryDate);
  }
  catch(e){
    message = "Error: Expiry not updated";
  }
  
  return buildApplicationDetailsCard(e, message, false); 
}
/*
 * Update funding date and interest adjustment date and return to application card
 * If no funding date is given, update funding date to ASAP
 *
 * @param {EventObject} e
 * @returns {Card}
 */
function submitFundingUpdate(e){
  var parameters = e.commonEventObject.parameters;
  var formInputs = e.commonEventObject.formInputs;
  var loanId = parameters.loanId;
  var fundingDate = null;
  
  try{
    fundingDate = msSinceEpochToDate(formInputs.dateUpdate.dateInput.msSinceEpoch); 
  }
  catch(e){
  }
  
  LendeskAPILibrary.updateFundingDateDetails(loanId, fundingDate);
  
  return buildApplicationDetailsCard(e, "", false); 
}

/*
 * Card for updating date for an application
 *
 * @param {EventObject} e
 * @returns {ActionResponse}
 */
function buildUpdateDateCard(e){
  var parameters = e.commonEventObject.parameters;
  var currentDate = parameters.currentDate;
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(parameters.title));
 
  var section = CardService.newCardSection();
  
  var datePicker = CardService.newDatePicker()
    .setTitle(parameters.datePickerTitle)
    .setFieldName("dateUpdate");
    
  if(currentDate){
    datePicker.setValueInMsSinceEpoch(new Date(currentDate).getTime());
  }
  
  var saveButton = CardService.newTextButton()
    .setText("Save Changes")
    .setOnClickAction(CardService.newAction()
      .setFunctionName(parameters.submitFunctionName).setParameters(e.commonEventObject.parameters));
      
  section.addWidget(datePicker);
  section.addWidget(saveButton);
      
  card.addSection(section);

  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}

function buildTagsCard(e){
  var args = e.parameters;
  var currentTags = args.tags.split(", ");
  Logger.log(currentTags);
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("Tags"));
  
  var section = CardService.newCardSection();
  
  var checkboxes = CardService.newSelectionInput()
     .setType(CardService.SelectionInputType.CHECK_BOX)
     .setTitle("Tags")
     .setFieldName("tags_field");
  
  var tagOptions = {
    "arrears" : "Existing mortgage is currently in arrears",
    "rush" : "Rush in submission or closing date < 1 week from submission date",
    "foreign buyer" : "Borrower is not living in Canada",
    "non-resident" : "Borrower is not a Canadian citizen or permanent resident",
    "poor marketability" : "The subject property is not marketable",
    "private payout" : "Mortgage funds are being used to pay out a private lender",
    "poa" : "Borrower is using a power of attorney", 
    "rent-to-own" : "Purchase is a rent to own",
    "private sale" : "Purchase is a private sale",
    "title transfer" : "Transaction is a title transfer",
    "foreclosure" : "Previous foreclosure",
    "bankruptcy" : "Previous bankruptcy or consumer proposal",
    "business development" : "Exception granted for business development purposes", 
    "exception:rate" : "Exception to rate",
    "exception:ltv" : "Exception for loan-to-value",
    "exception:location" : "Exception for location"
  };
  
  for(var i in tagOptions){
    checkboxes.addItem(tagOptions[i], i, (currentTags.indexOf(i) >= 0));
  }
  
  section.addWidget(checkboxes);
  card.addSection(section);
  
  var actionResponse = CardService.newActionResponseBuilder()
  .setNavigation(CardService.newNavigation()
     .pushCard(card.build()))
  .build();
    
  return actionResponse;
}

/*
 * Update appraised value, appraisal date, legal address
 *
 */
function buildUpdatePropertyCard(e){

  var args = e.parameters;
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(args["collateralDescription"]));
 
  var propertySection = CardService.newCardSection();
  
  propertySection.addWidget(CardService.newTextInput()
    .setFieldName("appraisalValue")
    .setTitle("Appraisal Value")
    .setValue((args["appraisalValue"] ? args["appraisalValue"] : "")));     
  
  var datePicker = CardService.newDatePicker()
    .setTitle("Appraisal Date")
    .setFieldName("appraisalDate")
    .setValueInMsSinceEpoch(args["appraisalDate"]);
    
  propertySection.addWidget(datePicker);
  
  propertySection.addWidget(CardService.newTextInput()
        .setFieldName("legalAddress")
        .setTitle("Legal Address")
        .setValue((args["legalAddress"] || ""))); // fix issue as of Jan 31 2020
  
  propertySection.addWidget(CardService.newTextButton()
    .setText("Save Changes")
    .setOnClickAction(CardService.newAction()
      .setFunctionName("submitPropertyUpdate")
      .setParameters(args)));

  card.addSection(propertySection);

  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
    
}
/*
 * Update loan amount, interest rate, lender fee
 *
 */
function buildUpdateLoanCard(e){
  var applicationId = e.parameters.applicationId;
  var response = LendeskAPILibrary.getApplication(applicationId);
  var loan = response.loans[0];
  //Logger.log(loan.liability.securities);
  //Logger.log(loan.collateral);
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(applicationId));
  
  var loanSection = CardService.newCardSection().setHeader("Loan Details");
  
  var amount = loan.liability.credit_limit;
  var interestRate = loan.liability.initial_interest_rate;
  var lenderFee = "0";
  var fees = response.loans[0].fees;
  for (var i in fees){
    if (fees[i].name == "Lender Fee"){
      lenderFee = fees[i].funds_required/amount;
    }
  }
  
  var parameters = {
    'applicationId':applicationId,
    'loanId':loan.id,
    'loanAmount':formatCurrency(amount), 
    'interestRate':formatPercent(interestRate),
    'lenderFee':formatPercent(lenderFee),
    'ltv': formatPercent(loan.cltv)
  };
  
  loanSection.addWidget(CardService.newKeyValue()
    .setTopLabel("LTV")
    .setContent(parameters.ltv)); 
  
  loanSection.addWidget(CardService.newTextInput()
    .setFieldName("loanAmount")
    .setTitle("Loan Amount")
    .setValue(parameters.loanAmount));
  
  loanSection.addWidget(CardService.newTextInput()
    .setFieldName("interestRate")
    .setTitle("Interest Rate")
    .setValue(parameters.interestRate));  
  
  loanSection.addWidget(CardService.newTextInput()
    .setFieldName("lenderFee")
    .setTitle("Lender Fee")
    .setValue(parameters.lenderFee)); 
    
  card.addSection(loanSection);   
 
  for(var i in loan.collateral){
    var collateral = loan.collateral[i];
    //parameters["collateral"][i]["id"] = collateral.id;

    var collateralValues = collateral.property_detail.values;
    var appraisedValue = "";
    var appraisedDate = "";
    
    for(var j in collateralValues){
      if(collateralValues[j].value_type == "appraised_value"){
        appraisedValue = collateralValues[j].value;
        appraisedDate = collateralValues[j].year+"/"+collateralValues[j].month+"/"+collateralValues[j].day;
      }
    }
    
    parameters["collateralId_"+i] = collateral.id;
    parameters["appraisedValue_"+i] = (appraisedValue != "" ? formatCurrency(appraisedValue) : "");
    parameters["appraisedDate_"+i] = appraisedDate;
    parameters["legal_"+i] = ( collateral.property_detail.legal_address ? collateral.property_detail.legal_address : "" );

    var propertySection = CardService.newCardSection().setHeader(collateral.description);
    propertySection.addWidget(CardService.newTextInput()
      .setFieldName("appraisedValue_"+i)
      .setTitle("Appraisal Value")
      .setValue(parameters["appraisedValue_"+i]));     
    
    propertySection.addWidget(CardService.newTextInput()
      .setFieldName("appraisedDate_"+i)
      .setTitle("Appraisal Date")
      .setHint("YYYY/MM/DD")
      .setValue(parameters["appraisedDate_"+i]));     
   
    propertySection.addWidget(CardService.newTextInput()
      .setFieldName("legal_"+i)
      .setTitle("Legal Address")
      .setValue(parameters["legal_"+i])); 
      
    card.addSection(propertySection);
  }
  
  Logger.log(parameters);
  
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText("Save Changes")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("updateLendeskLoan")
        .setParameters(parameters))));

  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
       .setNotification(CardService.newNotification()
         .setType(CardService.NotificationType.WARNING)
         .setText("WARNING: not connected yet"))
    .build();
    
  return actionResponse;
}

function buildUpdateLendeskCard(e){

}
/*
 * Add a new underwriting or BDM note and view all old notes
 *
 * @param {EventObject} e
 * @returns {ActionResponse}
 */
function buildAddNotesCard(e){
  
  var applicationId = e.commonEventObject.parameters.applicationId;
  var title = e.commonEventObject.parameters.name;
  
  var notes = LendeskAPILibrary.getLendeskNotes(applicationId);
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(title));
  
  var userDetails = LENDESK_USERS[getUserName()];
  var currentUserTeam = userDetails.team;
  var fontColour = userDetails.colour;
  
  var noteTypes = {
    "underwriting" : "UNDERWRITING NOTES",
    "sales" : "BDM NOTES"
  };
  
  var keyWord = ( noteTypes[currentUserTeam] || noteTypes["underwriting"]); // default to underwriting
  
  var addNoteSection = CardService.newCardSection();
  
  addNoteSection.addWidget(CardService.newTextInput()
    .setMultiline(true)
    .setTitle("ADD NEW "+keyWord)
    .setFieldName("note")
  );
    
  var parameters = {
    "applicationId" : applicationId,
    "keyWord" : keyWord, 
    "createdById" : userDetails.id
  };
  
  addNoteSection.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
    .setFunctionName("addLendeskNote")
    .setParameters(parameters)));
  
  card.addSection(addNoteSection);
  
  var displayNoteSection = CardService.newCardSection().setCollapsible(true).setNumUncollapsibleWidgets(5);
  var notesAdded = 0;
  for(var i in notes){
    for(var j in noteTypes){
        var currentNote = notes[i];
        var currentNoteType = noteTypes[j];
        if(currentNote.comment.indexOf(currentNoteType) >= 0){
          var content = currentNote.comment.replace(currentNoteType+"<br>", "");
          if(currentNoteType == keyWord){
            content = "<b><font color=\""+fontColour+"\"> "+content+"</font></b>";
          }

          var createdById = currentNote.created_by_id;
          var author = Object.keys(LENDESK_USERS).filter(function(key){ return LENDESK_USERS[key].id == createdById; });
          author = (author.length > 0 ? LENDESK_USERS[author[0]].name : "Portal") ;
          
          var noteWidget = CardService.newKeyValue()
            .setMultiline(true)
            .setTopLabel(j.toUpperCase()+" - "+author)
            .setContent(content)
            .setBottomLabel("Created At: "+Utilities.formatDate(new Date(currentNote.created_at), "PST", "yyyy-MM-dd h:mm a"));
          displayNoteSection.addWidget(noteWidget);
          notesAdded ++;
        }
     }
  }
  
  displayNoteSection.setHeader("BDM and Underwriting Notes ("+notesAdded+")");
  
  if(notesAdded < 1){
    displayNoteSection.addWidget(CardService.newKeyValue().setContent("<i>No BDM or Underwriting notes found</i>"));
  }
  card.addSection(displayNoteSection);
  
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}

/*
 * Add a new note to Lendesk if the note is not blank
 *
 * @param {EventObject} e
 * @returns {Card}
 */
function addLendeskNote(e){
  var applicationId = e.commonEventObject.parameters.applicationId;
  var keyWord = e.commonEventObject.parameters.keyWord;
  var createdById = e.commonEventObject.parameters.createdById;
  var formInputs = e.commonEventObject.formInputs;
  var note = (formInputs  ? formInputs.note.stringInputs.value : "");
  var message = "Created Note!";
  
  if(note){
    LendeskAPILibrary.createLendeskNote(applicationId, keyWord+"<br>"+note.toString().replace(/\n/g, "<br>"), createdById);
  }
  else{
    message = "Error: Note not created";
  }
  
  return buildApplicationDetailsCard(e, message, false);
  
}

function buildUpdateNotesCard(e){
  var applicationId = e.parameters.applicationId;
  var notes = LendeskAPILibrary.getLendeskNotes(applicationId);
  
  var brokerNotes = [];
  var underwritingNotes = [];
  var bdmNotes = [];
  var borrowerSolicitor = [];
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(e.parameters.name));

  var section = CardService.newCardSection().setHeader("Notes");

  var formattedNotes = notes.map(function(x){
    return (x.comment ? x.comment.replace("<br>","").replace(/<br>/g,"\n").replace(/<[^>]+>/g, "").replace(/\&nbsp/g, " ") : "");
  });
  
  var displayNotes = {
    "broker" : {
      "keyWord" : "BROKER NOTES",
      "title" : "BROKER NOTES",
      "fieldName" : "broker_notes_field", 
      "noteList" : brokerNotes,
      "currentNote" : ""
    },

    "borrower" : {
      "keyWord" : "BORROWER SOLICITOR CONTACT INFORMATION",
      "title" : "BORROWER SOLICITOR",
      "fieldName" : "borrower_solicitor_contact_field", 
      "noteList" : borrowerSolicitor,
      "currentNote" : ""
    }
  };
  
  for(var i in formattedNotes){
    for(var j in displayNotes){
      if(formattedNotes[i].indexOf(displayNotes[j].keyWord) >= 0){
        displayNotes[j].noteList.push(formattedNotes[i].replace(displayNotes[j].keyWord,""));
      }
    }
  }

  for(var i in displayNotes){
    if(displayNotes[i].noteList.length > 0){
      displayNotes[i].currentNote = displayNotes[i].noteList[0];
    }
    
    section.addWidget(CardService.newTextInput()
      .setMultiline(true)
      .setTitle(displayNotes[i].title)
      .setFieldName(displayNotes[i].fieldName)
      .setValue(displayNotes[i].currentNote)
    );  
  }
  
  var parameters = {
    "applicationId" : applicationId,
    "brokerNote" : displayNotes["broker"].currentNote,
    "brokerNoteKey" :  displayNotes["broker"].keyWord,
    "borrowerSolicitor" : displayNotes["borrower"].currentNote,
    "borrowerSolicitorNoteKey" :  displayNotes["borrower"].keyWord
  }; 
  
  section.addWidget(CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
    .setFunctionName("updateLendeskNotes")
    .setParameters(parameters)));
  
  card.addSection(section);
  
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
    .build();
    
  return actionResponse;
}
