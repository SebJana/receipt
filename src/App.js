import React, { useState, useRef } from 'react';
import './App.css';
import { Camera, Trash2, FileText, Check, LoaderCircle } from 'lucide-react';

import { extractFromImage, extractFromPDF } from './extractTextFromFile';
import { processReceiptDict, processReceiptItems, getPossibleStoreKeys } from './processReceipt';

import * as pdfjsLib from 'pdfjs-dist';
// Copied pdf.worker.mjs to public for direct access
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.mjs`;

/**
 * Main React App component for handling receipt processing from images or PDFs.
 * Allows users to upload an image or PDF, extracts text from the file, and processes the receipt.
 */
function App() {
  const [selectedFile, setSelectedFile] = useState(null); // Store the selected file (image or PDF)
  const [imageData, setImageData] = useState(null); // Store the Base64 string representation of the image/PDF preview
  const [imgElement, setImgElement] = useState(null); // Store the actual Image element for OCR extraction
  const [store, setStore] = useState(null); // Store the user-selected or extracted store name
  const [date, setDate] = useState(null); // Store the user-selected or extracted date
  const [receipt, setReceipt] = useState(null); // Store the processed receipt object
  const [receiptItems, setReceiptItems] = useState(null); // Store the extracted ReceiptItems

  const [isPicExtractionConfirmed, setIsPicExtractionConfirmed] = useState(false); // Track whether the file extraction has been confirmed
  const [isUserConfirmedStoreDate, setIsUserConfirmedStoreDate] = useState(false); // Track whether the user has confirmed the store and date
  const [isLoading, setIsLoading] = useState(false); // Track the loading state during file extraction

  const imgInputRef = useRef(null); // Reference for the image file input element
  const pdfInputRef = useRef(null); // Reference for the PDF file input element

  const possibleStores = getPossibleStoreKeys(); // Get the list of possible stores for user selection

  /**
   * Handles file selection and determines whether the selected file is an image or a PDF.
   * @param {Event} event - The file input change event.
   * @param {string} type - The type of file ('image' or 'pdf').
   */
  const handleFileChange = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return; // Exit if no file is selected

    setSelectedFile(file);
    setIsPicExtractionConfirmed(false); // Reset confirmation state
    event.target.value = null; // Reset file input value to allow re-selection of the same file

    // Handle image preview and extraction if it's an image file
    if (type === 'image' && file.type.startsWith('image/')) {
      const img = await handleImagePreview(file); // Wait for image preview
      setImgElement(img); // Store the image element for OCR extraction later
    }
    // Handle PDF preview and extraction if it's a PDF file
    else if (type === 'pdf' && file.type === 'application/pdf') {
      await handlePDFPreview(file); // Wait for PDF preview
    } else {
      alert('Unsupported file type.'); // Show an error if the file type is unsupported
    }
  };

  /**
   * Creates an image preview and prepares the image for OCR.
   * @param {File} file - The selected image file.
   * @returns {Promise<HTMLImageElement>} - A Promise that resolves with the Image element.
   */
  const handleImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          setImageData(reader.result); // Store the image as a Base64 string for preview
          resolve(img); // Return the image element
        };
      };
      reader.readAsDataURL(file); // Read the file as a Base64-encoded Data URL
    });
  };

  /**
   * Renders a preview of the first page of a PDF file.
   * @param {File} file - The selected PDF file.
   * @returns {Promise<HTMLCanvasElement>} - A Promise that resolves with a canvas element containing the PDF preview.
   */
  const handlePDFPreview = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const pdfData = new Uint8Array(reader.result); // Convert the PDF file to a Uint8Array

        // Use PDF.js to process the PDF file and extract the first page
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1); // Get the first page of the PDF

        // Set up the canvas for rendering the PDF page preview
        const viewport = page.getViewport({ scale: 1.5 }); // Scale the page for better resolution
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // Convert the canvas to a Base64-encoded image (PNG format)
        const imgData = canvas.toDataURL('image/png');
        setImageData(imgData); // Store the rendered image for preview

        resolve(canvas); // Return the canvas element for further use
      };
      reader.readAsArrayBuffer(file); // Read the PDF file as an ArrayBuffer for processing
    });
  };

  /**
   * Initiates text extraction from the selected file (image or PDF).
   * This function handles OCR for images and PDF text extraction.
   */
  const runExtractionFromFile = async () => {
    if (!selectedFile) return; // Exit if no file is selected

    setIsLoading(true); // Set loading state to true during extraction

    // Handle extraction for image files using Tesseract OCR
    if (selectedFile.type.startsWith('image/')) {
      try {
        const text_dict = await extractFromImage(imgElement, 'deu'); // Extract text from the image
        const receipt = processReceiptDict(text_dict); // Process the extracted text into a receipt object
        startUserConfirmationStoreAndDate(receipt); // Begin user confirmation of store and date
      } catch (err) {
        console.error(err, "TEST");
      }
    }
    // Handle extraction for PDF files using PDF.js
    else if (selectedFile.type   === 'application/pdf') {
      try {
        const text_dict = await extractFromPDF(selectedFile); // Extract text from the PDF
        const receipt = processReceiptDict(text_dict); // Process the extracted text into a receipt object
        startUserConfirmationStoreAndDate(receipt); // Begin user confirmation of store and date
      } catch (err) {
        console.error(err);
      }
    }

    setIsLoading(false); // Stop loading state after extraction is done
  };

  /**
   * Processes the receipt items after the user confirms the store and date.
   * @param {Object} receipt - The receipt object that has been processed and confirmed by the user.
   */
  const runReceiptItems = (receipt) => {
    setReceiptItems(processReceiptItems(receipt)); // Process the receipt items (store-specific logic)
  };

  /**
   * Initializes the user confirmation of store and date after text extraction.
   * @param {Object} receipt - The receipt object extracted from the file.
   */
  const startUserConfirmationStoreAndDate = (receipt) => {
    setIsUserConfirmedStoreDate(false); // Reset user confirmation state
    setStore(receipt.store); // Set the extracted store name for confirmation
    setDate(receipt.date); // Set the extracted date for confirmation
    setReceipt(receipt); // Store the receipt object
  };

  /**
   * Handles user confirmation of the store and date and processes the receipt items.
   */
  const handleUserConfirmationStoreAndDate = () => {
    receipt.store = store; // Update the store name based on user input
    receipt.date = date; // Update the date based on user input
    setIsUserConfirmedStoreDate(true); // Mark store and date as confirmed
    runReceiptItems(receipt); // Process receipt items
  };

  /**
   * Resets the file input and related states when a new file is selected.
   */
  const resetFile = () => {
    setSelectedFile(null); // Clear the selected file
    setImageData(null); // Clear the image data
    setIsPicExtractionConfirmed(false); // Reset the extraction confirmation state
    setImgElement(null); // Clear the image element
    setIsLoading(false); // Reset loading state
    setIsUserConfirmedStoreDate(false); // Reset user confirmation state
    setReceipt(null); // Clear the Receipt dict
    setReceiptItems(null) // Clear the ReceiptItem array
  };

  /**
   * Handles the camera icon click event and triggers the image file input.
   */
  const handleCamIconClick = () => {
    resetFile();
    imgInputRef.current.click(); // Trigger the image input programmatically
  };

  /**
   * Handles the file icon click event and triggers the PDF file input.
   */
  const handleFileIconClick = () => {
    resetFile();
    pdfInputRef.current.click(); // Trigger the PDF input programmatically
  };

  /**
   * Handles the confirmation click event after a file is selected.
   */
  const handleFileConfirmClick = () => {
    setIsPicExtractionConfirmed(true); // Confirm file selection
    runExtractionFromFile(); // Start the extraction process
  };

  return (
    <div className="App">
      <header className="App-header"></header>
      <div>
        {/* Hidden input for images */}
        <input
          type="file"
          accept="image/*"
          ref={imgInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e, 'image')}
        />
        {/* Hidden input for PDFs */}
        <input
          type="file"
          accept="application/pdf"
          ref={pdfInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e, 'pdf')}
        />

        {/* Camera Icon triggers the image input */}
        <Camera onClick={handleCamIconClick} className="camera-icon" />
        {/* File Icon triggers the PDF input */}
        <FileText onClick={handleFileIconClick} className="file-icon" />
        {/* Trash Icon resets the file selection */}
        <Trash2 onClick={resetFile} className="trash-icon" />
        <p>Click the camera icon to select an image, or the file icon to select a PDF.</p>

        {/* Display the selected file name */}
        {selectedFile && <p>{selectedFile.name}</p>}
      </div>

      {/* Display the preview */}
      {imageData && (
        <div className="preview_image">
          <img src={imageData} alt="Preview" />
        </div>
      )}

      {/* Display the confirm button (Check icon) only after file is selected */}
      {selectedFile && !isPicExtractionConfirmed && !isLoading && (
        <Check onClick={handleFileConfirmClick} className="check-file-icon" />
      )}

      {/* Display loading message when extraction is in progress */}
      {isLoading && (
        <LoaderCircle className="loader-circle-icon" />
      )}

      {/* Display store and date confirmation after file extraction */}
      {isPicExtractionConfirmed && !isLoading && !isUserConfirmedStoreDate && (
        <div>
          {/* Dropdown for selecting or confirming the store */}
          <select defaultValue={store} onChange={(e) => setStore(e.target.value)}>
            {possibleStores.map((storeOption, index) => (
              <option key={index} value={storeOption}>{storeOption}</option>
            ))}
          </select>

          {/* Input field for confirming or editing the date */}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          
          {/* Check icon to confirm store and date */}
          <Check onClick={handleUserConfirmationStoreAndDate} className="check-data-icon" />
        </div>
      )}
      <div>
        {receiptItems && receiptItems.length > 0 ? (
          receiptItems.map((item, index) => (
            <div key={index}>
              <p>{item.name}, {item.price}, {item.amount}</p>
            </div>
          ))
        ) : (
          <p>No items found</p>
        )}
      </div>
    </div>
  );
}

export default App;
