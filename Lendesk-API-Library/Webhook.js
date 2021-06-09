/** 
 *  Set standard liabilities for an application
 *
 *  @param {String} liabilityId The ID for the loan liability.
 *  @param {String} rateType The interest rate type (fixed or variable, variable by default).
 *  @return {JSON} Response
 */
function updateStandardLiability(liabilityId, rateType){
  return updateLiability(liabilityId, rateType, 12);
}

/** 
 *  Set standard liabilities for an application
 *
 *  @param {String} liabilityId The ID for the loan liability.
 *  @param {String} rateType The interest rate type (fixed or variable, variable by default).
 *  @param {Integer} termMonths The term in months.
 *  @return {JSON} Response
 */
function updateLiability(liabilityId, rateType, termMonths){
  
  var url = "https://api.lendesk.com/api/liabilities/"+liabilityId;
  var payload = {
    "payment_schedule":"interest_only", 
    "term_value":termMonths, 
    "term_unit_per_year":"month", 
    "payment_frequency_per_year":"monthly", 
    "interest_rate_compounding_periods_per_year": "monthly"
  };
  if(rateType == "fixed"){
    payload["rate_type"] = "fixed";
  }
  else{
   payload["rate_type"] = "variable";
   payload["prime"] = PRIME_RATE;
  }
    
  return httpPut(url, JSON.stringify(payload));
}

/** 
 *  Set prepayment type to closed then open
 *  Could also set funding date here in the future
 *
 *  @param {String} loanId The ID for the loan.
 *  @return {JSON} Response
 */
function updateStandardLoan(loanId){
  var url = "https://api.lendesk.com/api/v2/loans/"+loanId;
  var payload = '{"prepayment_status_type":"closed"}'
  return httpPut(url, payload);
}

/** 
 *  Set prepayment to be 3 months closed, payout on regular payment dates only
 *
 *  @param {String} prepaymentDetailId The ID for the prepayment details.
 *  @return {JSON} Response
 */
function updateStandardPrepaymentDetail(prepaymentDetailId){
  return updatePrepaymentDetail(prepaymentDetailId, 3);
}
/** 
 *  Set prepayment to be specific number of months closed, payout on regular payment dates only
 *
 *  @param {String} prepaymentDetailId The ID for the prepayment details.
 *  @param {Integer} monthsClosed The number of months closed
 *  @return {JSON} Response
 */
function updatePrepaymentDetail(prepaymentDetailId, monthsClosed){
  var url = "https://api.lendesk.com/api/v2/prepayment_details/"+prepaymentDetailId;
  var payload = JSON.stringify({"initial_status_duration":monthsClosed, "initial_status_duration_frequency":"month", "allowed_dates":"payment_dates_only"});
  return httpPut(url, payload);
}

/** 
 *  Add standard fees (Legal, Wire, Tite Insurance) to the loan
 *
 *  @param {String} loanId The ID for the loan.
 */
function addStandardFees(loanId){
  var url = "https://api.lendesk.com/api/v2/loan_fees";
  var fees = [
    "d65bcaac-d665-4491-8cf1-1c6bb771cd59", // Legal Fee
    "05fa0b3a-8de6-4052-b786-39a7f1a5b2ad", // Wire Fee
    "56eef47a-be3e-4e75-bd9f-ca0c417b4fdf" // Title Insurance	
  ];
  for(var i in fees){
    var payload = '{ "loan_id": "'+loanId+'", "fee_type_id": "'+fees[i]+'"}';
    Logger.log(payload);
    httpPost(url, payload);
  }

}

function addReferralFee(loanId, feePercent){
  var url = "https://api.lendesk.com/api/v2/loan_fees";
  var referral_id = "cefea507-9517-4981-8d82-788e0ecd7706";
  
  var payload = JSON.stringify({"loan_id": loanId, "fee_type_id": referral_id});
  var response = httpPost(url, payload);
  try{
    var id = response["loan_fee"]["id"];
    var payload = JSON.stringify({"loan_fee":{"funds_required_percentage": feePercent}});
    httpPut(url+"/"+id, payload)
  }
  catch(e){
    // Fee percent couldn't be assigned
  }
}

