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