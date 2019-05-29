/**
  * FORMATTING FUNCTIONS
  */
function formatCurrency(amount){
  if(amount >= 1000000){
    return Utilities.formatString("$%d,%03d,%02d%1.2f", amount/1000000, amount%1000000/1000, amount%1000/10, amount%10);
  }
  else{
    return Utilities.formatString("$%d,%02d%1.2f", amount/1000, amount%1000/10, amount%10);
  }
}
function formatPercent(amount){
  return Utilities.formatString("%.2f%", amount*100);
}