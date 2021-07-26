//Trigger every 48 hours
function createTimeDrivenTrigger() {
  ScriptApp.newTrigger('sendDeclineEmail')
  .timeBased()
  .everyHours(48)
  .create();
  
}
