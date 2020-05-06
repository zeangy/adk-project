var EMAIL = Session.getActiveUser().getEmail().split("@")[0]+"@neighbourhoodholdings.com";

var PIPELINE = {
  "SHEET_ID" : "1t154w6JFoxbnd26bKLOvnm7_tn8ta-sKj6pFSz0qPnw",
  "SHEET_NAME" : "Lendesk Deal Pipeline",
  "SORT_RANGE" : "A3:AH",
  "ID_RANGE" : "AB:AB"
};

var LENDESK_STATUS_ARRAY = LendeskAPILibrary.LENDESK_STATUS_ARRAY;

var EMAIL_TEMPLATES = {
  "Underwriting Summary" : "48b298ac-a08d-4444-8735-8169a7aedf1f",
  "DCA Email" : "720ac748-bc4a-43ef-976f-77af0b21960f",
  "Appraisal Summary" : "1a7d17de-1136-4424-ac06-bc6f096e565a",
  // "File Processed" : "d61b205b-4a0c-4255-a7c3-8c39cc58891b",
  "Broker Remaining Conditions" : "54f6969b-943f-4a42-9ea5-2a69b888e5b5",
  "Broker Quote" : "81d82a49-4d9a-47df-bce1-338be9ef761e",
  "French Broker Quote" : "ac5db021-fdfa-4ba9-9d7d-431be28eca17",
  "Broker Approval Summary" : "660267dd-0b27-4bdd-ae29-06b655f2114e",
  "Broker Commitment" : "73ae8e2f-28e5-47b9-a739-42726b6ffbc6",
  "French Broker Commitment" : "7b874147-2b53-4de5-86dd-90a8e94150ce",
  "Solicitor Instructions" : "9feeda50-eb76-41d3-b192-c83734a16ddf",
  //"QC Notary Instructions" : "211389b3-1006-4290-b7fb-e6cc2a37ffde",
  "Short Approval Request" : "9005f9a7-f78b-4ace-98d6-232612b8978c", 
  "Flinks" : "4a59462f-ba96-40aa-8d09-e6fb8011eb1c"
};

var EXPIRY_TEMPLATES = {
  "Expires Today" : "cd7c2874-531c-4b02-946f-41375a96a544",
  "Expires Tomorrow" : "30c0bb65-6ccd-4117-83e2-6bf74feff2d4",
  "Expired" : "ee42c748-6ac3-43d6-b2a0-252943f06ebb"
};

var EXTERNAL_TEMPLATE_LIST = [
  "81d82a49-4d9a-47df-bce1-338be9ef761e", 
  "ac5db021-fdfa-4ba9-9d7d-431be28eca17",
  "660267dd-0b27-4bdd-ae29-06b655f2114e", 
  "73ae8e2f-28e5-47b9-a739-42726b6ffbc6",
  "9feeda50-eb76-41d3-b192-c83734a16ddf",
  "211389b3-1006-4290-b7fb-e6cc2a37ffde",
  "7b874147-2b53-4de5-86dd-90a8e94150ce"
];

var LENDESK_USERS = {
  "Alexandra" : {
    "name" : "Alexandra",
    "team" : "underwriting",
    "colour" : "#ef6902"
  }, 
  "Aida" : {
    "name" : "Aida",
    "team" : "underwriting",
    "colour" : "#ea0baf"
  }, 
  "Sasha" : {
    "name" : "Sasha",
    "team" : "underwriting",
    "colour" : "#f4b342"
  }, 
  "Jared" : {
    "name" : "Jared",
    "team" : "underwriting",
    "colour" : "#13a02a"
  }, 
  "Valerie": {
    "name" : "Valerie",
    "team" : "sales",
    "colour" : "#42f4d1"
  },
  "Thibaut": {
    "name" : "Thibaut",
    "team" : "sales",
    "colour" : "#42f4d1"
  },
  "Janwyn": {
    "name" : "Janwyn",
    "team" : "sales",
    "colour" : "#002a61"
  }
};

IMAGES = {
  "SMILE" : "https://cdn0.iconfinder.com/data/icons/emoji-party-pack/250/Emoji-Party-Pack-38-256.png", 
  "FROWN" : "https://cdn0.iconfinder.com/data/icons/emoji-party-pack/250/Emoji-Party-Pack-07-256.png", 
  "INDIVIDUAL" : "https://www.gstatic.com/images/icons/material/system/1x/people_grey600_48dp.png",
  "MULTIPLE" : "https://www.gstatic.com/images/icons/material/system/1x/person_grey600_48dp.png", 
  "UPDATE" : "http://files.conconi.ca/loud_howard.jpg", 
  "SEARCH" : "http://joshwcomeau.github.io/RequestKittensDocs/public/assets/images/kitten_icon.png", 
  "GOOGLE_SHEET" : "https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_spreadsheet_x16.png"
};

// Lendesk logo
// "https://downloads.intercomcdn.com/i/o/60003331/83385382c7bf772aeb06dbd4/profile_logo.png"
// "http://files.conconi.ca/lendesk_logo.png"
//http://joshwcomeau.github.io/RequestKittensDocs/public/assets/images/kitten_icon.png
//https://lh3.googleusercontent.com/-TPn4-RFxIu4/Wvyokn4EZRI/AAAAAAAAIbg/iKy59kxPV90ki6hs38YWvzL-Jv0E5zxiQCL0BGAYYCw/h120/2018-05-16.png