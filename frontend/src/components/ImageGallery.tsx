import React, { useEffect, useState } from 'react';

export interface GalleryImage {
  id: string;
  url: string;
  altText?: string | null;
}

const ImageGallery: React.FC<{ images: GalleryImage[]; name: string }> = ({ images, name }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  if (images.length === 0) {
    return (
      <div
        role="img"
        aria-label={`No photos available for ${name}`}
        style={{
          minHeight: '240px',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: '#e5e7eb',
          color: '#4b5563',
          borderRadius: '0.5rem',
        }}
      >
        No photos available
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <section aria-label={`${name} photo gallery`}>
      <img
        src={activeImage.url}
        alt={activeImage.altText || `${name} photo ${activeIndex + 1}`}
        style={{ display: 'block', width: '100%', height: '360px', objectFit: 'cover', borderRadius: '0.5rem' }}
      />
      {images.length > 1 && (
        <div role="group" aria-label="Choose a photo" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginTop: '0.75rem' }}>
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === activeIndex}
              style={{
                flex: '0 0 84px',
                padding: 0,
                border: index === activeIndex ? '2px solid #2563eb' : '2px solid transparent',
                borderRadius: '0.25rem',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              <img
                src={image.url}
                alt=""
                style={{ display: 'block', width: '80px', height: '60px', objectFit: 'cover', borderRadius: '0.2rem' }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default ImageGallery;
