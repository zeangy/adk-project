// RATE CALCULATOR
function getRateCalculatorLink(applicationId){
  var url = "https://script.google.com/a/macros/altmortgages.ca/s/AKfycbz-4g3tn2CA9U_E3S484ifOYtLIJ2Q_BfPqymtaCPUxVZIfzoc/exec?ID="+applicationId+"&User="+getUserName();
  return CardService.newOpenLink().setUrl(url);
}

function calculateApplicationRate(applicationId){
  //applicationId = "7826b67a-c4f8-425b-a86b-311585004bab";
  var response = LendeskAPILibrary.getApplication(applicationId);
  
  var values = {};
  values["LTV"] = response.loans[0].cltv;
  values["Credit"] = (response.clients[0].credit_reports[0] && response.clients[0].credit_reports[0].scores.equifax_beacon_score ? response.clients[0].credit_reports[0].scores.equifax_beacon_score : "550");

  values["ClosedPeriod"]  = ( response.loans[0].prepayment_detail.initial_status_duration ? response.loans[0].prepayment_detail.initial_status_duration : "" );
  var tags = response.tags;
  values["Tags"] = (response.loans[0].liability.rate_type == "fixed" ? "Fixed Rate" : "");
  values["Tags"] += (response.loans[0].collateral[0].position > 1 ? "2nd Mortgage" : "");
  values["Tags"] += (tags.indexOf("non-resident") < 0 ? "" : "Non-Resident");
  values["Tags"] += (tags.indexOf("private payout") < 0 ? "" : "Private Payout");
  values["Tags"] += (tags.indexOf("arrears") < 0 ? "" : "Arrears");
  // Ineligible Location
  // Preferred Partner
  values["Broker"] = (response.referral_source ? response.referral_source.subtitle : "");
  values["Brokerage"] = (response.referral_source ? response.referral_source.name : "");
  
  values["Amount"]  = response.loans[0].liability.credit_limit;
  values["Province"]  = response.loans[0].collateral[0].property_detail.units[0].province;
  values["Postal Code"] = response.loans[0].collateral[0].property_detail.units[0].postal_code;
  
  Logger.log(values);
  return calculateRate(values);
}

function calculateRate(values){
  var spreadsheet = SpreadsheetApp.openById("1ILCe127pi1MQYXUH74kf6dNP1SQLcDnosIvNh2kg-P8");
  var sheet = spreadsheet.getSheetByName("ReferenceTable");
  var tableValues = sheet.getRange("I:O").getValues();

  var postalCode = values["Postal Code"].substring(0,3);
  
  var credit = values["Credit"];
  var ltv = values["LTV"];
  var tags = values["Tags"];
  var closedPeriod = values["ClosedPeriod"];
  var loanAmount = values["Amount"];
  var province = values["Province"];
  
  var totalAdjustmentList = {};
  var noteList = {};
  
  var postalCodeTable = spreadsheet.getSheetByName("Population").getRange("Y:AB");
  var location = postalCodeTable.getValues().filter(function(x){return x[1] == postalCode;}).map(function(x){return x[0];});
  
  if(location.length > 0){
    location = location[0];
  }
  else {
    location = "Other";
    tags += "Ineligible Location";
    noteList["Warning: Ineligible Location"] = "Location not on eligible list\n'Other' pricing grid used";
  }
  
  var locationTable = [];
 
  for(var i in tableValues){
    if(tableValues[i][0] == location){
      locationTable.push(tableValues[i]);
      locationTable.push(tableValues[+i+1]);
      locationTable.push(tableValues[+i+2]);
      locationTable.push(tableValues[+i+3]);
    }
  }
  
  var adjustmentValues = sheet.getRange("A:C").getValues();
  if(adjustmentValues.filter(function(x){return (x[2] == values["Broker"] || x[2] == values["Brokerage"]);}).length > 0 ){
    tags += "Preferred Partner";
  }
  
  var creditBuckets = adjustmentValues.filter(function (x){return x[0] == "Credit";});
  var ltvBuckets = adjustmentValues.filter(function (x){return x[0] == "LTV";});

  ltvBuckets = ltvBuckets.map(function(x){return x[2];});
  creditBuckets = creditBuckets.map(function(x){return x[2];});
  
  var row = 0;
  var col = 0;
  for(var i in ltvBuckets){
    if(ltv > ltvBuckets[i]){
      col = +i + 1;
    }
  }
  for(var i in creditBuckets){
    if(credit > creditBuckets[i]){
      row = +i + 1;
    }
  }

  var baseRate = locationTable[row][col];
  
  function premiumAdjust(total, x){
    var currAdjust = 0;
    if((x[1] == "Premium" && tags.indexOf(x[0]) >= 0) || (x[0] == "Closed Period (mos)" && x[1] == closedPeriod) || (x[0] == "2nd Mortgage" && x[1] == province && tags.indexOf("2nd Mortgage") >= 0)){
      currAdjust = x[2];
    }
    if(x[0] == "Mortgage Amount" && loanAmount > x[1]){
      currAdjust = (loanAmount-x[1])/loanAmount*x[2];
    }
    if(currAdjust != 0){
      totalAdjustmentList[x[0]] = currAdjust;
    }
    return total + currAdjust;
  }
  
  var adjustments = adjustmentValues.reduce(premiumAdjust, 0);

  var results = {
    'finalRate':baseRate + adjustments, 
    'referenceRate':(typeof baseRate == "string" ? "Invalid" : baseRate),
    'totalAdjustment': (typeof adjustments == "string" ? "Invalid" : adjustments),
    'adjustmentList':totalAdjustmentList,
    'noteList':noteList
  };
  
  return results;

}

