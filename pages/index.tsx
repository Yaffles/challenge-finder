import React, { useState, useEffect } from 'react';
import styles from '../src/styles/Home.module.css';
import '../src/styles/globals.css';
import Popup from '../components/Upload';
import { Map } from '@/types/map';


const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const openLink = async (map: Map) => {
  try {
    const newWindow = window.open('', '_blank');
    const response = await fetch(`/api/challenge/${map._id}`);
    const challengeId: string = await response.text();
    const challengeLink = `https://www.geoguessr.com/challenge/${challengeId}`;
    if (newWindow) {
      newWindow.location.href = challengeLink;
    }
    else {
      window.location.href = challengeLink; // Fallback if the new window is blocked
    }
  } catch (error) {
    console.error('Error fetching the challenge:', error);
  }
}

const Home: React.FC = () => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [showLoadMore, setShowLoadMore] = useState(true);


  const togglePopup = () => {
    setShowPopup(!showPopup)
  };

  useEffect(() => {
    const fetchMaps = async (page: number) => {
      try {
        const response = await fetch(`/api/maps?page=${page}`);
        const data: Map[] = await response.json();

        // Format the fetched data
        const formattedMaps = data.map((map) => ({
          ...map,
          link: "" // Placeholder for the link, which will be set when opening a challenge
        }));

        // Order by likes or other criteria if needed
        formattedMaps.sort((a, b) => b.likes - a.likes);

        // add the new maps to the existing ones
        setMaps([...maps, ...formattedMaps]);
      } catch (error) {
        console.error('Error fetching the map data:', error);
      }
    };

    fetchMaps(1);
    if (maps.length < 10) {
      setShowLoadMore(false);
    }
    else {
      setShowLoadMore(true);
    }
  }, []);

  const filteredMaps = maps.filter((map) =>
    map.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>GeoGuessr Challenge Links</h1>
      <div>
        <button className={styles.uploadButton} onClick={togglePopup}>Upload Challenge</button>
        <Popup show={showPopup} onClose={togglePopup} />
      </div>

      <input
        type="text"
        placeholder="Search for a map..."
        className={styles.searchBar}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className={styles.mapList}>
        {filteredMaps.map((map) => (
          <div key={map._id} className={styles.mapCard} style={{backgroundImage: `linear-gradient(163deg, ${getRandomColor()} 0%, #3700ff 100%)`}}>
            <div className={styles.card2}>
              <h2>{map.name}</h2>
              <p className={styles.likes}>{Intl.NumberFormat('en-AU', { useGrouping: true }).format(map.likes)} likes</p>
              <p>{map.description}</p>
              <button onClick={() => openLink(map)}>Play <span style={{"color": "gold"}}>{map.challenges} challenges</span></button>
            </div>
          </div>
        ))}
      </div>
      {showLoadMore && (
        <div className={styles.loadMore}>
        <button onClick={() => setPage(page + 1)}>Load More</button>
      </div>
      )}
    </div>
  );
}

export default Home;
