/**
 * Fuzzy match two strings using Levenshtein distance.
 * Returns true if the distance is within a given threshold.
 * @param {string} str1 - The first string.
 * @param {string} str2 - The second string.
 * @returns {number} - Return the distance of the two strings.
 */
export function fuzzyMatch(str1, str2) {
    const distance = levenshteinDistance(str1, str2);
    return distance;
}

/**
 * Calculate the Levenshtein distance between two strings with fixed costs for substitution, insertion, and deletion.
 * @param {string} str1 - The first string.
 * @param {string} str2 - The second string.
 * @returns {number} - The Levenshtein distance between the two strings.
 */
function levenshteinDistance(str1, str2) {
    const substitutionCost = 1;  // Fixed cost for swapping/substituting one character
    const insertionCost = 1;     // Fixed cost for inserting a character
    const deletionCost = 1;      // Fixed cost for deleting a character
  
    const len1 = str1.length;
    const len2 = str2.length;
  
    // Create a matrix
    const matrix = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(null));
  
    // Initialize the first row and column of the matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i * deletionCost;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j * insertionCost;
    }
  
    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : substitutionCost;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + deletionCost,   // Deletion
          matrix[i][j - 1] + insertionCost,  // Insertion
          matrix[i - 1][j - 1] + cost        // Substitution
        );
      }
    }
  
    // The Levenshtein distance is the value in the bottom-right corner of the matrix
    return matrix[len1][len2];
  }


/**
 * Different possible Article Names and the Category that it belongs to.
 * @returns {number} - Return the dictionary.
 */
export function getCategories() {
  //TODO adding many, many correct terms --> fuzzy matching is only effective for OCR errors and slight differences
  return {
      "Obst": ["Ananas","Ananaszylinder","Apfel","Äpfel","Apfel kg","Apfel rot","Aprikosen","Banane","Bananen","Bananen kg","Birnen","Blaubeeren","Erdbeeren","Feigen","Frucht","Granatapfel","Grapefruit","Heidelbeeren","Himbeeren","Honigmelone","Kaktusfeigen","Kirschen","Kiwi","Limetten","Mandarinen","Mango","Melone","Nektarinen","Orangen","Papaya","Passionsfrucht","Pfirsiche","Pflaumen","Plattnektarinen","Plattpfirsiche","Trauben","Trauben dunkel","Trauben hell","Trauben kernlos","Wassermelone","Weintrauben","Zitronen","Zuckermelone"],

      "Gemüse": ["Aubergine ","Avocado","Baby Spinat","Blattspinat","Blaukraut","Blumenkohl","Brokkoli","Cherrytomaten","Dattelcherrytomaten","Eisbergsalat","Erbse","Erbsen","Feldsalat","Fenchel","Grünkohl","Gurke Stk","Gurken","Ingwer","Karotten","Kartoffeln","Knoblauch","Kohlrabi","Kopfsalat","Kürbis","Lauch","Lauchzwiebeln","Mais","Mais Stk","Mangold","Mini Möhren","Miniromato","Möhren","Paprika","Paprika rot","Paprika rot, spitz","Petersilie","Pflücksalat","Pflücksalat mediter.","Radieschen","Rahmspinat","Rosenkohl","Rote Bete","Rotkohl","Rucola","Salat","Schnittlauch","Sellerie","Spargel","Spinat","Spitzpaprika","Stangenspargel","Strauchtomaten","Süßkartoffeln","TO Miniroma","Tomate","Tomaten","Weißkohl","Zucchini","Zwiebel rot","Zwiebeln"],

      "Leergut":["Pfand","Leergut","Pfandartikel", "Pfand 0,25"],

      "Fleischprodukte": ["Aoste Stickado & Brot","Bayer. Leberk","Bayerischer Leberkäse","Cevapcici","Chicken","Chicken Nuggets","Cordon Bleu","Gefl. Lyoner","Gefl. Lyoner","Gefl. Mortadella","Geflügelleberwurst","Geflügel-Mortadella","Geschnet.","Geschnetzeltes","Grillschinken","Gutsleberwurst","Gyros","Hä.Geschnetz.","Hackfleisch","Hackfleisch gemischt","Haenchenbrust","Hähn.-Geschnetzeltes","Hähnchenbr. hauchd.","Hänchen","Hänchen Schnitzel","Hänchenbr.","Hänchenbrust","Huhn","Hünchenbrust","Karli Knusper Dinos","Katenschinken","Katenschinken Würfel","Leberkäse","Leberwurst","Lyoner","Mortadella","P.Hackfleisch","Pfefferbeißer","Pommersche","Puten Mini-Steaks","Puten-Geschnetzeltes","Puten-Mini-Steaks","Putenschni.","Putenschnitzel","Rinder Cevapcici","Rinderhackfleisch","Roast Chicken","Royal Hänchenbrust","Rü. Schnitzel veg.","Rü.Pomm.Schnitll.","Rü.Salami Peperoni","Rüg. Schinkensp. Pf.","Rügenwalder","Salami","Salami Sticks","Schinken","Schinkenwürfel","Schnitzel","Steak","Stickado","Stickado Hähnchen","Truthahnbrust","Truthahnschinken","Wurst/Schinken"],

      "Backwaren": [
      "Breze",
      "Brezel",
      "Toast",
      "Buttertoast",
      "Weizensandwich",
      "KLC Weizensandwich",
      "Zwiebelbaguette",
      "Baguette",
      "Laugenstange",
      "Croissant",
      "Laugenbrezel",

      ],
      "Getränke":[
      "Coca Cola Zero",
      "Coke Zero",
      "Coca Cola",
      "Fanta",
      "Sprite",
      "Wasser"
      ]
  };
}