/** 
 *  Update an existing task description
 *
 *  @param {String} taskId The ID for the task.
 *  @param {String} taskName The task description to post.
 */
function updateTaskDescription(taskId, taskDescription){
  var url = "https://api.lendesk.com/api/v2/tasks/"+taskId;
  var payload = JSON.stringify({"description":taskDescription});
  return httpPut(url, payload);
}
/** 
 *  Add general task to the application
 *  Only adds the task if the task does not already exist
 *
 *  @param {String} applicationId The ID for the application.
 *  @param {String} taskName The task description to post.
 */
function addGeneralTask(applicationId, taskName){
  var url = "https://api.lendesk.com/api/v2/task_lists?application_id="+applicationId;
  var taskListId = null;
  var noExistingTask = true;
  
  var taskLists = httpGet(url)["task_lists"];
  for(var i in taskLists){
    if(taskLists[i]["name"] == "General"){
      taskListId = taskLists[i]["id"];
      
      for(var j in taskLists[i]["tasks"]){

        if(taskLists[i]["tasks"][j]["description"] == taskName){
          noExistingTask = false;
          
        }
      }
    }
  }
  
  var taskId = null;
  
  if(taskListId && noExistingTask){
    url = "https://api.lendesk.com/api/v2/tasks";
    
    var payload = {
      "task_list_id" : taskListId,
      "completed" : false, 
      "description" : taskName
    };
    
    var result = httpPost(url, JSON.stringify(payload));

    taskId = result["response"]["id"];
  }
  
  return taskId;
}

/** 
 *  Assigns a general task to a person by their assignee id
 *
 *  @param {String} taskId The ID for the task to assign.
 *  @param {String} assigneeId The ID for the person to assign the task to.
 */
function assignTask(taskId, assigneeId){
  var url = "https://api.lendesk.com/api/v2/tasks/"+taskId+"/assign";
  var payload = {
    "assignee_id": assigneeId
  };
  
  httpPost(url, JSON.stringify(payload));
  
}

/** 
 *  Updates the commitment expiry for a loan based on days from today's date
 *
 *  @param {String} loanId The ID for the loan to edit.
 *  @param {Integer} addDays The number of days from today.
 */
function addCommitmentExpiry(loanId, addDays){

  var expiryDate = new Date();
  if(!addDays){
    addDays = 7;
  }
  expiryDate = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate() + addDays);
  
  // Saturday
  if(expiryDate.getDay() == 6){
    expiryDate = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate() + 2);
  }
  // Sunday
  else if(expiryDate.getDay() == 0){
    expiryDate = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate() + 1);
  }
  
  updateCommitmentExpiry(loanId, expiryDate);
}

/** 
 *  Updates the commitment expiry for a loan based on given expiry date
 *
 *  @param {String} loanId The ID for the loan to edit.
 *  @param {Date} expiryDate The date to change to.
 */
function updateCommitmentExpiry(loanId, expiryDate){
  var url = "https://api.lendesk.com/api/v2/loans/"+loanId+"/commitment"
  var payload = '{"expiry_date":"'+expiryDate+'"}';
  httpPut(url, payload);
}

/** 
 *  Clears the commitment expiry for a loan
 *
 *  @param {String} loanId The ID for the loan to edit.
 */
function removeCommitmentExpiry(loanId){
  var url = "https://api.lendesk.com/api/v2/loans/"+loanId+"/commitment"
  var payload = '{"expiry_date":null}';
  httpPut(url, payload);
}


/** 
 *  Add tag to the application
 *  The API call will only add the tag if the tag does not already exist for that application
 *
 *  @param {String} applicationId The ID for the application.
 *  @param {String} tagName The tag description to post.
 */
function addTag(applicationId, tagName){
  var url = "https://api.lendesk.com/api/applications/"+applicationId+"/tags/append";
  var payload = '{"name":"'+tagName+'"}';
  return httpPost(url, payload);
}