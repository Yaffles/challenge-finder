import { GetServerSideProps } from 'next';
import cookie from 'cookie';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import styles from '../src/styles/Admin.module.css';

export interface Env {
  DB: D1Database;
}

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
            {mapLog.mapData.name} (Map ID: {mapLog._id}, Logs: {mapLog.count}, Logs/challenges: {(mapLog.mapData.challenges > 0 ? mapLog.count * 100 / mapLog.mapData.challenges : 0).toFixed(1)}% Likes/challenges: {(mapLog.mapData.challenges > 0 ? mapLog.mapData.likes  / mapLog.mapData.challenges : 0).toFixed(1)})
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

  // --- Start SQL Conversion ---
  let env_db_instance: D1Database;
  try {
     const { env } = await getCloudflareContext() as { env: Env };
     if (!env || !env.DB) throw new Error("DB binding missing");
     env_db_instance = env.DB;
  } catch(e) {
      console.error("Failed to get DB context", e);
      // Fallback or error if DB is critical
      return { props: { isAdmin: true, logsData: [], filter: null } };
  }

  const db = env_db_instance;
  const filter = query.filter || null;
  const sort = query.sort || null;
  const days = parseInt(query.days as string) || null;

  let timeFilterSql = "";
  const params: any[] = [];

  if (days) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    // SQLite datetime comparison string
    timeFilterSql = ` WHERE timestamp >= ?1`;
    params.push(pastDate.toISOString());
  }

  // 1. Fetch Logs
  // Since we don't have MongoDB aggregation, we fetch logs first.
  // For huge datasets, we'd do a Join or more complex query, but let's replicate the logic:
  // Group by mapId is requested.
  // SQL: SELECT * FROM log [WHERE ...] ORDER BY timestamp DESC

  const logsQuery = `SELECT * FROM log ${timeFilterSql} ORDER BY timestamp DESC`;
  const logsStmt = db.prepare(logsQuery).bind(...params);
  const { results: allLogs } = await logsStmt.all<any>(); // raw logs

  if (!allLogs) {
      return { props: { isAdmin: true, logsData: [], filter: null } };
  }

  // Group logs by mapId in JS (simulating the Mongo $group)
  const groupedLogs: Record<string, Log[]> = {};

  allLogs.forEach(log => {
      const mId = log.mapId;
      if (!groupedLogs[mId]) {
          groupedLogs[mId] = [];
      }

      // Convert SQLite 1/0 back to boolean if needed for the frontend types
      groupedLogs[mId].push({
          mapId: log.mapId,
          move: Boolean(log.move),
          pan: Boolean(log.pan),
          zoom: Boolean(log.zoom),
          timestamp: log.timestamp, // Assuming ISO string in DB
          success: Boolean(log.success), // Assuming stored as 1/0
          timeLimit: log.timeLimit
      });
  });

  // 2. Fetch Map Data for the keys
  const mapIds = Object.keys(groupedLogs);
  let mapsData: any[] = [];

  if (mapIds.length > 0) {
      // Create placeholders for IN clause: ?2, ?3, ?4... (since ?1 might be used above or we reset)
      // Actually, easier to just run separate binds or one simple loop if number of maps is small,
      // OR construct a single query with IN.
      // D1 bind limits? Let's use individual string construction carefully or simple IN (?,?,?)

      const placeholders = mapIds.map((_, i) => `?${i + 1}`).join(",");
      const mapsQuery = `SELECT * FROM maps WHERE id IN (${placeholders})`;
      const mapsStmt = db.prepare(mapsQuery).bind(...mapIds);
      const mapsResult = await mapsStmt.all<any>();
      mapsData = mapsResult.results || [];
  }

  // 3. Construct final logsData structure
  const logsData = mapIds.map(mapId => {
      const logs = groupedLogs[mapId];
      const count = logs.length;
      const mapData = mapsData.find(m => String(m.id) === mapId);

      return {
          _id: mapId,
          logs: logs,
          count: count,
          mapData: {
            name: mapData?.name || 'Unknown Map',
            description: mapData?.description || 'No description available',
            likes: mapData?.likes || 0,
            challenges: mapData?.challenges || 0,
          }
      };
  });

  // Sort logsData based on count (default from original code `$sort: { count: -1 }`)
  logsData.sort((a, b) => b.count - a.count);

  // Apply custom sorting
  if (sort === 'percentage') {
    logsData.sort((a, b) => {
        const valA = a.mapData.challenges > 0 ? (a.count * 100 / a.mapData.challenges) : 0;
        const valB = b.mapData.challenges > 0 ? (b.count * 100 / b.mapData.challenges) : 0;
        return valB - valA;
    });
  } else if (sort === "likes") { // likes per challenges
    logsData.sort((a, b) => {
        const valA = a.mapData.challenges > 0 ? (a.mapData.likes * 100 / a.mapData.challenges) : 0;
        const valB = b.mapData.challenges > 0 ? (b.mapData.likes * 100 / b.mapData.challenges) : 0;
        return valB - valA;
    });
  }

  return {
    props: {
      isAdmin: true,
      logsData: JSON.parse(JSON.stringify(logsData)), // Ensure serializable
      filter,
    },
  };
};
