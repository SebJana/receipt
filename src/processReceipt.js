export function processReceiptDict(receiptDict){
    const cleanReceiptDict = cleanRows(receiptDict);

    const store = extractStore(cleanReceiptDict);
    const date = extractDate(cleanReceiptDict);
    let relevantReceiptDict = cutReceipt(cleanReceiptDict);
    relevantReceiptDict = removeKgPriceRows(relevantReceiptDict);
    const receiptSum = extractSum(relevantReceiptDict);

    console.log(store);
    console.log(date);
    console.log(receiptSum);
    console.log(relevantReceiptDict);
    
    const receipt = new Receipt(store,date,receiptSum);

    return receipt;
};

class Receipt{
    constructor(store, date, receiptSum){
        this.id = this.#generateID();
        this.store = store;
        this.date = date;
        this.receiptSum = receiptSum;
        this.receiptItems = []
    }
    #generateID(){
        //Current unix timestamp in millis as unique id
        return Date.now();
    };
    addReceiptItem(item){
        this.receiptItems.push(item);
    }
    getId(){
        return this.id;
    }
};

function cleanRows(receiptDict){
    //Remove ' ' and '' from every row start
    for(let key in receiptDict){
        for(let i = 0; i < receiptDict[key].length;i++){
            if(!(receiptDict[key][i] === ' ' || receiptDict[key][i] === '')){
                break;
            }
            receiptDict[key].splice(i,1);
             i--; //Adjust index after removal
        }
    }

    //Remove 'A' and 'B' from every row end
    for(let key in receiptDict){
        for(let i = receiptDict[key].length - 1; i >= 0 ;i--){
            if(!(receiptDict[key][i] === 'A' || receiptDict[key][i] === 'B')){
                break;
            }
            receiptDict[key].splice(i,1);
             i++; //Adjust index after removal
        }
    }

    //Remove ' ' and '' from every row end
    for(let key in receiptDict){
        for(let i = receiptDict[key].length - 1; i >= 0 ;i--){
            if(!(receiptDict[key][i] === ' ' || receiptDict[key][i] === '')){
                break;
            }
            receiptDict[key].splice(i,1);
             i++; //Adjust index after removal
        }
    }

    return receiptDict;

};

function extractStore(receiptDict){
    const possible_stores = getPossibleStores();
    
    //Loop through all Rows of the receipt
    for(let key in receiptDict){
        //Loop through every word of the row
        for(let i = 0; i < receiptDict[key].length; i++){
            //Loop through every possible_store
            for(let store in possible_stores){
                //Loop through every possible store identifier
                for(let j = 0; j < possible_stores[store].length; j++){
                   if(receiptDict[key][i].includes(possible_stores[store][j])){
                        return store; 
                   } 
                }
            }
        }
    }
    //No store matched
    return null;

};

function extractDate(receiptDict){
    //Date in the format DD.MM.YY
    const datePattern = /\b(\d{2})[.\-/](\d{2})[.\-/](\d{2}|\d{4})\b/;
    for (let key in receiptDict) {
        // Loop through every word of the row
        for (let i = 0; i < receiptDict[key].length; i++) {
            // Check if datePattern appears somewhere in the string
            const date_text = receiptDict[key][i].match(datePattern);
            if (date_text) {
                // Extract the day, month, and year from the regex match
                const day = date_text[1];
                const month = date_text[2];
                let year = date_text[3];

                // If year is in YY format, convert it to YYYY
                if (year.length === 2) {
                    const currentYear = new Date().getFullYear().toString();
                    const century = currentYear.substring(0, 2); // Get the current century (first two digits of the year)
                    year = `${century}${year}`;
                }

                // Format the extracted date as YYYY-MM-DD
                return `${year}-${month}-${day}`;
            }
        }
    }

    //If no date is found on the receipt return the current date
    const current_date = new Date();
    const formatted_date = current_date.toISOString().split('T')[0]; // Extracts YYYY-MM-DD format
    console.log(formatted_date);

    return formatted_date;
};

