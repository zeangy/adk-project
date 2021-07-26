//Trigger every 48 hours
function timeDrivenTrigger() {
  ScriptApp.newTrigger('sendCancelledEmail')
  .timeBased()
  .everyHours(48)
  .create();
  
}
