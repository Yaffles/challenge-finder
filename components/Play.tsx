import React, { useEffect, useRef, useState } from 'react';
import styles from '../src/styles/Play.module.css';
import { Map } from '@/types/map';

interface PopupProps {
  show: boolean;
  onClose: () => void;
  map: Map | null;
}

const timeLimits = [0, 10, 30, 60, 120, 180, 240, 300, 360]; // Corresponding to Any, 10s, 30s, 1min, 2min, 3min, 4min, Infinite


const Popup: React.FC<PopupProps> = ({ show, onClose, map }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [timeLimitIndex, setTimeLimitIndex] = useState<number>(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  if (!show || !map) {
    return null;
  }

  const openLink = async (challengeId: string) => {
    try {
      const newWindow = window.open('', '_blank');
      const challengeLink = `https://www.geoguessr.com/challenge/${challengeId}`;
      if (newWindow) {
        newWindow.location.href = challengeLink;
      } else {
        window.location.href = challengeLink; // Fallback if the new window is blocked
      }
    } catch (error) {
      console.error('Error fetching the challenge:', error);
    }
  };

  const handlePlay = async (type?: string) => {
    let url = `/api/challenge/${map._id}`;
    if (type) {
      url += `?type=${type}`;
    }
    url += `&timeLimit=${timeLimits[timeLimitIndex]}`;
    const response = await fetch(url);
    if (response.status == 404) {
      alert('No challenges found for this setting');
      return
    };
    const challengeId: string = await response.text();
    openLink(challengeId);
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTimeLimitIndex(Number(event.target.value));
  };

  const formatTimeLimit = (limit: number) => {
    switch (limit) {
      case 0: return 'Any';
      case 10: return '10s';
      case 30: return '30s';
      case 60: return '1min';
      case 120: return '2min';
      case 180: return '3min';
      case 240: return '4min';
      case 300: return '5min';
      default: return 'Infinite';
    }
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.mapColor} ref={popupRef}>
        <div className={styles.popupContent}>
          <button className={styles.closeButton} onClick={onClose}>Close</button>
          <a href={"https://www.geoguessr.com/map/" + map._id}>{map.name}</a>
          <p className={styles.likes}>
            {Intl.NumberFormat('en-AU', { useGrouping: true }).format(
              map.likes
            )}{' '}
            likes
          </p>
          <p>{map.description}</p>
          <div>
            <div>
              <input
                type="range"
                min="0"
                max={(timeLimits.length - 1).toString()}
                step="1"
                value={timeLimitIndex}
                onChange={handleSliderChange}
                className={styles.slider}
              />
              <label className={styles.sliderLabel}>
                Time Limit: <span className={styles.gold}>{formatTimeLimit(timeLimits[timeLimitIndex])}</span>
              </label>
            </div>
            <div className={styles.buttonContainer}>
              <button className={styles.button} style={{backgroundColor: '#4338ca', color: "white"}}  onClick={() => handlePlay()}>Any</button>
              <button className={styles.button} onClick={() => handlePlay('m')}>Move</button>
              <button className={styles.button} onClick={() => handlePlay('nm')}>No Move</button>
              <button className={styles.button} onClick={() => handlePlay('nmpz')}>NMPZ</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
