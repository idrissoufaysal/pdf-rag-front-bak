'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Chat from './components/Chat';
import PdfUploader from './components/PdfUploader';

const PDFViewer = dynamic(() => import('./components/PDFViewer'), { ssr: false });

export default function Home() {
  const [pdfText, setPdfText] = useState<string>('');
  const [fileId, setFileId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File>();
  const [targetPage, setTargetPage] = useState<number | null>(null);

  const handleSourceClick = (page?: number) => {
    if (page && page > 0) setTargetPage(page);
  };

  return (
    <main className="App">
      <div className='container'>
        <div className="flex flex-col md:flex-row w-full h-full gap-8 px-4 md:p-0">
          <div className="relative w-full md:w-1/2">
            {pdfText ? 
              <PDFViewer file={selectedFile as File} targetPage={targetPage} />
              : <PdfUploader 
                  setPdfText={setPdfText} 
                  setSelectedFile={setSelectedFile}
                  setFileId={setFileId} 
                />
            }
          </div>
          <div className="h-full md:h-auto w-full md:w-1/2">
            <Chat pdfText={pdfText} fileId={fileId} onSourceClick={handleSourceClick} />
          </div>
        </div>
      </div>
    </main>
  );
}