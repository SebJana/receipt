import React, { useState, useRef } from 'react';
import './App.css';
import { Camera, Trash2, FileText } from 'lucide-react';
import { extractFromImage, extractFromPDF } from './extractTextFromFile';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);  // Store the file object
  const [imageData, setImageData] = useState(null);  // Store the actual image data (Base64 string)
  const [extractedText, setExtractedText] = useState('');  // Store the extracted text
  const [loading, setLoading] = useState(false);  // Loading state for the OCR process
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
          runExtractionFromFile(img, file);  // Pass the image to the OCR function
        };
      };
      reader.readAsDataURL(file);  // Read the file as a data URL
    } else if (type === 'pdf' && file.type === 'application/pdf') {
      runExtractionFromFile(null, file);  // Process PDF file directly
    } else {
      alert('Unsupported file type.');
    }
  };

  // Handles OCR or PDF text extraction depending on file type
  const runExtractionFromFile = (img, file) => {
    setLoading(true);  // Start the loading state

    if (file.type.startsWith('image/')) {
      extractFromImage(img, 'deu')  // Call the OCR function with German language ('deu')
        .then((text) => {
          setExtractedText(text);  // Set the OCR extracted text
          setLoading(false);  // Stop loading
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);  // Stop loading on error
        });
    } else if (file.type === 'application/pdf') {
      extractFromPDF(file)
      setExtractedText(extractFromPDF(file));  // Set the text from the first page of the PDF
      setLoading(false);
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

      {/* Display loading message while extraction is processing */}
      {loading && <p>Processing file for text...</p>}

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
