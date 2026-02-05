import { safeFetch } from '../lib/apiConfig';

const VIDEO_API_BASE = "https://openspaceapi.vercel.app/api";
const FALLBACK_API_BASE = "https://opendataapi.vercel.app/api";
const SECONDARY_FALLBACK_API_BASE = "https://piewallahapi.vercel.app/api";

// Helper function to detect if a stream is live based on URL patterns
const isLiveStream = (streamUrl: string): boolean => {
  return streamUrl.includes('.m3u8') && 
         (streamUrl.includes('live') || 
          streamUrl.includes('stream') || 
          streamUrl.includes('realtime') ||
          streamUrl.includes('cloudfront') ||
          streamUrl.includes('Signature=') ||
          streamUrl.includes('Key-Pair-Id=') ||
          streamUrl.includes('Policy='));
};

// Helper function to detect CloudFront CDN
const isCloudFrontStream = (streamUrl: string, cdnType?: string): boolean => {
  return cdnType === 'Cloudfront' || 
         streamUrl.includes('cloudfront') || 
         streamUrl.includes('cloudfront.net');
};

export type VideoResponse = {
  success: boolean;
  source: string;
  powered_by: string;
  data: {
    url: string;
    signedUrl: string;
    urlType: string;
    videoContainer: string;
    isCmaf: boolean;
    cdnType: string;
    original_source: string;
  };
  stream_url: string;
  url_type: string;
  drm?: {
    kid: string;
    key: string;
  };
  timestamp: string;
};

// Fallback API response type (more complete structure)
type FallbackVideoResponse = {
  success: boolean;
  data: {
    url: string;
    signedUrl: string;
    urlType: string;
    scheduleInfo?: {
      startTime: string;
      endTime: string;
    };
    videoContainer: string;
    isCmaf: boolean;
    serverTime: number;
    cdnType: string;
  };
  stream_url: string;
  url_type: string;
  drm?: {
    kid: string;
    key: string;
  };
};

// Secondary fallback API response type (original PieWallah API with HLS support)
type SecondaryFallbackVideoResponse = {
  success: boolean;
  data: {
    url: string;
    signedUrl: string;
    urlType: string;
    scheduleInfo?: {
      startTime: string;
      endTime: string;
    };
    videoContainer: string;
    isCmaf: boolean;
    serverTime: number;
    cdnType: string;
  };
  stream_url: string;
  url_type: string;
  drm?: {
    kid: string;
    key: string;
  };
  hls_url?: string;
  branding?: {
    powered_by: string;
    access_to_use: string;
    website: string;
  };
};

