/**
 * Retrieves a collection of categories with their associated terms.
 * @returns {Object} An object where keys are category names and values are arrays of terms associated with each category.
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