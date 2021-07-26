function sendCancelledEmail(){


  var token = {"Authorization" : "Bearer {{API_TOKEN}}}"};
  
  var appUrl = "https://api.lendesk.com/api/"; 
  var templateUrl = appUrl+"message_templates/206b8246-f0f2-4f17-af1a-ae9f0abeb006"
  var link="https://www.neighbourhoodholdings.com/neighbourhood-survey-lost-file/?SQF_ID="

  var todayDate = new Date();
  var fromDate=new Date();
  fromDate.setDate(todayDate.getDate()-2);
  var cancelledStatus="b4ef3df7-1e9b-4b2e-8c94-b14b3d79f03a"
  var offset = 0;
  var limit = 75;
  var searchPayload = {
    "query":"",
    "sort":null,
    "reverse":true,
    "limit":limit,
    "offset":offset,
    "states":[cancelledStatus],
    "updated_status_at":{start: fromDate.toISOString(), end: todayDate.toISOString()}
    }

  var searchOptions={
    "payload": JSON.stringify(searchPayload),
    "headers":token,
    "Accept": "application/json",
    "contentType" : "application/json", 
    "method" : "POST",
    "muteHttpExceptions" : true,
  }

  var subOptions={
    "headers":token,
    "Accept": "application/json",
    "contentType" : "application/json", 
    "method" : "GET",
    "muteHttpExceptions" : true,
  }
  var templateResponse=JSON.parse(UrlFetchApp.fetch(templateUrl,subOptions))
  var messageBody= templateResponse.response.body
  var messageId=templateResponse.response.id

  function sendMail(messageMail,messageBody){
    
    
    var subject="Help us improve: Share you Neighbourhood feedback"
    var options={from:" nh-labs@neighbourhoodholdings.com",
               //cc:"jared@neighbourhoodholdings.com",    
               //bcc:"taylor@neighbourhoodholdings.com", 
               name: "Neighbourhood Labs",    
                htmlBody: messageBody,
                
                }   
                 
    GmailApp.sendEmail(
    messageMail,                         
     subject,                              
    "options",options
  ); 
  }

  //Propcessing Util
  function processResponse(response){
      for(var i=0; i<response.response.length; i++) 
      {
        console.log(response.count);
        var subResponse=JSON.parse(UrlFetchApp.fetch(appUrl+"applications/"+response.response[i].id,subOptions))
        var agentId =subResponse.response.referral_source.referable_id
        Logger.log(agentId)
        var brokerId=subResponse.response.id
        //Logger.log(brokerId)
        var brokerFullname=subResponse.response.referral_source.subtitle
        var brokerName= brokerFullname.split(' ');
        var brokerName= brokerName[0];
        var subAgentId = UrlFetchApp.fetch(appUrl+"referral_sources/agents/" + agentId,subOptions)
        if (subAgentId.getResponseCode()===200){   
          var jsonResponse=JSON.parse(subAgentId.getContentText()) 
            console.log(jsonResponse.response.emails[0].address)
           
           var mail=jsonResponse.response.emails[0].address;
           var surveyLink=link + brokerId
          var message = messageBody.replace("{{broker.first}}",brokerName ).replace("{{url}}",surveyLink)
                      
            sendMail(mail, message);          
        }
      }
  }

  var response=JSON.parse(UrlFetchApp.fetch(appUrl+"applications/search",searchOptions))
  if (response.count > offset + limit){
    //Process first response
    processResponse(response);
    //Loop through other responses
    for(var z=(offset + limit);z<=response.count;z=z+limit){
      console.log(z);
      var offset=offset+limit;
      var morePayload = {
        "query":"",
        "sort":null,
        "reverse":true,
        "limit":limit,
        "offset":offset,
        "states":[cancelledStatus],
        "updated_status_at":{start: fromDate.toISOString(), end: todayDate.toISOString()}
        }
        var moreOptions={
          "payload": JSON.stringify(morePayload),
          "headers":token,
          "Accept": "application/json",
          "contentType" : "application/json", 
          "method" : "POST",
          "muteHttpExceptions" : true,
        }
      var moreResponse=JSON.parse(UrlFetchApp.fetch(appUrl+"applications/search",moreOptions))
      processResponse(moreResponse);
    }
  }
  else{
    processResponse(response);
  }

}
