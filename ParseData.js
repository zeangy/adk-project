function displayLendeskApplication(applicationId){
  applicationId = "440e9a58-b246-42a8-9055-643435459a03";
  //applicationId = "a56f7498-c5ad-4306-868a-50f191803cfa";

  var display = LendeskAPILibrary.pipelineRow(applicationId);
  Logger.log(display);
}

function getFolderName(applicants){
  function extractNames (x){
    return (x.client.is_company || !x.client.last_name || !x.client.first_name ? x.name : x.client.last_name+", "+x.client.first_name);
  }
  
  var primaryApplicantArray = applicants.filter(function(x){return x.primary;});
  var name = primaryApplicantArray.map(extractNames)[0];
  var credit = (primaryApplicantArray[0].credit_score ? primaryApplicantArray[0].credit_score : "");
  
  if(primaryApplicantArray[0].client.is_company){
    var secondaryApplicants = applicants.filter(function(x){return !x.primary;});
    if(secondaryApplicants.length > 0){
      name += " ("+secondaryApplicants.map(extractNames)[0]+")";
      credit = (secondaryApplicants[0].credit_score ? secondaryApplicants[0].credit_score : "");
    }
  }
  
  return name;
}