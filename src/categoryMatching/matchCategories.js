const brain = require('brain.js'); // Import the Brain.js library for neural networks matching

// TODO - refactor addCategories function to make it more modular and readable

/**
 * Categorizes receipt items by matching them to predefined categories using fuzzy matching.
 * @param {Array} receiptItems - List of receipt items, each with a `name` property.
 * @returns {void}
 */
export function addCategories(receiptItems) {
  // Retrieve pre-defined categories from the JSON structure
  const categoriesData = getCategoriesJSON();
  
  // Prepare a map of categories for easy lookup
  const categoriesMap = {};
  categoriesData.forEach(item => {
      if (!categoriesMap[item.Category]) {
          categoriesMap[item.Category] = [];
      }
      categoriesMap[item.Category].push(item.Item);
  });

  // Loop through each item in the receipt
  for (const element of receiptItems) {
      let currentItemName = element.name;
      
      // Convert the item name to lowercase for case-insensitive matching, Edeka puts items in uppercase on their receipts
      currentItemName = currentItemName.toLowerCase();

      // Initialize variables for tracking the best match
      let bestMatchingCategory = '';
      let bestMatchingItem = '';
      let bestDistance = Infinity;

      // Loop through each category and its items
      for (const [categoryKey, categoryItems] of Object.entries(categoriesMap)) {
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
 * Retrieves a JSON array of categories with their corresponding items.
 *
 * @returns {Array<Object>} An array of objects where each object represents an item and its category.
 * @returns {string} return[].Item - The name of the item.
 * @returns {string} return[].Category - The category of the item.
 */
function getCategoriesJSON(){
  const categoriesData = require('./categories.json');
  return categoriesData;
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


/*
*
*****************************************************************************************************************************************
* The following code snippets are used in the training and prediction of a neural network for categorizing items.
* Backlog, because the data is not sufficient for training the neural network yet
*****************************************************************************************************************************************
*
*/

/**
 * Converts a string to a vector of normalized ASCII values, padding or trimming to the max length.
 * @param {string} str - The input string to convert.
 * @param {number} maxLength - The fixed length for the output vector.
 * @returns {Array} - A vector of the given fixed length.
 */
function stringToVector(str, maxLength) {
  const vector = str.split('').map(char => char.charCodeAt(0) / 255);

  // If the vector is shorter than the max length, pad it with zeros
  if (vector.length < maxLength) {
    while (vector.length < maxLength) {
      vector.push(0);
    }
  }

  return vector;
}

/**
 * Trains a neural network to categorize items using Brain.js.
 * @param {Array} data - List of items and categories (e.g., [{ "Item": "Rügenw. Veg. Bratw.", "Category": "Fleischprodukte" }]).
 * @returns {Object} - The trained neural network.
 */
export function trainBrainNetwork() {
  const data = getCategoriesJSON();

  // Find the maximum length of all item names for padding
  let maxInputLength = 0;
  for (const entry of data) {
    maxInputLength = Math.max(maxInputLength, entry.Item.length);
  }

  // Initialize the neural network
  const net = new brain.NeuralNetwork();

  // Prepare the training data
  const trainingData = [];
  const categories = new Set(); // To track unique categories for one-hot encoding

  data.forEach((entry) => {
    const itemName = entry.Item.toLowerCase();
    const inputVector = stringToVector(itemName, maxInputLength);

    // Add each category to the set to ensure one-hot encoding works correctly
    categories.add(entry.Category);

    trainingData.push({
      input: inputVector,                    // Encoded item name
      output: { [entry.Category]: 1 }        // One-hot category as output
    });
  });

  // Train the neural network with the prepared data
  net.train(trainingData, {
    iterations: 200000,    // Number of training iterations
    log: true,            // Log each iteration (optional)
    logPeriod: 1000,       // Logging frequency (optional)
    learningRate: 0.5     // Learning rate for training
  });

  // Return the trained network and the unique categories
  return { net, categories: Array.from(categories), maxInputLength };
}

/**
 * Predicts categories for a list of item names using a trained neural network.
 * @param {Array} items - List of item names to categorize.
 * @param {Object} trainedModel - The trained neural network.
 * @param {number} maxInputLength - Maximum length for input vectors.
 * @returns {Array} - List of predicted categories for each item.
 */
export function predictCategories(receiptItems, trainedModel) {
  const { net, maxInputLength } = trainedModel;
  const predictions = [];

  receiptItems.forEach((item) => {
    const itemName = item.name; // Access the name property of the object
    const inputVector = stringToVector(itemName.toLowerCase(), maxInputLength);

    // Predict the category using the trained neural network
    const prediction = net.run(inputVector);

    // Find the category with the highest confidence
    let bestMatchingCategory = '';
    let maxConfidence = 0;
    for (const [category, confidence] of Object.entries(prediction)) {
      if (confidence > maxConfidence) {
        bestMatchingCategory = category;
        maxConfidence = confidence;
      }
    }

    // Add the prediction result to the original item object
    predictions.push({
      ...item, // Spread the original item properties (like name, etc.)
      predictedCategory: bestMatchingCategory // Add the predicted category
    });
  });

  return predictions;
}