function buildRateCalculatorCard(e){
  
  var applicationId = e.parameters.applicationId;
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle(e.parameters.name));
  
  var overviewSection = CardService.newCardSection().setHeader("Rate Overview");
  
  var currentRate = CardService.newKeyValue()
    .setTopLabel("Current Interest Rate")
    .setContent(e.parameters.rate);
    
  var currentFee = CardService.newKeyValue()
    .setTopLabel("Current Lender Fee")
    .setContent(e.parameters.fee); 
  
  var rateCalculatorResults = calculateApplicationRate(applicationId);
  Logger.log(rateCalculatorResults);
  var calculatedRate = CardService.newKeyValue()
    .setTopLabel("Calculated Rate")
    .setContent(formatPercent(rateCalculatorResults.finalRate)); 
    
  var linkButton = CardService.newTextButton()
    .setText("Open Rate Calculator")
    .setOpenLink(getRateCalculatorLink(applicationId));
    
  overviewSection.addWidget(linkButton);  
  
  overviewSection.addWidget(calculatedRate);
  
  overviewSection.addWidget(currentRate);
  overviewSection.addWidget(currentFee);

  
  var detailSection = CardService.newCardSection().setHeader("Adjustments Breakdown");
  
  detailSection.addWidget(CardService.newKeyValue()
    .setTopLabel("Reference Rate")
    .setContent(formatPercent(rateCalculatorResults.referenceRate)));
  
  for(var i in rateCalculatorResults.adjustmentList){
    detailSection.addWidget(CardService.newKeyValue()
      .setTopLabel(i)
      .setContent(formatPercent(rateCalculatorResults.adjustmentList[i])));
  }
  detailSection.addWidget(CardService.newKeyValue()
    .setTopLabel("Total Adjustments")
    .setContent(formatPercent(rateCalculatorResults.totalAdjustment)));
    
  for(var i in rateCalculatorResults.noteList){
    detailSection.addWidget(CardService.newKeyValue()
      .setTopLabel(i)
      .setContent(rateCalculatorResults.noteList[i]));
  }
  
  card.addSection(overviewSection);
  card.addSection(detailSection);
  
  var actionResponse = CardService.newActionResponseBuilder()
   .setNavigation(CardService.newNavigation()
       .pushCard(card.build()))
       .setNotification(CardService.newNotification()
         .setType(CardService.NotificationType.WARNING)
         .setText("WARNING: the Rate Calculator section cannot be relied on yet"))
    .build();
  return actionResponse;
}
