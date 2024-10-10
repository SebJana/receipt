/**
 * Class representing a receipt.
 * Contains store, date, sum, receipt items, and a unique ID.
 */
export class Receipt {
    constructor(store, date, receiptSum) {
        this.id = this.#generateID(); // Generate a unique ID
        this.store = store;
        this.date = date;
        this.receiptSum = receiptSum;
        this.receiptItems = []; // List of ReceiptItem objects
        this.receiptItemsDict = {}; // Raw dictionary of receipt items
    }

    // Private method to generate a unique ID based on the current timestamp
    #generateID() {
        return Date.now();
    }

    setReceiptItem(items) {
        this.receiptItems = items;
    }

    addReceiptItem(item) {
        this.receiptItems.push(item);
    }

    setReceiptItemsDict(dict) {
        this.receiptItemsDict = dict;
    }

    getId() {
        return this.id;
    }
}

/**
 * Class representing an item on a receipt.
 * Each item contains an index, name, price, amount, and optional category.
 */
export class ReceiptItem {
    constructor(index, name, price, amount) {
        this.index = index;
        this.name = name;
        this.price = price || 0; // Default price to 0 if unknown
        this.amount = amount || 1; // Default amount to 1 if unknown
        this.category = '';
    }

    // Apply a discount to the price (e.g. -0,60)
    applyDiscount(discount) {
        discount = discount/this.amount;
        if (discount > 0) {
            console.log("Invalid Discount amount!");
        }
        this.price = Number((this.price + discount).toFixed(2));
    }

    setCategory(category) {
        this.category = category;
    }

    // Get the total price for this item (price * amount)
    getTotal() {
        if (this.amount === 0){
            return this.price;
        }
        return this.price * this.amount;
    }
}