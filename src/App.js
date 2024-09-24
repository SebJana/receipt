import React, { useState, useRef } from 'react';
import './App.css';
import { Camera, Trash2, FileText } from 'lucide-react';

import { extractFromImage, extractFromPDF } from './extractTextFromFile';
import { processReceiptDict } from './processReceipt';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);  // Store the file object
  const [imageData, setImageData] = useState(null);  // Store the actual image data (Base64 string)
  const [extractedText, setExtractedText] = useState('');  // Store the extracted text
  const imgInputRef = useRef(null);  // Reference to trigger the image input programmatically
  const pdfInputRef = useRef(null);  // Reference to trigger the PDF input programmatically

  // Handles both image and PDF input, depending on file type
  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;  // Handle the case when no file is selected

    setSelectedFile(file);

    if (type === 'image' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          setImageData(reader.result);  // Store the image as a Base64 string
          runExtractionFromFile(img, file);  // Process the img
        };
      };
      reader.readAsDataURL(file);  // Read the file as a data URL
    } else if (type === 'pdf' && file.type === 'application/pdf') {
      runExtractionFromFile(null, file);  // Process PDF file
    } else {
      alert('Unsupported file type.');
    }
  };

  // Handles OCR or PDF text extraction depending on file type
  const runExtractionFromFile = async (img, file) => {
    if (file.type.startsWith('image/')) {
      try {
        const text = await extractFromImage(img, 'deu');  // Call the OCR function with German language ('deu')
        setExtractedText(text);  // Set the OCR extracted text
      } catch (err) {
        console.error(err);
      }
    } else if (file.type === 'application/pdf') {
      try {
        const text_dict = await extractFromPDF(file);  // Wait for the PDF text extraction to finish
        const receipt = await processReceiptDict(text_dict);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setImageData(null);
    setExtractedText('');  // Clear the extracted text
  };

  const handleCamIconClick = () => {
    imgInputRef.current.click();  // Trigger the image file input
  };

  const handleFileIconClick = () => {
    pdfInputRef.current.click();  // Trigger the PDF file input
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
        {selectedFile && <p>Selected file: {selectedFile.name}</p>}
      </div>

      {/* Display the image preview (only for images) */}
      {imageData && (
        <div className="preview_image">
          <img src={imageData} alt="Preview" />
        </div>
      )}

      {/* Display the extracted text */}
      {extractedText && (
        <div className="extracted_text">
          <h3>Extracted Text:</h3>
          <p>{extractedText}</p>
        </div>
      )}
    </div>
  );
}

export default App;
