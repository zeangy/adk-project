/**
  * FORMATTING FUNCTIONS
  */
  
/*
 * Format number as a dollar value with commas
 *
 * @param {Integer} amount The number to format
 * @returns {String} Formatted as $#,###,###.##
 */  
function formatCurrency(amount){
  if(amount >= 1000000){
    return Utilities.formatString("$%d,%03d,%02d%1.2f", amount/1000000, amount%1000000/1000, amount%1000/10, amount%10);
  }
  else{
    return Utilities.formatString("$%d,%02d%1.2f", amount/1000, amount%1000/10, amount%10);
  }
}

/*
 * Format number as percent with 2 decimal places
 *
 * @param {Integer} amount The number to format
 * @returns {String} Formatted as #.##%
 */
function formatPercent(amount){
  return Utilities.formatString("%.2f%", amount*100);
}

/* 
 * Adjust date to ignore timezone and hours
 * 
 * @param {Date} date The date to adjust
 * @return {Date} The date with no hours
 */
function standardizeDate(date){
  date.setTime( date.getTime() + date.getTimezoneOffset()*60*1000 );
  date.setHours(0,0,0,0);
  return date;
}

/* 
 * Convert msSinceEpoch to Date with no hours
 * 
 * @param {Integer} ms Date in milliseconds
 * @return {Date} The date with no hours
 */
function msSinceEpochToDate(ms){
  return standardizeDate(new Date(parseInt(ms)));
}

/*
 * Format closing ratio and volume detail
 * 
 * @param {JSON Object} pipedriveBrokerDetail The broker detail from the deal detail call
 * @return {String} The formatted string
 */
function formatPipedriveClosingStats(pipedriveBrokerDetail){
  var closeRatio = (pipedriveBrokerDetail["close_ratio"] >= 0 ? (parseFloat(pipedriveBrokerDetail["close_ratio"])*100).toFixed(2)+"%" : "Unknown");
  var fundedVolume = (pipedriveBrokerDetail["funded_volume"] != undefined ? "$"+(parseFloat(pipedriveBrokerDetail["funded_volume"])/1000000).toFixed(2)+"M" : "Unknown");
  return "Close Ratio: "+closeRatio+", Funded: "+fundedVolume;
}

/*
 * Format key value that opens external url on click
 *
 * @param {String} text The text to format
 * @return {String} The text with HTML formatting to set font colour
 */
function formatLink(text){
  var linkColour = "#1257e0";
  return "<font color=\""+linkColour+"\">"+text+"</font>";
}

/*
 * Set the first character in a string to be uppercase
 *
 * @param {String} text The string to uppercase the first letter of
 * @return {String} The submitted text with the first letter changed to uppercase
 */
function firstLetterUppercase(text){
  var formattedText = text;
  if(text.length > 1){
    formattedText = text.charAt(0).toUpperCase()+text.slice(1);
  }
  else{
    formattedText = text.toUpperCase();
  }
  return formattedText;
}

/*
 * Get first name of the current add-on user
 *
 * @return {String} The first name of the current user, blank if not found
 */
function getUserName(){
  var email = Session.getActiveUser().getEmail();
  
  for (var i in ADD_ON_USERS){
  
    var reg = new RegExp(ADD_ON_USERS[i], "i");
    
    if(email.match(reg)){
      return ADD_ON_USERS[i];
    }
  }
  
  return "";
}

/*
 * Get details of the current add-on user
 *
 * @param {String} Optional - the name of the user to get, default is current user
 * @return {{}} Dictionary with details of the current user, default details returned if user not found 
 */
function getUserDetails(userName){
  if(!userName){
    userName = getUserName();
  }
  return (LENDESK_USERS[userName] ? LENDESK_USERS[userName] : LENDESK_USERS["default"]);
}

/*
 * Get the Pipedrive Id for the current user
 *
 * @return {String} The Id of the current user, null if not found
 */
function getPipedriveUserId(){
  return PipedriveAPILibrary.USER_MAP_BY_NAME[getUserName()];
}

/*
 * Format time as HH:MM
 *
 * @param {Float} time The time in hours (e.g. 6:30 would be 6.5)
 * @return {String} Time in HH:MM format, "" if error
 */
function formatTime(time){
  var formattedTime = "";
  try{
    var hours = Math.trunc(time);
    var minutes = time - hours;
    minutes = Math.round(minutes * 60);
    formattedTime = (hours < 10 ? "0"+hours : hours)+":"+(minutes < 10 ? "0"+minutes : minutes);
  }
  catch(e){
  }
  return formattedTime;
}

/*
 * Convert string form inputs into a more useful format
 *
 * @param {Event Object} e
 * @return {{}} The form inputs values as strings with lists seperated by commmas, {} if no formInputs in event object
 */
function parseFormInputs(e){
  var formInput = {};
  
  if(e && e.commonEventObject && e.commonEventObject.formInputs){
    formInput = e.commonEventObject.formInputs;
    for(var i in formInput){
      if(formInput[i].stringInputs && formInput[i].stringInputs.value){
        formInput[i] = formInput[i].stringInputs.value.join(",");
      }
    }
  }
  
  return formInput;
}

/*
 * Replace parameters with form inputs if reload
 *
 * @param {Event Object} e
 * @param {{}} formInputs Optional - The parsed form inputs
 * @return {{}} The parameter values, {} if no parameters in event object
 */
function parseParameters(e, formInputs){
  var parameters = {};
  if(e && e.commonEventObject && e.commonEventObject.parameters){
    parameters = e.commonEventObject.parameters;
    
    // if reload, use the current form inputs
    if(parameters.reload){
      var formInput = (formInputs ? formInputs : parseFormInputs(e));  
      for(var i in formInput){
        if(formInput[i]){
          parameters[i] = formInput[i];
        }
      }
    }
  }
  return parameters;
}

/*
 * Format event object data in more useful form
 *
 * @param {Event Object} e
 * @return {{}} Dictionary containing formInputs and parameters objects with formatted data
 */
function parseEventObject(e){
  var formInputs = parseFormInputs(e);
  var parameters = parseParameters(e, formInputs);
  var data = {
    "formInputs" : formInputs,
    "parameters" : parameters
  };
  return data;
}

/*
 * Extract Pipedrive Id from human readable name
 *
 * @param {String} value The human readable name
 * @return {String} The extracted Pipedrive Id, null if improper format
 */
function parsePipedriveIdFromSuggestion(value){
  if(value){
    value = value.split(" - ")[0];
    var numberMatch = value.match(/(\d+)/g);
    if(!numberMatch || numberMatch[0].length != value.length){
      value = null;
    }
  }
  return value;
}