function myFunction() {
  var emailAddress=" angelo@neighbourhoodholdings.com";
  var currentSubject="test";
  var message= "Hope you have received this one from the connect email id";
  var options={
    
    from:"connect@neighbourhoodholdings.com",
    body: "body",
    cc: "angelo@neighbourhoodholdings.com",
    bcc: "alexandra@neighbourhoodholdings.com"
  };
  GmailApp.sendEmail(emailAddress, currentSubject, message,options);
};
