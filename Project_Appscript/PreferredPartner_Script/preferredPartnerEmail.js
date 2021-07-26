function preferredPartnerEmail() {
  
var ss = SpreadsheetApp.getActiveSpreadsheet();

//Variables for sheets
var sheet1=ss.getSheetByName('June 2021'); 

//Variables for preferred message
var preferredSubject = "You've unlocked preferred partner status!"
var preferredhtmlOutput = HtmlService.createHtmlOutputFromFile('preferredMessage');
var preferredTemplate = preferredhtmlOutput.getContent()

//Variables for current message
var currentSubject = "Thank you for being a Preferred Partner!"
var currenthtmlOutput = HtmlService.createHtmlOutputFromFile('currentMessage');
var currentTemplate = currenthtmlOutput.getContent()

//Variables for unpreferred message
var unpreferredSubject = "How to unlock preferred partner status!"
var unpreferredthtmlOutput = HtmlService.createHtmlOutputFromFile('currentMessage');
var unpreferredTemplate = unpreferredthtmlOutput.getContent()

var maillist=sheet1.getLastRow();

for (var i = 46; i < maillist+1 ; i++ ) {    

  var emailAddress =sheet1.getRange(i,1).getValue();
  //Logger.log(emailAddress);
  //var name=sheet1.getRange(i,1).getValue();//test sheet
  var name=sheet1.getRange(i,2).getValue();
  var brokerName= name.split(' ');
  var brokerFirstname= brokerName[0];
  //Logger.log(brokerFirstname)
  var deals=sheet1.getRange(i,3).getValue();
  //Logger.log(deals)
  var closeRatio=sheet1.getRange(i,4).getValue()*100; 
  var closeRationpercentage = + closeRatio.toFixed(1);
  //Logger.log(closeRationpercentage)
  var status=sheet1.getRange(i,11).getValue();
//Logger.log(status); 
             
  if(status =="Unpreferred" && closeRatio >1 ){
      var unpreferredTemplate2=unpreferredTemplate.replace("{{first name}}",brokerFirstname).replace("{{deals.closed}}",deals).replace("{{closing ratio}}",closeRationpercentage);
    GmailApp.sendEmail(emailAddress, unpreferredSubject,unpreferredTemplate2, {htmlBody: unpreferredTemplate2,from:" connect@neighbourhoodholdings.com",name: "The    Neighbourhood Team",bcc:"thibaut.couture@neighbourhoodholdings.com "});
    //Logger.log(unpreferredTemplate);
    }
else if(status =="Current"){
   var currentTemplate2=currentTemplate.replace("{{first name}}",brokerFirstname).replace("{{deals.closed}}",deals).replace("{{closing ratio}}",closeRationpercentage);
    GmailApp.sendEmail(emailAddress, currentSubject, currentTemplate2,{htmlBody: currentTemplate2,from:" connect@neighbourhoodholdings.com",name: "The Neighbourhood Team",     bcc:"thibaut.couture@neighbourhoodholdings.com "});
    //Logger.log(message);
    }
else if (status =="Newly Eligible" ){
     var  preferredTemplate2=preferredTemplate.replace("{{first name}}",brokerFirstname).replace("{{deals.closed}}",deals).replace("{{closing ratio}}",closeRationpercentage); 
    GmailApp.sendEmail(emailAddress, preferredSubject,preferredTemplate2,{htmlBody: preferredTemplate2,from:" connect@neighbourhoodholdings.com",name: "The Neighbourhood Team",bcc:"thibaut.couture@neighbourhoodholdings.com "} );

   // Logger.log(preferredTemplate);
    }
else  
{ 
   Logger.log("No Email");
}
}
}