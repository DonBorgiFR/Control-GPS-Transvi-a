import { useState } from 'react';

interface FileUploaderProps {
  onDataLoaded: (files: FileList) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList) => {
    if (files.length === 0) {
      return;
    }
    onDataLoaded(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      style={{
        position: 'relative',
        cursor: 'pointer',
        height: '16rem',
        border: '2px dashed',
        borderColor: isDragging ? '#F5B800' : 'rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        transition: 'all 0.3s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: isDragging ? 'rgba(245,184,0,0.08)' : 'rgba(255,255,255,0.02)'
      }}
    >
      <div style={{ 
        padding: '1rem', 
        borderRadius: '50%', 
        background: 'rgba(27,61,140,0.3)', 
        marginBottom: '1rem',
        fontSize: '2rem'
      }}>
        📁
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'white', marginBottom: '0.5rem' }}>
        Subir archivos CSV
      </h3>
      <p style={{ color: '#94a3b8', textAlign: 'center', maxWidth: '24rem' }}>
        Arrastra uno o más reportes de actividad diaria de GPS para analizar tendencias temporales.
      </p>
      <input
        type="file"
        multiple
        accept=".csv"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        style={{ 
          position: 'absolute', 
          inset: 0, 
          opacity: 0, 
          cursor: 'pointer',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};