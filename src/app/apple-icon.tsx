import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 110,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #2f3181 45%, #4040ca 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '42px',
          fontWeight: 800,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          border: '4px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'inset 0 2px 8px rgba(255, 255, 255, 0.3)',
        }}
      >
        <span style={{ transform: 'translateY(-2px)' }}>B</span>
      </div>
    ),
    {
      ...size,
    }
  );
}
