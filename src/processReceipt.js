export function processReceiptDict(receiptDict){
    const store = extractStore(receiptDict);
    const date = extractDate(receiptDict);
    console.log(store);
    console.log(date);
    return "Test";
};

function extractStore(receiptDict){
    const possible_stores = {
        "Kaufland":["Kaufland","KAUFLAND","KLC","Bergsteig","09621/78260"],
        "Lidl":["Lidl","LIDL","Barbarastr", "Hirschauer"],
        "Netto":["Netto","NETTO","Mosacher","Deutschlandcard"],
        "Edeka":["Edeka","EDEKA","Wiesmeth","Pfistermeisterstr","G&G","Kunert"], 
        //potential Stores
        "Aldi":["Aldi","ALDI"],
        "Norma":["Norma","NORMA"]
    };
    
    //Loop through all Rows of the receipt
    for(let key in receiptDict){
        //Loop through every word of the row
        for(let i = 0; i < receiptDict[key].length; i++){
            //Loop through every possible_store
            for(let store in possible_stores){
                //Loop through every possible store identifier
                for(let j = 0; j < possible_stores[store].length; j++){
                   if(receiptDict[key][i] === possible_stores[store][j]){
                        return store; 
                   } 
                }
            }
        }
    }
    return "Kein Laden gefunden";

};

function extractDate(receiptDict){
    //Date in the format DD.MM.YY
    const datePattern = /\b\d{2}[.\-\/]\d{2}[.\-\/]\d{2}\b/;

    for(let key in receiptDict){
        //Loop through every word of the row
        for(let i = 0; i < receiptDict[key].length; i++){
            const date_text = receiptDict[key][i].match(datePattern);
            if(date_text){
                return date_text[0];
            }
        }
    }

    const current_date = new Date ();
    const formatted_date = current_date.toLocaleDateString('de-DE');

    return formatted_date;
}