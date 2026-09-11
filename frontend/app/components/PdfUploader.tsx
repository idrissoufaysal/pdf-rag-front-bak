import React, { useState } from 'react';
import styles from '../styles/PdfUploader.module.css';
import { MdCloudUpload } from "react-icons/md";
import { uploadAndVectorizePDF } from '../utils/fetchRAGResponse';

type Props = {
  setPdfText: React.Dispatch<React.SetStateAction<string>>;
  setFileId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | undefined>>;
};

const PdfUploader: React.FC<Props> = ({ setPdfText, setFileId, setSelectedFile }) => {
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setError('');
    setStatus('Envoi et indexation du fichier en cours...');

    try {
      const result = await uploadAndVectorizePDF(file);

      if (result.success) {
        setStatus(`Fichier indexé avec succès (${result.chunksAdded} chunks).`);
        setFileId(result.fileId);
        setPdfText(file.name);
      } else {
        setError(result.message);
        setStatus('');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue lors de l\'upload.');
      setStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleButtonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  return (
    <>
      <div
        className={`${styles.fileUploadBtnContainer} ${isDragOver ? styles.dragOver : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        style={isLoading ? { opacity: 0.6, pointerEvents: 'none' } : {}}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <div className="text-blue-600 text-sm font-medium">{status || 'Traitement en cours...'}</div>
          </div>
        ) : (
          <>
            <input
              type="file"
              id="file-upload"
              onChange={handleButtonUpload}
              accept="application/pdf"
              hidden
              disabled={isLoading}
            />
            <label htmlFor="file-upload" className={`${styles.label} ${styles.mainBtn} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
              style={isLoading ? { cursor: 'not-allowed' } : {}}>
              <MdCloudUpload /> Ajouter un document
            </label>
          </>
        )}
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {!error && status && !isLoading && <p className="text-green-600 text-sm mt-2">{status}</p>}
    </>
  );
};

export default PdfUploader;
