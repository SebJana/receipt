import React, { useState, useRef } from 'react';
import './App.css';
import { Camera, Trash2, FileText, Check, LoaderCircle } from 'lucide-react';

import { extractFromImage, extractFromPDF } from './extractTextFromFile';
import { processReceiptDict, getPossibleStoreKeys } from './processReceipt';

import * as pdfjsLib from 'pdfjs-dist';
// Copied pdf.worker.mjs to public for direct access
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.mjs`;

function App() {
  const [selectedFile, setSelectedFile] = useState(null); // Store the file object
  const [imageData, setImageData] = useState(null); // Store the actual image data (Base64 string)
  const [imgElement, setImgElement] = useState(null); // Track image element for extraction
  const [store, setStore] = useState(null);
  const [date, setDate] = useState(null);

  const [isPicExtractionConfirmed, setIsPicExtractionConfirmed] = useState(false); // Track if the user has confirmed the file
  const [isUserConfirmedStoreDate, setisUserConfirmedStoreDate] = useState(false); // Track if the user has confirmed the store/date
  const [isLoading, setIsLoading] = useState(false); // Track loading state during extraction


  const imgInputRef = useRef(null); // Reference to trigger the image input programmatically
  const pdfInputRef = useRef(null); // Reference to trigger the PDF input programmatically

  const possibleStores = getPossibleStoreKeys(); // List of stores


  // Handles both image and PDF input, depending on file type
  const handleFileChange = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return; // Handle the case when no file is selected

    setSelectedFile(file);
    setIsPicExtractionConfirmed(false); // Reset confirmation state
    // Reset the file input value so the same file can be selected again
    event.target.value = null;

    if (type === 'image' && file.type.startsWith('image/')) {
      const img = await handleImagePreview(file); // Wait for image preview
      setImgElement(img); // Store image element for OCR extraction later
    } else if (type === 'pdf' && file.type === 'application/pdf') {
      await handlePDFPreview(file); // Wait for PDF preview
    } else {
      alert('Unsupported file type.');
    }
  };

  // Function to process image preview (synchronous)
  const handleImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          setImageData(reader.result); // Store image as Base64 string
          resolve(img); // Return the image via Promise
        };
      };
      reader.readAsDataURL(file); // Read file as Data URL (for Base64)
    });
  };

  // Function to process PDF preview (asynchronous)
  const handlePDFPreview = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const pdfData = new Uint8Array(reader.result); // Read PDF data as Uint8Array

        // Use PDF.js to process the PDF file
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1); // First page of the PDF file

        const viewport = page.getViewport({ scale: 1.5 }); // Scale the image for better resolution
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // Create Base64 string from the rendered PDF page
        const imgData = canvas.toDataURL('image/png');
        setImageData(imgData); // Store the rendered image of the first PDF page as Base64 string

        resolve(canvas); // Return the canvas via Promise
      };
      reader.readAsArrayBuffer(file); // Read PDF file as ArrayBuffer
    });
  };

  // Handles OCR or PDF text extraction depending on file type
  const runExtractionFromFile = async () => {
    if (!selectedFile) return; // Exit if no file is selected

    setIsLoading(true); // Start loading state

    if (selectedFile.type.startsWith('image/')) {
      try {
        const text_dict = await extractFromImage(imgElement, 'deu'); // Pass the image element for OCR
        const receipt = processReceiptDict(text_dict);
        userConfirmationStoreAndDate(receipt);
        console.log("test");      

      } catch (err) {
        console.error(err);
      }
    } else if (selectedFile.type === 'application/pdf') {
      try {
        const text_dict = await extractFromPDF(selectedFile); // Wait for the PDF text extraction to finish
        const receipt = processReceiptDict(text_dict);
        userConfirmationStoreAndDate(receipt);
        console.log("test");      

      } catch (err) {
        console.error(err);
      }
    }

    setIsLoading(false); // Stop loading state after extraction is done
  };

  const userConfirmationStoreAndDate = (receipt) => {
    setisUserConfirmedStoreDate(false);
    setStore(receipt.store);
    setDate(receipt.date);
  };

  const resetFile = () => {
    setSelectedFile(null);
    setImageData(null);
    setIsPicExtractionConfirmed(false); // Reset the confirmation state when a new file is selected
    setImgElement(null); // Reset image element
    setIsLoading(false); // Ensure loading state is reset
    setisUserConfirmedStoreDate(false);
  };

  const handleCamIconClick = () => {
    resetFile();
    imgInputRef.current.click(); // Trigger the image file input
  };

  const handleFileIconClick = () => {
    resetFile();
    pdfInputRef.current.click(); // Trigger the PDF file input
  };

  const handleFileConfirmClick = () => {
    setIsPicExtractionConfirmed(true); // Set confirmation state to true
    runExtractionFromFile(); // Start extraction process
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
        <FileText onClick={handleFileIconClick} className="file-icon" />
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
        <Check onClick={handleFileConfirmClick} className="check-icon" />
      )}

      {/* Display loading message when extraction is in progress */}
      {isLoading && (
        <LoaderCircle className="loader-circle-icon" />
      )}

      {isPicExtractionConfirmed && !isLoading && !isUserConfirmedStoreDate && (
        <div>
        {/* Dropdown for Store */}
        <select defaultValue={store}>
          {possibleStores.map((storeOption, index) => (
            <option key={index} value={storeOption}>{storeOption}</option>
          ))}
        </select>

        {/* Date input */}
        <input type="date" defaultValue={date} />
        
        {/* Check for userConfirmation */}
        <Check onClick={null} className="check-data-icon" />
        </div>
      )
      }
    </div>
  );
}

export default App;
