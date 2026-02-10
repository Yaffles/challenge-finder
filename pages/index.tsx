import React, { useState, useEffect } from 'react';
import styles from '../src/styles/Home.module.css';
import Popup from '../components/Upload';
import Play from '@/components/Play';
import AccountPopup from '@/components/AccountPopup';
import Head from 'next/head';
import Script from 'next/script';

import { Map } from '@/types/map';

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const truncateDescription = (description: string, maxLength: number = 200): string => {
  if (description && description.length > maxLength) {
    return description.substring(0, maxLength) + '...';
  }
  return description;
};

const Home: React.FC = () => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showUploadPopup, setShowUploadPopup] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [loading, setLoading] = useState(true);


  const [showPlayPopup, setShowPlayPopup] = useState<boolean>(false);

  const togglePopup = () => {
    setShowUploadPopup(!showUploadPopup);
  };

  const openLink = async (map: Map) => {
    setSelectedMap(map);
    setShowPlayPopup(true);
  };

  const fetchMaps = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/maps?page=${page}`);
      const data: Map[] = await response.json();

      // Format the fetched data
      const formattedMaps = data.map((map) => ({
        ...map,
        link: '', // Placeholder for the link, which will be set when opening a challenge
      }));

      // Order by likes or other criteria if needed
      formattedMaps.sort((a, b) => b.likes - a.likes);

      // Add the new maps to the existing ones
      setMaps((prevMaps) => [...prevMaps, ...formattedMaps]);

      // Update showLoadMore based on the number of fetched maps
      if (formattedMaps.length < 10) {
        setShowLoadMore(false);
      } else {
        setShowLoadMore(true);
      }
    } catch (error) {
      console.error('Error fetching the map data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {


    fetchMaps(page);


  }, [page]);

  const handleSearch = async () => {
    if (!searchTerm) {
      setMaps([]);
      // Fetch all maps when search term is empty
      setShowLoadMore(true);
      setPage(1);
      fetchMaps(1);
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`/api/maps/search?query=${searchTerm}`);
      const data: Map[] = await response.json();
      setMaps(data);
      setShowLoadMore(false);
    } catch (error) {
      console.error('Error fetching the search results:', error);
    }
    setLoading(false);
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      handleSearch(); // Call the same function as the button press
    }
  };

  // const filteredMaps = maps.filter((map) =>
  //   map.name.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  return (
    <>
    <Head>
      <title>GeoGuessr Challenges</title>
      <meta name="description" content="Explore and play millions of free GeoGuessr challenges with Challenge Finder, Geochallenges. Discover a vast collection of challenges created by paid users, available to play for free. Start your adventure now!" />
      <meta name="keywords" content="GeoGuessr, free challenges, play GeoGuessr, GeoGuessr challenges, geography game" />
      <meta property="og:title" content="Free GeoGuessr Challenges - Play Thousands of Challenges on Geochallenges" />
      <meta property="og:description" content="Explore and play millions of free GeoGuessr challenges with geoChallenges. Discover a vast collection of challenges created by paid users, available to play for free. Start your adventure now!" />
      <meta property="og:site_name" content="Challenge Finder" />
      <meta property="og:image" content="./favicon.ico" />
      <meta property="og:url" content="https://geochallenges.me/" />
      <meta property="og:type" content="website" />
      <meta name="msvalidate.01" content="FD5AC4FC134FA5EA1D579D8F43EB90A6" />
      <link rel="canonical" href="https://geochallenges.me/" />
      <link rel="icon" href="./favicon.ico" type="image/x-icon" />
      <link rel="apple-touch-icon" href="./favicon.ico" />


    </Head>

    <main>
    <div className={styles.container}>
      <AccountPopup />
      <a href="https://github.com/yaffles/challenge-finder" target="_blank" className={styles.githubIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white">
              <path d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.11 3.3 9.43 7.87 10.97.58.1.78-.25.78-.55 0-.27-.01-.99-.01-1.94-3.22.7-3.9-1.55-3.9-1.55-.52-1.31-1.28-1.66-1.28-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.74 2.67 1.24 3.32.95.1-.74.4-1.24.73-1.53-2.57-.29-5.27-1.29-5.27-5.77 0-1.28.46-2.34 1.2-3.16-.12-.29-.52-1.46.12-3.04 0 0 .97-.31 3.18 1.2a11.07 11.07 0 0 1 2.9-.39c.98.01 1.96.13 2.88.38 2.2-1.5 3.17-1.2 3.17-1.2.65 1.58.25 2.75.12 3.04.75.82 1.2 1.87 1.2 3.16 0 4.5-2.71 5.47-5.3 5.75.42.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.18 0 .3.2.66.79.55C20.7 21.45 24 17.13 24 12.02 24 5.73 18.77.5 12 .5z"></path>
          </svg>
      </a>

      {/* --- SPONSOR SLOT --- */}
      <div className={styles.sponsorSlot}>
        <div className={styles.sponsorTitle}>Sponsor:</div>
        <img
          src="https://openguessr.com/img/openguessr.svg"
          alt="OpenGuessr Logo"
          className={styles.sponsorLogo}
        />
        <p className={styles.sponsorText}>
          &quot;Free alternative <br/> to GeoGuessr&quot;
        </p>
        <a
          href="https://openguessr.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.visitButton}
        >
          Visit
        </a>
      </div>

      <h1 className={styles.title}>GeoGuessr Challenge Links</h1>

      {/* --- MOBILE SLOT (<870px) --- */}
      <div className={styles.sponsorMobile}>
        <span>Sponsor:</span>
        <a href="https://openguessr.com" target="_blank" rel="noopener noreferrer">
          <img
            src="https://openguessr.com/img/openguessr.svg"
            alt="OpenGuessr Logo"
            className={styles.sponsorMobileLogo}
          />
        </a>
      </div>
      {/* ----------------------------- */}

      <div>
        <button className={styles.uploadButton} onClick={togglePopup}>
          Upload Challenge
        </button>
        <Popup show={showUploadPopup} onClose={togglePopup} />
      </div>

      <Play show={showPlayPopup} onClose={() => setShowPlayPopup(false)} map={selectedMap} />


      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search for a map..."
          className={styles.searchBar}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button className={styles.searchButton} onClick={handleSearch}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="10" cy="10" r="8" stroke="black" strokeWidth="2" fill="none" />
          <line x1="15" y1="15" x2="22" y2="22" stroke="black" strokeWidth="2" />
        </svg>

        </button>

      </div>



      <div className={styles.mapList}>
        {maps.map((map) => (
          <div
            key={map._id}
            className={styles.mapCard}
            style={{
              backgroundImage: `linear-gradient(163deg, ${getRandomColor()} 0%, #3700ff 100%)`,
            }}
          >
            <div className={styles.card2}>
              <a href={"https://www.geoguessr.com/maps/"+map._id}>{map.name}</a>
              <p className={styles.likes}>
                {Intl.NumberFormat('en-AU', { useGrouping: true }).format(
                  map.likes
                )}{' '}
                likes
              </p>
              <p>{truncateDescription(map.description)}</p>
              <button onClick={() => openLink(map)}>
                Play <span style={{ color: 'gold' }}>{map.challenges} challenges</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      {showLoadMore && !loading && (
        <div className={styles.loadMore}>
          <button onClick={() => setPage(page + 1)}>Load More</button>
        </div>
      )}
      { loading && <div className={styles.spinner}></div> }

    </div>
    </main>
    </>
  );
};

export default Home;
