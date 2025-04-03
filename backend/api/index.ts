import { AutoRouter } from 'itty-router'
import { handleMapsRequest } from './maps';
import { handleChallengeRequest } from './challenge/[mapId]';
import { handleSearchRequest } from './maps/search';
import { handleUploadRequest } from './upload';


const router = AutoRouter()

router
  .get('/api/maps', handleMapsRequest)
  .get('/api/challenge/:id', handleChallengeRequest)
  .get('/api/maps/search', handleSearchRequest)
  .post('/api/upload', handleUploadRequest)
  .all('*', async () => new Response('Not Found', { status: 404 }));



export default router
