import React, { useState, useEffect } from 'react';
import styles from '../src/styles/Home.module.css';
import '../src/styles/globals.css';

interface Map {
  _id: string;
  name: string;
  description: string;
  likes: number;
  link?: string; // link is added dynamically
}

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
    const response = await fetch(`/api/challenge/${map._id}`);
    const challengeId: string = await response.text();
    const challengeLink = `https://www.geoguessr.com/challenge/${challengeId}`;
    window.open(challengeLink, '_blank');
  } catch (error) {
    console.error('Error fetching the challenge:', error);
  }
}

const Home: React.FC = () => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const response = await fetch('/api/maps');
        const data: Map[] = await response.json();

        // Format the fetched data
        const formattedMaps = data.map((map) => ({
          ...map,
          link: "" // Placeholder for the link, which will be set when opening a challenge
        }));

        // Order by likes or other criteria if needed
        formattedMaps.sort((a, b) => b.likes - a.likes);

        setMaps(formattedMaps);
      } catch (error) {
        console.error('Error fetching the map data:', error);
      }
    };

    fetchMaps();
  }, []);

  const filteredMaps = maps.filter((map) =>
    map.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>GeoGuessr Challenge Links</h1>

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
              <button onClick={() => openLink(map)}>Play</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
