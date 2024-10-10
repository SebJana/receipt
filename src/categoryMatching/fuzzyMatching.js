import { getCategories } from './categories.js';
import { getPossibleStoreSpecificNamePrefixes, replaceFromLookupArray } from '../receiptProcessing/utilities.js';

/**
 * Categorizes receipt items by matching them to predefined categories using fuzzy matching.
 * @param {Array} receiptItems - List of receipt items, each with a `name` property.
 * @returns {void}
 */
export function addCategories(receiptItems) {
    // Retrieve pre-defined categories
    const categories = getCategories();
    const possiblePrefixes = getPossibleStoreSpecificNamePrefixes();

    // Loop through each item in the receipt
    for (const element of receiptItems) {
        let currentItemName = element.name;

        // Replace store-specific name parts (e.g., "KLC", "G&G") for better matching
        currentItemName = replaceFromLookupArray(currentItemName, possiblePrefixes);
        
        // Convert the item name to lowercase for case-insensitive matching
        currentItemName = currentItemName.toLowerCase();

        // Initialize variables for tracking the best match
        let bestMatchingCategory = '';
        let bestMatchingItem = '';
        let bestDistance = Infinity;

        // Loop through each category and its items
        for (const [categoryKey, categoryItems] of Object.entries(categories)) {
            for (const categoryItem of categoryItems) {
                const categoryItemLower = categoryItem.toLowerCase();

                // Perform fuzzy matching (Levenshtein distance)
                const distance = levenshteinDistance(currentItemName, categoryItemLower);

                // Update best match if this distance is lower
                if (distance < bestDistance) {
                    bestMatchingCategory = categoryKey;
                    bestMatchingItem = categoryItem;
                    bestDistance = distance;

                    // Early exit if exact match found
                    if (distance === 0) break;
                }
            }

            // Early exit from outer loop if exact match is found
            if (bestDistance === 0) break;
        }

        // Assign the best matching category to the current item
        element.category = bestMatchingCategory;
        
        // Log the current item, best matching category, matching item, and distance
        console.log(currentItemName, bestMatchingCategory, bestMatchingItem, bestDistance);
    }
}

/**
 * Fuzzy Machting function
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