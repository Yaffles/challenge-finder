import React, { useState, useEffect } from 'react';
import styles from '../src/styles/Home.module.css';
import '../src/styles/globals.css';
import Popup from '../components/Upload';
import Play from '@/components/Play';

import { Map } from '@/types/map';
import { Analytics } from "@vercel/analytics/react"

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
    <div className={styles.container}>
      <h1 className={styles.title}>GeoGuessr Challenge Links</h1>
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
              <a href={"https://www.geoguessr.com/map/"+map._id}>{map.name}</a>
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
      <Analytics />
    </div>
  );
};

export default Home;
