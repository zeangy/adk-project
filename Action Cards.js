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


function buildAddNotesCard(e){
  var applicationId = e.parameters.applicationId;
  var notes = LendeskAPILibrary.getLendeskNotes(applicationId);
  
  var brokerNotes = [];
  var underwritingNotes = [];
  var borrowerSolicitor = [];
  
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(e.parameters.name));

  var section = CardService.newCardSection().setHeader("Notes");

  var formattedNotes = notes.map(function(x){
    return (x.comment ? x.comment.replace("<br>","").replace(/<br>/g,"\n").replace(/<[^>]+>/g, "").replace(/\&nbsp/g, " ") : "");
  });
  
  var displayNotes = {
    "underwriting" : {
      "keyWord" : "UNDERWRITING NOTES",
      "title" : "UNDERWRITING NOTES",
      "fieldName" : "underwriting_notes_field", 
      "noteList" : underwritingNotes,
      "currentNote" : ""
    },
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
    "underwritingNote" : displayNotes["underwriting"].currentNote,
    "underwritingNoteKey" :  displayNotes["underwriting"].keyWord,
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
