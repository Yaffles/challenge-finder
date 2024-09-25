import { GetServerSideProps } from 'next';
import cookie from 'cookie';
import { connectToDatabase } from '../src/lib/mongodb';
import styles from '../src/styles/Admin.module.css';
import '../src/styles/globals.css';

type Log = {
  mapId: string;
  move: boolean;
  pan: boolean;
  zoom: boolean;
  timestamp: string;
  success: boolean;
  timeLimit?: number;
};

type MapLog = {
  _id: string; // mapId
  logs: Log[];
  count: number;
  mapData: {
    name: string;
    description: string;
    likes: number;
    challenges: number;
  };
};

interface AdminPageProps {
  isAdmin: boolean;
  logsData: MapLog[];
  filter: string | null;
}

export default function AdminPage({ isAdmin, logsData, filter }: AdminPageProps) {
  if (!isAdmin) {
    return <div className={styles.unauthorized}>Unauthorized access</div>;
  }

  return (
    <div className={styles.adminPage}>
      <h1 className={styles.adminTitle}>Admin: Logs by Map</h1>
      {logsData.map((mapLog) => (
        <div key={mapLog._id} className={styles.logSection}>
          <h2 className={styles.logTitle}>
            {mapLog.mapData.name} (Map ID: {mapLog._id}, Logs: {mapLog.count}, Logs/challenges: {(mapLog.count * 100 / mapLog.mapData.challenges).toFixed(1)}% Likes/challenges: {(mapLog.mapData.likes  / mapLog.mapData.challenges).toFixed(1)})
          </h2>
          <p>{mapLog.mapData.description}</p>
          <p>Likes: {mapLog.mapData.likes}, Challenges: {mapLog.mapData.challenges}</p>

          {filter === 'unsuccessful' ? (
            <div className={styles.logBlock}>
              <h3 className={styles.logSubtitle}>Unsuccessful Logs</h3>
              <ul className={styles.logList}>
                {mapLog.logs
                  .filter((log) => !log.success)
                  .map((log, index) => (
                    <li key={index} className={styles.logItem}>
                      <strong>Time:</strong> {new Date(log.timestamp).toLocaleString('en-GB')} |
                      <strong> Move:</strong> {log.move ? 'Yes' : 'No'} |
                      <strong> Pan:</strong> {log.pan ? 'Yes' : 'No'} |
                      <strong> Zoom:</strong> {log.zoom ? 'Yes' : 'No'} |
                      <strong> Time Limit:</strong> {log.timeLimit ? log.timeLimit : 'None'}
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <>
              <div className={styles.logBlock}>
                <h3 className={styles.logSubtitle}>Unsuccessful Logs</h3>
                <ul className={styles.logList}>
                  {mapLog.logs
                    .filter((log) => !log.success)
                    .map((log, index) => (
                      <li key={index} className={styles.logItem}>
                        <strong>Time:</strong> {new Date(log.timestamp).toLocaleString('en-GB')} |
                        <strong> Move:</strong> {log.move ? 'Yes' : 'No'} |
                        <strong> Pan:</strong> {log.pan ? 'Yes' : 'No'} |
                        <strong> Zoom:</strong> {log.zoom ? 'Yes' : 'No'} |
                        <strong> Time Limit:</strong> {log.timeLimit ? log.timeLimit : 'None'}
                      </li>
                    ))}
                </ul>
              </div>
              <div className={styles.logBlock}>
                <h3 className={styles.logSubtitle}>Successful Logs</h3>
                <ul className={styles.logList}>
                  {mapLog.logs
                    .filter((log) => log.success)
                    .map((log, index) => (
                      <li key={index} className={styles.logItem}>
                        <strong>Time:</strong> {new Date(log.timestamp).toLocaleString('en-GB')} |
                        <strong> Move:</strong> {log.move ? 'Yes' : 'No'} |
                        <strong> Pan:</strong> {log.pan ? 'Yes' : 'No'} |
                        <strong> Zoom:</strong> {log.zoom ? 'Yes' : 'No'} |
                        <strong> Time Limit:</strong> {log.timeLimit ? log.timeLimit : 'None'}
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const adminKeyFromCookie = cookies.admin_key;

  const isAdmin = adminKeyFromCookie === process.env.ADMIN_KEY;
  if (!isAdmin) {
    return { props: { isAdmin: false, logsData: [], filter: null } };
  }

  const { db } = await connectToDatabase();
  const filter = query.filter || null;
  const sort = query.sort || null;
  const days = parseInt(query.days as string) || null;
  let dateFilter = {};
  if (days) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    dateFilter = { timestamp: { $gte: pastDate } };
  }



  const logs = await db.collection('log').aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$mapId',
        logs: { $push: '$$ROOT' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]).toArray();

  // Fetch the map data for each mapId in logs
  const mapIds = logs.map(log => log._id);
  const mapsData = await db.collection('maps').find({ _id: { $in: mapIds } }).toArray();



  const logsData = logs.map((log: any) => {
    const mapData = mapsData.find(map => map._id.toString() === log._id.toString());
    return {
      ...log,
      logs: log.logs.map((entry: any) => ({
        ...entry,
        _id: entry._id.toString(),
        timestamp: new Date(entry.timestamp).toISOString(),
      })),
      _id: log._id.toString(),
      mapData: {
        name: mapData?.name || 'Unknown Map',
        description: mapData?.description || 'No description available',
        likes: mapData?.likes || 0,
        challenges: mapData?.challenges || 0,
      }
    };
  });

  if (sort=='percentage') {
    logsData.sort((a, b) => (b.count * 100 / b.mapData.challenges) - (a.count * 100 / a.mapData.challenges) );
  }
  else if (sort=="likes") { // likes per challenges
    logsData.sort((a, b) => (b.mapData.likes * 100 / b.mapData.challenges) - (a.mapData.likes * 100 / a.mapData.challenges) );
  }

  return {
    props: {
      isAdmin: true,
      logsData,
      filter,
    },
  };
};