export const fetchVideoUrl = async (
  batchId: string,
  subjectId: string,
  childId: string
): Promise<VideoResponse> => {
  let lastError: Error | null = null;
  let fallbackError: Error | null = null;
  let pieWallahResponse: SecondaryFallbackVideoResponse | null = null;

  // Try primary OpenSpace API first
  try {
    const url = `${VIDEO_API_BASE}/get-video-url-details?batchId=${batchId}&subjectId=${subjectId}&childId=${childId}`;
    
    const response = await fetch(url, {
      headers: {
        'Author': 'Satyam RojhaX'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid or missing authentication header');
      } else if (response.status === 400) {
        throw new Error('Bad Request: Missing required parameters');
      } else if (response.status === 404) {
        throw new Error('Video not found: Invalid batchId, subjectId, or childId');
      } else {
        throw new Error(`Failed to fetch video URL: ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Video API returned unsuccessful response');
    }
    
    // Check if DRM is available, but skip requirement for live streams and CloudFront CDN
    if (data.drm && data.drm.kid && data.drm.key) {
      return data as VideoResponse;
    } else if (isLiveStream(data.stream_url) || isCloudFrontStream(data.stream_url, data.data?.cdnType)) {
      console.log('Live stream or CloudFront CDN detected, proceeding without DRM');
      return data as VideoResponse;
    } else {
      console.warn('Primary API succeeded but no DRM keys available for non-live stream, trying fallbacks for HLS support');
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Unknown error');
    console.warn('Primary OpenSpace API failed, trying fallback:', lastError.message);
  }

  // Fallback to OpenData API
  try {
    const fallbackUrl = `${FALLBACK_API_BASE}/get-video-url?batchId=${batchId}&subjectId=${subjectId}&childId=${childId}`;
    
    const response = await fetch(fallbackUrl);
    
    if (!response.ok) {
      throw new Error(`Fallback API failed: ${response.status}`);
    }
    
    const data: FallbackVideoResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Fallback API returned unsuccessful response');
    }

    // Check if DRM is available, but skip requirement for live streams and CloudFront CDN
    if (data.drm && data.drm.kid && data.drm.key) {
      // Convert fallback response to match primary API structure
      const convertedResponse: VideoResponse = {
        success: true,
        source: 'OpenData',
        powered_by: 'Satyam RojhaX',
        data: {
          url: data.data.url,
          signedUrl: data.data.signedUrl,
          urlType: data.data.urlType || 'penpencilvdo',
          videoContainer: data.data.videoContainer || 'DASH',
          isCmaf: data.data.isCmaf || false,
          cdnType: data.data.cdnType || 'Gcp',
          original_source: 'OpenData'
        },
        stream_url: data.stream_url,
        url_type: data.url_type || 'penpencilvdo',
        drm: data.drm,
        timestamp: new Date().toISOString()
      };
      
      return convertedResponse;
    } else if (isLiveStream(data.stream_url) || isCloudFrontStream(data.stream_url, data.data?.cdnType)) {
      console.log('Live stream or CloudFront CDN detected in fallback, proceeding without DRM');
      const convertedResponse: VideoResponse = {
        success: true,
        source: 'OpenData',
        powered_by: 'Satyam RojhaX',
        data: {
          url: data.data.url,
          signedUrl: data.data.signedUrl,
          urlType: data.data.urlType || 'penpencilvdo',
          videoContainer: data.data.videoContainer || 'DASH',
          isCmaf: data.data.isCmaf || false,
          cdnType: data.data.cdnType || 'Gcp',
          original_source: 'OpenData'
        },
        stream_url: data.stream_url,
        url_type: data.url_type || 'penpencilvdo',
        drm: undefined, // No DRM for live streams or CloudFront
        timestamp: new Date().toISOString()
      };
      
      return convertedResponse;
    } else {
      console.warn('First fallback API succeeded but no DRM keys available for non-live stream, trying secondary fallback');
    }
  } catch (error) {
    fallbackError = error instanceof Error ? error : new Error('Unknown error');
    console.warn('First fallback API failed, trying secondary fallback:', fallbackError.message);
  }

  // Secondary fallback to original PieWallah API
  try {
    const secondaryFallbackUrl = `${SECONDARY_FALLBACK_API_BASE}/video?batchId=${batchId}&subjectId=${subjectId}&childId=${childId}`;
    
    const response = await fetch(secondaryFallbackUrl);
    
    if (!response.ok) {
      throw new Error(`Secondary fallback API failed: ${response.status}`);
    }
    
    const data: SecondaryFallbackVideoResponse = await response.json();
    pieWallahResponse = data;
    
    if (!data.success) {
      throw new Error('Secondary fallback API returned unsuccessful response');
    }

    // Check if DRM is available, but skip requirement for live streams and CloudFront CDN
    if (data.drm && data.drm.kid && data.drm.key) {
      // Convert secondary fallback response to match primary API structure
      const convertedResponse: VideoResponse = {
        success: true,
        source: 'PieWallah',
        powered_by: data.branding?.powered_by || 'Satyam RojhaX',
        data: {
          url: data.data.url,
          signedUrl: data.data.signedUrl,
          urlType: data.data.urlType || 'penpencilvdo',
          videoContainer: data.data.videoContainer || 'DASH',
          isCmaf: data.data.isCmaf || false,
          cdnType: data.data.cdnType || 'Gcp',
          original_source: 'PieWallah'
        },
        stream_url: data.stream_url,
        url_type: data.url_type || 'penpencilvdo',
        drm: data.drm,
        timestamp: new Date().toISOString()
      };
      
      return convertedResponse;
    } else if (isLiveStream(data.stream_url) || isCloudFrontStream(data.stream_url, data.data?.cdnType)) {
      console.log('Live stream or CloudFront CDN detected in secondary fallback, proceeding without DRM');
      const convertedResponse: VideoResponse = {
        success: true,
        source: 'PieWallah',
        powered_by: data.branding?.powered_by || 'Satyam RojhaX',
        data: {
          url: data.data.url,
          signedUrl: data.data.signedUrl,
          urlType: data.data.urlType || 'penpencilvdo',
          videoContainer: data.data.videoContainer || 'DASH',
          isCmaf: data.data.isCmaf || false,
          cdnType: data.data.cdnType || 'Gcp',
          original_source: 'PieWallah'
        },
        stream_url: data.stream_url,
        url_type: data.url_type || 'penpencilvdo',
        drm: undefined, // No DRM for live streams or CloudFront
        timestamp: new Date().toISOString()
      };
      
      return convertedResponse;
    } else if (data.hls_url) {
      // Use HLS fallback when DRM is not available
      console.warn('No DRM keys available for non-live stream, using HLS fallback from PieWallah API');
      const hlsResponse: VideoResponse = {
        success: true,
        source: 'PieWallah-HLS',
        powered_by: data.branding?.powered_by || 'SATYAM ROJHAX',
        data: {
          url: data.hls_url,
          signedUrl: '',
          urlType: 'hls',
          videoContainer: 'HLS',
          isCmaf: false,
          cdnType: 'HLS',
          original_source: 'PieWallah-HLS'
        },
        stream_url: data.hls_url,
        url_type: 'hls',
        drm: undefined, // No DRM for HLS
        timestamp: new Date().toISOString()
      };
      
      return hlsResponse;
    } else {
      throw new Error('No DRM keys or HLS URL available from PieWallah API for non-live stream');
    }
  } catch (secondaryFallbackError) {
    // If all APIs fail, throw comprehensive error
    const primaryError = lastError?.message || 'Unknown primary error';
    const firstFallbackError = fallbackError?.message || 'Unknown fallback error';
    const secondFallbackError = secondaryFallbackError instanceof Error ? secondaryFallbackError.message : 'Unknown secondary fallback error';
    
    throw new Error(`All APIs failed. Primary: ${primaryError}, First Fallback: ${firstFallbackError}, Second Fallback: ${secondFallbackError}`);
  }
};

export const getVideoStreamUrl = async (
  batchId: string,
  subjectId: string,
  childId: string
): Promise<string> => {
  const videoData = await fetchVideoUrl(batchId, subjectId, childId);
  return videoData.stream_url;
};

export const getVideoData = async (
  batchId: string,
  subjectId: string,
  childId: string
): Promise<{
  stream_url: string;
  drm?: {
    kid: string;
    key: string;
  };
  cdnType?: string;
  urlType?: string;
  videoContainer?: string;
  isCmaf?: boolean;
  original_source?: string;
}> => {
  const videoData = await fetchVideoUrl(batchId, subjectId, childId);
  
  return {
    stream_url: videoData.stream_url,
    drm: videoData.drm ? {
      kid: videoData.drm.kid,
      key: videoData.drm.key
    } : undefined,
    cdnType: videoData.data?.cdnType,
    urlType: videoData.url_type,
    videoContainer: videoData.data?.videoContainer,
    isCmaf: videoData.data?.isCmaf,
    original_source: videoData.data?.original_source
  };
};

export const checkApiHealth = async (): Promise<{
  success: boolean;
  message: string;
  version: string;
  source: string;
  powered_by: string;
  timestamp: string;
}> => {
  try {
    const response = await fetch(`${VIDEO_API_BASE.replace('/api', '')}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

