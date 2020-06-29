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