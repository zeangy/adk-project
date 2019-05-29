function locationSearchCard() {
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader()
    .setTitle("Location Search")
  );
  var section = CardService.newCardSection();
  
  section.addWidget(
    CardService.newTextInput()
      .setFieldName("query")
      .setTitle("Please enter the postal code")
    );
  section.addWidget(
    CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(CardService.newAction()
      .setFunctionName("locationSearchResult"))
  )  
  card.addSection(section);
  
  return [card.build()];
}

function locationSearchResult(e){
  
  var searchQuery = e.formInput["query"].toUpperCase();
    
  var result = '<b><font color="#f44242">Not Eligible</font></b><br /><i>Reference list of eligible locations is not exhaustive. Please discuss with the senior underwriter if you think this location is categorized as not eligible in error.</i>';
  var image = IMAGES.FROWN;
 
  var values = SpreadsheetApp.openById("1A1fMNBz27TiYRTi4tNhPxJXvusEsumETYsOaGasTA3Q").getSheetByName("Population").getRange("Z:AB").getValues();
  
  for(var i in values){
    if(searchQuery.substring(0, 3) == values[i][0].toUpperCase()){
      result = '<b><font color="#4db73a"> Eligible: ' + values[i][2] + '</font></b>';
      Logger.log(searchQuery.substring(1, 1));
      if(searchQuery.substring(1, 2) == "0"){
        result += '*<br>*<font color="#f44242"><i>Rural area, check with Jared if location is okay</i></font>';
      }
      image = IMAGES.SMILE;
      break;
    }
  }
  
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader()
    .setTitle("Location Search: " + searchQuery)
    .setImageUrl(image)
    );
  var section = CardService.newCardSection();
  
  section.addWidget(
    CardService.newTextParagraph()
      .setText(result)
  );
  
  card.addSection(section);
  var actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .pushCard(card.build()))
    .build();
    
  return actionResponse;
}