/* globals React */

// iOS 15+ style frame (390×844 logical pixels, scaled to 366×792 inner screen).
// Children receive a flex-column container that is position:relative and
// overflow:hidden — absolutely-positioned overlays (bottom sheets, modals) work
// naturally inside it. Each screen is responsible for its own scroll div.
function IosFrame({ children, dark = false }) {
  const bg = dark ? '#09090b' : '#fafafa';
  const fg = dark ? '#fafafa' : '#09090b';

  return (
    <div style={{
      display: 'inline-flex',
      background: '#1c1c1e',
      borderRadius: '54px',
      padding: '12px',
      boxShadow: '0 0 0 1px #3a3a3c, 0 40px 100px rgba(0,0,0,0.5)',
      position: 'relative',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* Mute switch */}
      <div style={{position:'absolute',left:'-3px',top:'130px',width:'3px',height:'30px',background:'#3a3a3c',borderRadius:'2px 0 0 2px'}} />
      {/* Volume up */}
      <div style={{position:'absolute',left:'-3px',top:'178px',width:'3px',height:'62px',background:'#3a3a3c',borderRadius:'2px 0 0 2px'}} />
      {/* Volume down */}
      <div style={{position:'absolute',left:'-3px',top:'256px',width:'3px',height:'62px',background:'#3a3a3c',borderRadius:'2px 0 0 2px'}} />
      {/* Power */}
      <div style={{position:'absolute',right:'-3px',top:'172px',width:'3px',height:'84px',background:'#3a3a3c',borderRadius:'0 2px 2px 0'}} />

      {/* Screen */}
      <div style={{
        width: '366px',
        height: '792px',
        background: bg,
        borderRadius: '42px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}>
        {/* Dynamic island */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '36px',
          background: '#000',
          borderRadius: '20px',
          zIndex: 60,
          pointerEvents: 'none',
        }} />

        {/* Status bar — built-in, do not replicate in screens */}
        <div style={{
          height: '58px',
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: '10px',
          paddingLeft: '28px',
          paddingRight: '24px',
          justifyContent: 'space-between',
          color: fg,
          fontSize: '15px',
          fontWeight: '600',
          flexShrink: 0,
        }}>
          <span>9:41</span>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            {/* Cellular */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill={fg}>
              <rect x="0"    y="8"   width="3" height="4"   rx="1"/>
              <rect x="4.5"  y="5.5" width="3" height="6.5" rx="1"/>
              <rect x="9"    y="3"   width="3" height="9"   rx="1"/>
              <rect x="13.5" y="0"   width="3" height="12"  rx="1"/>
            </svg>
            {/* WiFi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M0.8 4.2C3.1 1.9 5.8 0.75 8 0.75s4.9 1.15 7.2 3.45" stroke={fg} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M3.3 6.6C4.9 5.1 6.4 4.5 8 4.5s3.1.6 4.7 2.1"       stroke={fg} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5.8 9C6.6 8.3 7.3 8 8 8s1.4.3 2.2 1"               stroke={fg} strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="11.2" r="0.9" fill={fg}/>
            </svg>
            {/* Battery */}
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke={fg} strokeOpacity="0.35"/>
              <rect x="22"  y="3.5" width="2.5" height="5" rx="1.5" fill={fg} fillOpacity="0.4"/>
              <rect x="2"   y="2"   width="16.5" height="8" rx="2" fill={fg}/>
            </svg>
          </div>
        </div>

        {/* Content area — screens render inside here */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: bg,
        }}>
          <div style={{
            width: '134px',
            height: '5px',
            background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
            borderRadius: '3px',
          }} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IosFrame });
