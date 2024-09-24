export function processReceiptDict(receiptDict){
    const store = extractStore(receiptDict);
    const date = extractDate(receiptDict);
    const relevantReceiptDict = cutReceipt(receiptDict);
    console.log(store);
    console.log(date);
    console.log(relevantReceiptDict);
    return "Test";
};

function extractStore(receiptDict){
    const possible_stores = {
        "Kaufland":["Kaufland","KAUFLAND","KLC","Bergsteig","09621/78260"],
        "Lidl":["Lidl","LIDL","Barbarastr", "Hirschauer","L4DL","L$DE"],
        "Netto":["Netto","NETTO","Mosacher","Deutschlandcard","Marken-Discount"],
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
            //Check if datePattern appears somewhere in the string
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

function cutReceipt(receiptDict){
    const possible_starts = ["EUR", "Preis EUR"];
    const possible_ends = ["SUMME", "Summe", "zu zahlen", "Zu Zahlen"];

    function getEditIndex(dictToSearch){
        for(let key in receiptDict){
            for(let i = 0; i < receiptDict[key].length; i++){
                for(let j = 0; j < dictToSearch.length; j++){
                    if(receiptDict[key][i] === dictToSearch[j]){
                        console.log(key, receiptDict[key]);
                        //Only the first occurence
                        return key;
                    }
                }
            }
        }
        //Default
        return -1;
    };

    const start_index = getEditIndex(possible_starts);
    let end_index = getEditIndex(possible_ends);

    // If no start or end is found, return the unmodified receiptDict
    if (start_index === -1 || end_index === -1) {
        console.log("No start or end found, returning unmodified receipt.");
        return receiptDict;
    }

    let tempDict = receiptDict;
    //Don't remove the Summe row
    end_index++;

    //Remove every row after the relevant content
    const tempDictKeys = Object.keys(tempDict);
    for(let j = end_index; j <= tempDictKeys.length - 1; j++){
        delete tempDict[j];
    }
    //Remove every row before the relevant content
    for(let i = 0; i <= start_index; i++){
        delete tempDict[i];
    }

    return tempDict;
};