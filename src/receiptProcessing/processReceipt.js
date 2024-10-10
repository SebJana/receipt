import { Receipt, ReceiptItem } from "./receiptModel.js";
import { cleanRows } from "./receiptDataCleaning.js";
import { extractStore, extractDate, extractSum, extractDiscountRows } from "./receiptDataExtraction.js";
import { cutReceipt, removeKgPriceRows, removeDiscountRows, removeSpecialInfoRows, removeSummeRow, applyDiscounts} from "./receiptDataManipulation.js";	
import { createReceiptItemsKaufland, createReceiptItemsLidlEdeka, createReceiptItemsNetto } from "./receiptDictToReceiptItems.js";
import { addCategories } from "../categoryMatching/fuzzyMatching.js";

import { getDictLength } from "./utilities.js";

/**
 * Processes the receipt dictionary and extracts relevant information.
 * Cleans the rows, identifies the store, extracts the date, 
 * cuts unnecessary parts, and processes the items and total sum.
 * @param {Object} receiptDict - The dictionary containing raw receipt data.
 * @returns {Object} - A Receipt object containing the store, date, sum, and receipt items.
 * @throws Will throw an error if the receipt text couldn't be extracted or processed.
 */
export function processReceiptDict(receiptDict) {
    //TODO Error Handling, Edge Cases

    if (!receiptDict || getDictLength(receiptDict) === 0) {
        throw new Error('Receipt text couldn’t be extracted');
    }

    // Step 1: Clean the rows by removing irrelevant data (e.g., ' ' and '' elements)
    const cleanReceiptDict = cleanRows(receiptDict);

    // Step 2: Extract the store name and date from the receipt
    const store = extractStore(cleanReceiptDict);
    const date = extractDate(cleanReceiptDict);

    // Step 3: Extract the relevant part of the receipt (items, prices, etc.)
    let relevantReceiptDict = cutReceipt(cleanReceiptDict);
    console.log(relevantReceiptDict);
    // relevantReceiptDict = removeKgPriceRows(relevantReceiptDict);
 
    // Step 4: Extract the total sum from the receipt
    const receiptSum = extractSum(relevantReceiptDict);

    if (!relevantReceiptDict || getDictLength(relevantReceiptDict) === 0) {
        throw new Error('Unable to process the receipt.');
    }

    // Step 5: Create and return a new receipt object
    const receipt = new Receipt(store, date, receiptSum);
    receipt.setReceiptItemsDict(relevantReceiptDict);

    return receipt;
}

/**
 * Processes the receipt items for a given receipt.
 * Different processing logic can be applied based on the store (e.g., Kaufland, Lidl).
 * @param {Array<ReceiptItem>} receiptItems - A Receipt object containing the store, date, and items.
 * @throws Will throw an error if there are no receipt items in the receiptDict.
 */
export function processReceiptItems(receipt) {
    const receiptDict = receipt.receiptItemsDict;

    // Copy original receipt dict
    let receiptOnlyItemsDict = {...receiptDict};

    // Remove non-item-related rows from the receipt
    receiptOnlyItemsDict = removeDiscountRows(receiptOnlyItemsDict);
    receiptOnlyItemsDict = removeSpecialInfoRows(receiptOnlyItemsDict);
    receiptOnlyItemsDict = removeSummeRow(receiptOnlyItemsDict);

    console.log(receiptOnlyItemsDict);

    let receiptItems = [];

    // Process items differently based on the store
    switch (receipt.store) {
        case "Kaufland":
            // Dont remove the kg info rows, as they contain the price
            receiptItems = createReceiptItemsKaufland(receiptOnlyItemsDict);
            break;
        case "Lidl":
        case "Edeka":
            receiptOnlyItemsDict = removeKgPriceRows(receiptOnlyItemsDict);
            receiptItems = createReceiptItemsLidlEdeka(receiptOnlyItemsDict);
            break;
        case "Netto":
            receiptOnlyItemsDict = removeKgPriceRows(receiptOnlyItemsDict);
            receiptItems = createReceiptItemsNetto(receiptOnlyItemsDict);
            break
        default:
            receiptItems = createReceiptItemsLidlEdeka(receiptOnlyItemsDict);
            console.log("Store yet to be processed, using default method");
    }

    if (receiptItems.length === 0) {
        throw new Error('No Items found in the receipt.');
    }

    // Apply the discounts
    const receiptDiscount = extractDiscountRows(receiptDict);
    receiptItems = applyDiscounts(receiptItems, receiptDiscount);
    console.log(receiptItems); 

    addCategories(receiptItems);

    // TODO
    // Categories (fuzzy matching CHECK, possible weight adjustments), adding more possible identifiers to the categories
    // Pfandrückgabe Lidl, ...(?) adjustment // CHECK for Lidl, waiting if there are also more stores with that logic
    // Errors/Edge Cases
    // Testing

    return receiptItems;
}