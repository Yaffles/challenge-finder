import React, { useState, useEffect } from 'react';
import styles from '../src/styles/Home.module.css';
import '../src/styles/globals.css';
import { randomInt } from 'crypto';

interface Map {
  id: string;
  name: string;
  description: string;
  link: string;
  likes: number;
  challenges: string[];
}

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const openLink = (map: Map) => {
  window.open(map.link, '_blank');
  map.link = "https://www.geoguessr.com/challenge/" + map.challenges[getRandomInt(0, map.challenges.length)]
}

const Home: React.FC = () => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const response = await fetch('/challengeData.json');
        const data: Record<string, Map> = await response.json();

        // Convert the fetched data into the desired format for the `maps` state
        const formattedMaps = Object.entries(data).map(([id, map]) => ({
          ...map,
          id: id,
          link: "https://www.geoguessr.com/challenge/" + map.challenges[getRandomInt(0, map.challenges.length)]
        }));
        // order by challenges
        formattedMaps.sort((a, b) =>  b.challenges.length - a.challenges.length);

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
          <div key={map.id} className={styles.mapCard} style={{"backgroundImage": `linear-gradient(163deg, ${getRandomColor()} 0%, #3700ff 100%)`}}>
            <div className={styles.card2}>
              <h2>{map.name}</h2>
              <p className={styles.likes}>{Intl.NumberFormat('en-AU', { useGrouping: true }).format(map.likes)} likes</p>
              <p>{map.description}</p>
              <button onClick={() => openLink(map)}>Play - <span className={styles.gold}>{map.challenges.length.toString() + " links"}</span></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

}

export default Home;