function cutReceipt(receiptDict){
    const possible_starts = getPossibleStarts();
    const possible_ends = getPossibleEnds();

    function getEditIndex(dictToSearch){
        for(let key in receiptDict){
            for(let i = 0; i < receiptDict[key].length; i++){
                if (!/^[a-zA-Z]+$/.test(receiptDict[key][i])) {
                    continue; // Skip if the element is not only letters
                }
                for(let j = 0; j < dictToSearch.length; j++){
                    if(receiptDict[key][i].includes(dictToSearch[j])){
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
    let tempDict = receiptDict;

    // if end_index was found
    if (end_index !== -1) {
        // Don't remove the Summe row
        end_index++;

        // Remove every row after the relevant content
        const iter_length = getDictLength(tempDict) - 1;
        for (let j = end_index; j <= iter_length; j++) {
            delete tempDict[j];
        }
    }

    // if start_index was found
    if (start_index !== -1) {
        // Remove every row before the relevant content
        for (let i = 0; i <= start_index; i++) {
            delete tempDict[i];
        }
    }

    return tempDict;
};

function extractSum(receiptDict){
    const index = getMaxDictKey(receiptDict);
    if(index === 0){
        return null;
    }
    const last_row_arr = receiptDict[index];


    function doesRowContainEnd(row){
        const possible_ends = getPossibleEnds();
        for(let end of possible_ends){
            for(let str of row){
                if(str.includes(end)){
                    return true;
                }
            }
        }
        return false;
    }

    //Does the last row start contain a possible end?
    if(doesRowContainEnd(last_row_arr)){
        const last_row_elem = last_row_arr[last_row_arr.length - 1];
        //Is the last element a number?
        const last_row_num = convertToNumber(last_row_elem);

        if(!isNaN(last_row_num)){
            return last_row_num;
        }
    }

    // Default if no sum can be determined
    return null;
};

function removeKgPriceRows(receiptDict){
    const remove_keys = [];
    //Find key index where a "/kg" is in the row
    for(let key in receiptDict){
        for(let i = 0; i < receiptDict[key].length; i++){
            if ((receiptDict[key][i].includes("/kg"))) {
                remove_keys.push(key);
            }
        }
    }
    
    //Delete the rows at the found key
    for(let i = 0; i < remove_keys.length;i++){
        delete receiptDict[remove_keys[i]];
    }

    return receiptDict;

};

function getPossibleStores(){
    return {
        "Kaufland":["Kaufland","KAUFLAND","KLC","Bergsteig","09621/78260"],
        "Lidl":["Lidl","LIDL","Barbarastr", "Hirschauer","L4DL","L$DE"],
        "Netto":["Netto","NETTO","Mosacher","Deutschlandcard","Marken-Discount"],
        "Edeka":["Edeka","EDEKA","Wiesmeth","Pfistermeisterstr","G&G","Kuhnert"], 
        //potential Stores
        "Aldi":["Aldi","ALDI"],
        "Norma":["Norma","NORMA"]
    };
}

export function getPossibleStoreKeys(){
    const possible_stores = getPossibleStores();
    const possible_store_keys = [];

    for(let key in possible_stores){
        possible_store_keys.push(key);
    }

    return possible_store_keys;
}

function getPossibleStarts(){
    return ["EUR", "Preis EUR", "PREIS", "Preis"];
}

function getPossibleEnds(){
    return ["SUMME", "Summe", "zu zahlen", "Zu Zahlen", "Zahlen", "zahlen"];
};

function getDictLength(dict){ 
    return (Object.keys(dict)).length;
};

function convertToNumber(value) {
    // Replace ',' with '.'
    let normalizedValue = value.replace(',', '.');
    let num = Number(normalizedValue);

    // Did the conversion result in a number?
    return !isNaN(num) ? num : null;
};

function getMaxDictKey(dict) {
    if (!dict || Object.keys(dict).length === 0) {
        return 0;
    }

    // Zuerst alle Schlüssel extrahieren und in Zahlen umwandeln
    let maxKey = Object.keys(dict)
        .map(key => Number(key)) // Schlüssel in Zahlen umwandeln
        .reduce((a, b) => a > b ? a : b); // Größten numerischen Schlüssel finden

    return maxKey; // Den größten numerischen Schlüssel zurückgeben
};