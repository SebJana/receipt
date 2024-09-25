import React, { useState, useRef } from 'react';
import './App.css';
import { Camera, Trash2, FileText } from 'lucide-react';

import { extractFromImage, extractFromPDF } from './extractTextFromFile';
import { processReceiptDict } from './processReceipt';

import * as pdfjsLib from 'pdfjs-dist';
//Copied pdf.worker.mjs to public for direct access 
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.mjs`;

function App() {
  const [selectedFile, setSelectedFile] = useState(null);  // Store the file object
  const [imageData, setImageData] = useState(null);  // Store the actual image data (Base64 string)
  const imgInputRef = useRef(null);  // Reference to trigger the image input programmatically
  const pdfInputRef = useRef(null);  // Reference to trigger the PDF input programmatically

  // Handles both image and PDF input, depending on file type
  const handleFileChange = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;  //Handle the case when no file is selected
  
    setSelectedFile(file);
    //Reset the file input value so the same file can be selected again
    event.target.value = null;
  
    if (type === 'image' && file.type.startsWith('image/')) {
      const img = await handleImagePreview(file);  // Warte auf Bildverarbeitung
      runExtractionFromFile(img, file);  // Extraktion aus Bilddatei starten
    } else if (type === 'pdf' && file.type === 'application/pdf') {
      const canvas = await handlePDFPreview(file);  // Warte auf PDF-Verarbeitung
      runExtractionFromFile(canvas, file);  // Extraktion aus PDF (Canvas) starten
    } else {
      alert('Unsupported file type.');
    }
  };
  
  // Funktion zum Verarbeiten der Bildvorschau (synchron)
  const handleImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          setImageData(reader.result);  // Bild als Base64-String speichern
          resolve(img);  // Rückgabe des Bildes über Promise
        };
      };
      reader.readAsDataURL(file);  // Datei als Data URL lesen (für Base64)
    });
  };
  
  // Funktion zum Verarbeiten der PDF-Vorschau (asynchron)
  const handlePDFPreview = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const pdfData = new Uint8Array(reader.result);  // PDF-Daten als Uint8Array lesen
  
        // Verwende PDF.js zur Verarbeitung der PDF-Datei
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1);  // Erste Seite der PDF-Datei
  
        const viewport = page.getViewport({ scale: 1.5 });  // Skaliere das Bild für bessere Auflösung
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
  
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport: viewport }).promise;
  
        // Erzeuge Base64-String aus der gerenderten PDF-Seite
        const imgData = canvas.toDataURL('image/png');
        setImageData(imgData);  // Speichere das gerenderte Bild der ersten PDF-Seite als Base64-String
  
        resolve(canvas);  // Rückgabe des Canvas über Promise
      };
      reader.readAsArrayBuffer(file);  // PDF-Datei als ArrayBuffer lesen
    });
  };

  // Handles OCR or PDF text extraction depending on file type
  const runExtractionFromFile = async (img, file) => {
    if (file.type.startsWith('image/')) {
      try {
        const text_dict_img = await extractFromImage(img, 'deu');  // Call the OCR function with German language ('deu')
        const receipt_img = processReceiptDict(text_dict_img)
      } catch (err) {
        console.error(err);
      }
    } else if (file.type === 'application/pdf') {
      try {
        const text_dict_pdf = await extractFromPDF(file);  // Wait for the PDF text extraction to finish
        const receipt_pdf = processReceiptDict(text_dict_pdf);
        //Abort
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setImageData(null);
  };

  const handleCamIconClick = () => {
    resetFile();
    imgInputRef.current.click();  // Trigger the image file input
  };

  const handleFileIconClick = () => {
    resetFile();
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

      {/* Display the preview*/}
      {imageData && (
        <div className="preview_image">
          <img src={imageData} alt="Preview" />
        </div>
      )}
    </div>
  );
}

export default App;
