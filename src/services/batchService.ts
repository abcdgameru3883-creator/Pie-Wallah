import { getAnnouncementApiUrl, API_CONFIG, safeFetch } from '../lib/apiConfig';
import { getCommonHeaders, getAuthToken } from '@/lib/auth';
import { getCohortIdFromToken } from './cohortService';

const API_BASE = "https://api.penpencil.co/v3/batches";
const ANNOUNCEMENT_API = "/v1";

export type Teacher = {
  _id: string;
  firstName: string;
  lastName: string;
  imageId?: {
    _id: string;
    name: string;
    baseUrl: string;
    key: string;
    organization: string;
    createdAt: string;
  };
  experience?: string;
  qualification?: string;
  featuredLine?: string;
  email?: string;
  introductionVideoId?: string;
  introVideoThumbnail?: string;
  tagLines?: string[];
  subject?: string;
  profileId?: string;
};

export type Batch = {
  _id: string;
  name: string;
  batchName?: string;
  byName?: string;
  previewImage?: {
    _id: string;
    name: string;
    baseUrl: string;
    key: string;
  };
  image?: string;
  language?: string;
  startDate?: string;
  endDate?: string;
  class?: string;
  description?: string;
  shortDescription?: string;
  subjects?: any[];
  teacherIds?: Teacher[];
  status?: string;
  exam?: string[];
  mode?: string;
};

type BatchDetails = {
  _id: string;
  name: string;
  batchName?: string;
  byName?: string;
  previewImage?: {
    _id: string;
    name: string;
    baseUrl: string;
    key: string;
  };
  language?: string;
  startDate?: string;
  endDate?: string;
  class?: string;
  description?: string;
  shortDescription?: string;
  subjects?: any[];
  teacherIds?: Teacher[];
};

type Attachment = {
  _id: string;
  name: string;
  baseUrl: string;
  key: string;
  type: string;
  createdAt: string;
  status: string;
};

type Announcement = {
  _id: string;
  batchId: string;
  type: string;
  announcement: string;
  isSentNotification: boolean;
  isRealTime: boolean;
  createdBy: {
    createdAt: string;
    updatedAt: string;
  };
  attachment?: Attachment;
  createdAt: string;
  updatedAt?: string;
};

const internalFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  // Use the API configuration to get the correct URL
  const fullUrl = url.startsWith('http') ? url : getAnnouncementApiUrl(url);
  
  return safeFetch(fullUrl, {
    ...options,
    headers: {
      'Accept-Encoding': 'gzip, deflate, br', // Enable compression
      ...options?.headers,
    },
    cache: 'force-cache', // Use browser cache aggressively
    keepalive: true, // Keep connection alive for faster subsequent requests
  });
};

