function getPipelineSheet(){
  return SpreadsheetApp.openById(PIPELINE.SHEET_ID).getSheetByName(PIPELINE.SHEET_NAME);
}

function getRowById(pipelineSheet, lendeskId){
  var idRange = pipelineSheet.getRange(PIPELINE.ID_RANGE).getValues();
  
  var uniqueConstraint = 0;
  var row = 0;
  
  for(var i = 0; i < idRange.length; i++){
    if(idRange[i][0] != ""){
      if(lendeskId.indexOf(idRange[i][0].toString()) >= 0 ){
        uniqueConstraint ++;
        row = i+1; 
      }
    }
  }
  
  // if row if only one match found in pipeline, null if no match or multiple matches
  return ( uniqueConstraint == 1 ? row : null );
  
}

function getPipelineValueByColumn(pipelineSheet, lendeskId, column){
  var row = getRowById(pipelineSheet, lendeskId);
  var updateRangeValues = "Not in pipeline";
  
  if(row){
    var updateRange = pipelineSheet.getRange(row, column);
    updateRangeValues = updateRange.getValue();
  }
  else{
    Logger.log('Cannot find unique entry in pipeline');
  }
  
  return updateRangeValues;
}

function setPipelineValueByColumn(pipelineSheet, lendeskId, columnValueObj){
  var row = getRowById(pipelineSheet, lendeskId);
  var successBoolean = false;
  
  if(row){
    for(var i in columnValueObj){
      Logger.log("update");
      Logger.log(i);
      Logger.log(columnValueObj[i]);
      
      pipelineSheet.getRange(row, i).setValue(columnValueObj[i]);
    }
    successBoolean = true;
  }
  else{
    Logger.log('Cannot find unique entry in pipeline');
  }
  
  return successBoolean;
}

function getPipelineStatus(lendeskId){
  var pipelineSheet = getPipelineSheet();
  return getPipelineValueByColumn(pipelineSheet, lendeskId, 2);
}

function setPipelineStatus(lendeskId, status){
  /*
  var pipelineSheet = getPipelineSheet();
  var timestampCol = 28+parseInt(status.charAt(0));
  Logger.log(timestampCol);
  
  var columnValueObj = {
    2 : status
  };
  
  if(status == "2. Sent Commitment"){
    //var commitmentExpiry = new Date();
    //commitmentExpiry.setDate(commitmentExpiry.getDate() + 5);
    var commitmentExpiry = LendeskAPILibrary.getCommitmentExpiry(lendeskId);
    
    columnValueObj[22] = commitmentExpiry;
  }
  columnValueObj[timestampCol] = new Date();
  
  Logger.log(columnValueObj);
  var successBoolean = setPipelineValueByColumn(pipelineSheet, lendeskId, columnValueObj);
  if (successBoolean){
    sortDealPipeline(pipelineSheet);
  }
  */
  var successBoolean = true;
  return successBoolean;
}

function updatePipelineById(lendeskId, column){
  
}
function sortDealPipeline(pipelineSheet){
  Logger.log("Sort");
  /*
  var columnToSortBy = 2;
  var range = pipelineSheet.getRange(PIPELINE.SORT_RANGE);
  range.sort( [{ column : columnToSortBy }] );
  */
}