export const fetchBatchDetails = async (batchId: string): Promise<{ success: boolean, data: BatchDetails }> => {
  if (!batchId) throw new Error("Batch ID is required");
  
  try {
    const authToken = getAuthToken();
    const response = await internalFetch(`${API_BASE}/${batchId}/details?type=EXPLORE_LEAD`, {
      headers: {
        ...getCommonHeaders(),
        ...(authToken && { authorization: `Bearer ${authToken}` }),
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch batch details");
    }
    const json = await response.json();
    if (json && json.data) return json;
    throw new Error("Batch details not found");
  } catch (error) {
    throw error;
  }
};

export const fetchAnnouncements = async (batchId: string): Promise<Announcement[]> => {
  if (!batchId) return [];

  try {
    const authToken = getAuthToken();
    // Fetch multiple pages in parallel for better performance
    const pagesToFetch = 5; // Fetch first 5 pages in parallel
    const pagePromises = Array.from({ length: pagesToFetch }, (_, i) => 
      internalFetch(`${ANNOUNCEMENT_API}/batches/${batchId}/announcement?page=${i + 1}&limit=100`, {
        headers: {
          ...getCommonHeaders(),
          ...(authToken && { authorization: `Bearer ${authToken}` }),
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'omit'
      }).then(async (response) => {
        if (!response.ok) return [];
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return [];
        }

        const data = await response.json();
        
        // Handle the official API response structure
        let pageAnnouncements: Announcement[] = [];
        if (data && data.data && Array.isArray(data.data)) {
          pageAnnouncements = data.data;
        } else if (Array.isArray(data)) {
          pageAnnouncements = data;
        }
        
        return pageAnnouncements;
      }).catch(() => [])
    );

    // Wait for all pages to complete
    const allPagesResults = await Promise.all(pagePromises);
    
    // Combine all results and limit to 100 items
    const allAnnouncements = allPagesResults.flat();
    
    // Remove duplicates and limit to 100
    const uniqueAnnouncements = allAnnouncements.filter((announcement, index, self) => 
      index === self.findIndex((a) => a._id === announcement._id)
    ).slice(0, 100);

    return uniqueAnnouncements;
  } catch {
    return [];
  }
};

export const fetchBatchesChunked = async (page: number = 1, limit: number = 12): Promise<{
  batches: Batch[];
  total: number;
  hasMore: boolean;
  page: number;
}> => {
  try {
    // Get cohort ID dynamically from token
    const cohortId = await getCohortIdFromToken();
    if (!cohortId) {
      throw new Error("Cohort ID not found. Please ensure you are logged in.");
    }
    
    const authToken = getAuthToken();
    
    const response = await safeFetch(`https://api.penpencil.co/v3/cohort/${cohortId}/widgets/all-courses?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        ...getCommonHeaders(),
        ...(authToken && { authorization: `Bearer ${authToken}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch batches: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract batches from the new API structure
    const allItems = data.data || [];
    const batchItems = allItems.filter((item: any) => item.type === 'BATCH');
    const batches = batchItems.map((item: any) => ({
      _id: item.typeId,
      name: item.typeInfo.name,
      batchName: item.typeInfo.name,
      byName: item.typeInfo.byName,
      previewImage: item.previewImage,
      image: item.typeInfo.card?.files?.[0]?.url 
        ? item.typeInfo.card.files[0].url
        : item.previewImage?.baseUrl && item.previewImage?.key 
        ? `${item.previewImage.baseUrl}${item.previewImage.key}`
        : item.typeInfo.previewImageUrl 
        ? item.typeInfo.previewImageUrl.startsWith('http') 
          ? item.typeInfo.previewImageUrl
          : `https://static.pw.live/${item.typeInfo.previewImageUrl}`
        : undefined,
      language: item.typeInfo.language,
      startDate: item.typeInfo.startDate,
      endDate: item.typeInfo.endDate,
      class: item.typeInfo.class,
      description: item.typeInfo.description,
      shortDescription: item.typeInfo.shortDescription,
      subjects: item.typeInfo.subjects,
      teacherIds: item.typeInfo.teacherIds,
      status: item.typeInfo.status,
      exam: item.typeInfo.exam,
      mode: item.typeInfo.mode,
    }));
    
    const total = data.paginate?.totalCount || batches.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      batches,
      total,
      hasMore,
      page,
    };
  } catch (error) {
    return {
      batches: [],
      total: 0,
      hasMore: false,
      page,
    };
  }
};

export const fetchAllBatches = async (page: number = 1): Promise<{
  batches: Batch[];
  total: number;
  hasMore: boolean;
}> => {
  try {
    // Get cohort ID dynamically from token
    const cohortId = await getCohortIdFromToken();
    if (!cohortId) {
      throw new Error("Cohort ID not found. Please ensure you are logged in.");
    }
    
    const authToken = getAuthToken();
    
    // Fetch all pages until we get all batches
    let allBatches: Batch[] = [];
    let currentPage = page;
    let total = 0;
    let hasMore = true;
    
    while (hasMore) {
      const response = await safeFetch(`https://api.penpencil.co/v3/cohort/${cohortId}/widgets/all-courses?page=${currentPage}`, {
        method: 'GET',
        headers: {
          ...getCommonHeaders(),
          ...(authToken && { authorization: `Bearer ${authToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch batches: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract batches from the new API structure
      const allItems = data.data || [];
      const batchItems = allItems.filter((item: any) => item.type === 'BATCH');
      const batches = batchItems.map((item: any) => ({
        _id: item.typeId,
        name: item.typeInfo.name,
        batchName: item.typeInfo.name,
        byName: item.typeInfo.byName,
        previewImage: item.previewImage,
        image: item.typeInfo.card?.files?.[0]?.url 
          ? item.typeInfo.card.files[0].url
          : item.previewImage?.baseUrl && item.previewImage?.key 
          ? `${item.previewImage.baseUrl}${item.previewImage.key}`
          : item.typeInfo.previewImageUrl 
          ? item.typeInfo.previewImageUrl.startsWith('http') 
            ? item.typeInfo.previewImageUrl
            : `https://static.pw.live/${item.typeInfo.previewImageUrl}`
          : undefined,
        language: item.typeInfo.language,
        startDate: item.typeInfo.startDate,
        endDate: item.typeInfo.endDate,
        class: item.typeInfo.class,
        description: item.typeInfo.description,
        shortDescription: item.typeInfo.shortDescription,
        subjects: item.typeInfo.subjects,
        teacherIds: item.typeInfo.teacherIds,
        status: item.typeInfo.status,
        exam: item.typeInfo.exam,
        mode: item.typeInfo.mode,
      }));
      
      allBatches = [...allBatches, ...batches];
      total = data.paginate?.totalCount || allBatches.length;
      
      const limit = 20;
      const totalPages = Math.ceil(total / limit);
      hasMore = currentPage < totalPages;
      currentPage++;
    }

    return {
      batches: allBatches,
      total,
      hasMore: false, // All batches fetched
    };
  } catch (error) {
    return {
      batches: [],
      total: 0,
      hasMore: false,
    };
  }
};
