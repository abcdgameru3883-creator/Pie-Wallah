import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, FileText, ClipboardList, AlertCircle, Eye, Download, Play, Clock, Lock, Paperclip, MoreVertical, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { fetchLectures, fetchNotes, fetchDPPNotes, fetchScheduleDetails } from "@/services/contentService";
import { getVideoStreamUrl } from "@/services/videoService";
import { canAccessBatchContent } from "@/lib/enrollmentUtils";
import { VideoPlayerSkeleton, ListSkeleton, CardSkeleton } from "@/components/ui/skeleton-loaders";
import { saveNavigationState, getNavigationState } from '@/lib/navigationState';

type Lecture = {
  _id: string;
  isFree?: boolean;
  status?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isDPPNotes?: boolean;
  dRoomId?: string;
  isBatchDoubtEnabled?: boolean;
  isChatEnabled?: boolean;
  isCommentDisabled?: boolean;
  isDPPVideos?: boolean;
  isDoubtEnabled?: boolean;
  isCopilotEnabled?: boolean;
  isCopilotDoubtAllocationEnabled?: boolean;
  isPathshala?: boolean;
  restrictedSchedule?: boolean;
  restrictedTime?: number;
  tags?: Array<{
    _id?: string;
    name?: string;
  }>;
  teachers?: string[];
  timeline?: any[];
  topic?: string;
  url?: string;
  urlType?: string;
  ytStreamKey?: string;
  ytStreamUrl?: string;
  lectureType?: string;
  whiteboardType?: string;
  videoDetails?: {
    _id: string;
    id: string;
    name: string;
    image: string;
    videoUrl: string;
    description: string;
    duration: string;
    status: string;
    types: string[];
    createdAt: string;
    drmProtected?: boolean;
    isZipDownloadEnabled?: boolean;
    findKey?: string;
    embedCode?: string;
    video_id?: string;
    vimeoId?: string;
    hls_url?: string;
  };
  isVideoLecture?: boolean;
  hasAttachment?: boolean;
  conversationId?: string;
  roomId?: string;
  isLocked?: boolean;
  isSimulatedLecture?: boolean;
  // Legacy fields for backward compatibility
  image?: string;
  createdAt?: string;
  title?: string;
  name?: string;
  fileName?: string;
  displayName?: string;
  findKey?: string;
};

type Note = {
  _id: string;
  isFree?: boolean;
  status?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isDPPNotes?: boolean;
  dRoomId?: string;
  isBatchDoubtEnabled?: boolean;
  isSimulatedLecture?: boolean;
  homeworkIds?: Array<{
    _id?: string;
    topic?: string;
    note?: string;
    actions?: string[];
    attachmentIds?: Array<{
      _id?: string;
      baseUrl?: string;
      key?: string;
      name?: string;
    }>;
  }>;
  // Legacy fields for backward compatibility
  topic?: string | {
    _id?: string;
    name?: string;
  };
  baseUrl?: string;
  key?: string;
  title?: string;
  name?: string;
  fileName?: string;
  displayName?: string;
};

type DPPContent = {
  _id: string;
  isFree?: boolean;
  status?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isDPPNotes?: boolean;
  dRoomId?: string;
  isBatchDoubtEnabled?: boolean;
  isSimulatedLecture?: boolean;
  homeworkIds?: Array<{
    _id?: string;
    topic?: string;
    note?: string;
    actions?: string[];
    attachmentIds?: Array<{
      _id?: string;
      baseUrl?: string;
      key?: string;
      name?: string;
    }>;
  }>;
  // Legacy fields for backward compatibility
  topic?: string | {
    _id?: string;
    name?: string;
  };
  baseUrl?: string;
  key?: string;
  title?: string;
  name?: string;
  fileName?: string;
  displayName?: string;
};

type ContentResponse = {
  success: boolean;
  data: Lecture[] | Note[] | DPPContent[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  paginate?: {
    limit: number;
    totalCount: number;
    videosCount?: number;
  };
};

type LocationState = {
  subjectName?: string;
  batchName?: string;
  topicName?: string;
  subjectId?: string;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};


const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getContentName = (content: Lecture | Note | DPPContent): string => {
  // For notes specifically, check homeworkIds first (API structure for notes)
  const note = content as Note;
  if (note.homeworkIds && note.homeworkIds.length > 0) {
    const homework = note.homeworkIds[0];
    if (homework.topic && homework.topic.trim() !== "") return homework.topic;
  }

  // Then check topic field
  if (note.topic) {
    if (typeof note.topic === "string") {
      if (note.topic.trim() !== "") return note.topic;
    } else if (typeof note.topic === "object" && note.topic.name) {
      if (note.topic.name.trim() !== "") return note.topic.name;
    }
  }

  // Check other fields
  if (content.displayName && content.displayName.trim() !== "") return content.displayName;
  if (content.fileName && content.fileName.trim() !== "") return content.fileName;
  if (content.title && content.title.trim() !== "") return content.title;
  if (content.name && content.name.trim() !== "") return content.name;

  // Last resort fallback
  return "Untitled";
};

const getThumbnailUrl = (content: any): string => {
  // try common patterns
  if (!content) return "";
  // direct string URL
  if (typeof content.image === "string") return content.image;
  // common thumbnail fields
  if (typeof content.thumbnail === "string") return content.thumbnail;
  if (typeof content.thumbnailUrl === "string") return content.thumbnailUrl;
  if (typeof content.poster === "string") return content.poster;
  if (typeof content.thumb === "string") return content.thumb;
  if (typeof content.videoThumbnail === "string") return content.videoThumbnail;
  if (content.thumbnails && typeof content.thumbnails === "object") {
    // try common sizes
    return content.thumbnails.default?.url || content.thumbnails.small?.url || content.thumbnails.medium?.url || content.thumbnails.large?.url || "";
  }
  // image object with baseUrl + key
  if (content.image && content.image.baseUrl && content.image.key) return `${content.image.baseUrl}${content.image.key}`;
  if (content.imageId && content.imageId.baseUrl && content.imageId.key) return `${content.imageId.baseUrl}${content.imageId.key}`;
  if (content.previewImage && content.previewImage.baseUrl && content.previewImage.key) return `${content.previewImage.baseUrl}${content.previewImage.key}`;
  // nested video object
  if (content.video && typeof content.video === "object") {
    if (typeof content.video.thumbnail === "string") return content.video.thumbnail;
    if (content.video.previewImage && content.video.previewImage.baseUrl && content.video.previewImage.key) return `${content.video.previewImage.baseUrl}${content.video.previewImage.key}`;
  }
  // videoDetails (some APIs use videoDetails for nested metadata)
  if (content.videoDetails && typeof content.videoDetails === "object") {
    if (typeof content.videoDetails.image === "string") return content.videoDetails.image;
    if (content.videoDetails.image && content.videoDetails.image.baseUrl && content.videoDetails.image.key) return `${content.videoDetails.image.baseUrl}${content.videoDetails.image.key}`;
    if (content.videoDetails.previewImage && content.videoDetails.previewImage.baseUrl && content.videoDetails.previewImage.key) return `${content.videoDetails.previewImage.baseUrl}${content.videoDetails.previewImage.key}`;
    if (content.videoDetails.thumbnail) return content.videoDetails.thumbnail;
  }
  // fallback to baseUrl+key (notes might have baseUrl/key)
  if (content.baseUrl && content.key) return `${content.baseUrl}${content.key}`;
  // no thumbnail available
  return "";
};

const getContentDate = (content: any): string | undefined => {
  return content.createdAt || content.date || content.created_at || undefined;
};

const getNoteFileUrl = (content: Note | DPPContent): string => {
  // Check homeworkIds first (actual API structure used by notes and DPP)
  const anyContent: any = content;
  if (anyContent.homeworkIds && anyContent.homeworkIds.length > 0) {
    const homework = anyContent.homeworkIds[0];
    if (homework.attachmentIds && homework.attachmentIds.length > 0) {
      const attachment = homework.attachmentIds[0];
      const base = attachment.baseUrl || "";
      const key = attachment.key || attachment.name || "";
      if (base && key) {
        // Check if key is already a full URL
        return key.startsWith('http') ? key : `${base}${key}`;
      }
    }
  }
  // Fallback to top-level baseUrl + key
  if ((content as any).baseUrl && (content as any).key) {
    const base = (content as any).baseUrl;
    const key = (content as any).key;
    // Check if key is already a full URL
    return key.startsWith('http') ? key : `${base}${key}`;
  }
  return "";
};

// Generic helper to retrieve file URL for notes or DPP content
const getFileUrl = (content: any): string => {
  // Reuse existing note/DPP logic
  const url = getNoteFileUrl(content);
  if (url) return url;
  // Additional generic checks
  if (content && typeof content === "object") {
    const base = content.baseUrl || "";
    const key = content.key || content.name || "";
    if (base && key) {
      // Check if key is already a full URL
      return key.startsWith('http') ? key : `${base}${key}`;
    }
  }
  return "";
};

const downloadFile = async (url: string, filename: string) => {
  try {
    // Fetch the file as a blob
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary link element for download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    link.style.display = 'none';

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Fallback to opening in new tab if download fails
    window.open(url, "_blank", "noopener,noreferrer");
  }
};


const getContentDuration = (content: any): number | undefined => {
  // Check videoDetails.duration first (for API endpoints with nested videoDetails)
  if (content.videoDetails && typeof content.videoDetails === "object") {
    if (typeof content.videoDetails.duration === "number") return content.videoDetails.duration;
    if (typeof content.videoDetails.duration === "string") {
      const s = content.videoDetails.duration.trim();
      if (/^\d+$/.test(s)) return parseInt(s, 10);
      const parts = s.split(":").map((p) => parseInt(p, 10));
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) return parts[0] * 60 + parts[1];
    }
  }
  // Fallback to other duration fields
  const val = content.duration || content.videoDuration || content.length || content.durationSeconds || undefined;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // try to parse hh:mm:ss or mm:ss or seconds
    const s = val.trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) return parts[0] * 60 + parts[1];
  }
  return undefined;
};

const TopicSubjectDetails = () => {
  const { batchId, subjectSlug, topicId } = useParams();
  const location = useLocation();
  const locationState = (location.state as LocationState) || {};
  const persistedState = getNavigationState();
  const navigate = useNavigate();
  
  // Use location state first, fallback to persisted state
  const subjectName = locationState.subjectName || persistedState.subjectName;
  const topicName = locationState.topicName || persistedState.topicName;
  const subjectId = locationState.subjectId || persistedState.subjectId;
  const batchName = locationState.batchName || persistedState.batchName;
  
  const [activeTab, setActiveTab] = useState("lectures");
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [lectureAttachments, setLectureAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [completedLectures, setCompletedLectures] = useState<Set<string>>(new Set());
  const [showLectureMenu, setShowLectureMenu] = useState<string | null>(null);
  const [lecturesPage, setLecturesPage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const [allLectures, setAllLectures] = useState<Lecture[]>([]); // Accumulate all lectures
  const [allNotes, setAllNotes] = useState<Note[]>([]); // Accumulate all notes

  // Save navigation state when component mounts or params change
  useEffect(() => {
    if (batchId && subjectSlug && topicId && subjectName && topicName) {
      saveNavigationState({
        batchId,
        subjectSlug,
        topicId,
        subjectId,
        subjectName,
        topicName,
        batchName,
      });
    }
  }, [batchId, subjectSlug, topicId, subjectName, topicName, subjectId, batchName]);

  // Load completed lectures from localStorage on component mount
  useEffect(() => {
    const savedCompletedLectures = localStorage.getItem(`completed-lectures-${batchId}-${subjectSlug}-${topicId}`);
    if (savedCompletedLectures) {
      try {
        const parsed = JSON.parse(savedCompletedLectures);
        setCompletedLectures(new Set(parsed));
      } catch (error) {
        // Error parsing completed lectures from localStorage
      }
    }
  }, [batchId, subjectSlug, topicId]);

  // Save completed lectures to localStorage whenever they change
  useEffect(() => {
    if (completedLectures.size > 0) {
      localStorage.setItem(
        `completed-lectures-${batchId}-${subjectSlug}-${topicId}`, 
        JSON.stringify(Array.from(completedLectures))
      );
    }
  }, [completedLectures, batchId, subjectSlug, topicId]);

  // Check if user has access to this batch content
  if (batchId && !canAccessBatchContent(batchId)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="mb-6">
            <BackButton label="Back" />
          </div>
          <Card className="mx-auto max-w-3xl p-8 text-center shadow-card">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-3 text-3xl font-bold text-foreground">Access Restricted</h1>
            <p className="mb-6 text-base text-muted-foreground">
              You need to enroll in this batch to access lectures, notes, and DPP content.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate(`/batch/${batchId}`)} className="bg-gradient-primary hover:opacity-90">
                Enroll Now
              </Button>
              <Button onClick={() => navigate('/batches')} variant="outline">
                View All Batches
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch lectures
  const {
    data: lecturesData,
    isLoading: lecturesLoading,
    isError: lecturesError,
    refetch: refetchLectures,
  } = useQuery<ContentResponse>({
    queryKey: ["topic-lectures", batchId, subjectSlug, topicId, lecturesPage],
    enabled: Boolean(batchId && subjectSlug && topicId),
    queryFn: async () => {
      const response = await fetchLectures(batchId!, subjectSlug!, topicId!, lecturesPage);
      return response;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Flatten all lecture pages
  const lectures = allLectures; // Use accumulated lectures
  const lecturesPagination = lecturesData?.paginate; // Use 'paginate' not 'pagination'

  // Fetch Notes directly from Content API
  const {
    data: notesData,
    isLoading: notesLoading,
    isError: notesError,
    refetch: refetchNotes,
  } = useQuery<ContentResponse>({
    queryKey: ["topic-notes", batchId, subjectSlug, topicId],
    enabled: Boolean(batchId && subjectSlug && topicId),
    queryFn: async () => {
      const response = await fetchNotes(batchId!, subjectSlug!, topicId!);
      
      // Transform the response to expand all homeworkIds into individual notes
      if (response?.data) {
        const expandedNotes: Note[] = [];
        response.data.forEach((item: any) => {
          if (item.homeworkIds && item.homeworkIds.length > 0) {
            // Create individual note items for each homework
            item.homeworkIds.forEach((homework: any, index: number) => {
              expandedNotes.push({
                _id: `${item._id}-note-${index}`,
                isFree: item.isFree,
                status: item.status,
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime,
                isDPPNotes: item.isDPPNotes,
                dRoomId: item.dRoomId,
                isBatchDoubtEnabled: item.isBatchDoubtEnabled,
                isSimulatedLecture: item.isSimulatedLecture,
                homeworkIds: [homework], // Individual homework
                topic: homework.topic,
                title: homework.topic,
                name: homework.topic,
                fileName: homework.note,
                displayName: homework.topic,
                baseUrl: homework.attachmentIds?.[0]?.baseUrl || "",
                key: homework.attachmentIds?.[0]?.key || ""
              });
            });
          }
        });
        
        return {
          ...response,
          data: expandedNotes
        };
      }
      
      return response;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Flatten all note pages
  const notes = notesData?.data || []; // Extract data array from ContentResponse
  const notesPagination = notesData?.paginate; // Use pagination from ContentResponse

  // Fetch DPP directly from Content API
  const {
    data: dppData,
    isLoading: dppLoading,
    isError: dppError,
    refetch: refetchDPP,
  } = useQuery<ContentResponse>({
    queryKey: ["topic-dpp", batchId, subjectSlug, topicId],
    enabled: Boolean(batchId && subjectSlug && topicId),
    queryFn: async () => {
      const response = await fetchDPPNotes(batchId!, subjectSlug!, topicId!);
      
      // Transform the response to expand all homeworkIds into individual DPP items
      if (response?.data) {
        const expandedDPP: DPPContent[] = [];
        response.data.forEach((item: any) => {
          if (item.homeworkIds && item.homeworkIds.length > 0) {
            // Create individual DPP items for each homework
            item.homeworkIds.forEach((homework: any, index: number) => {
              expandedDPP.push({
                _id: `${item._id}-dpp-${index}`,
                isFree: item.isFree,
                status: item.status,
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime,
                isDPPNotes: item.isDPPNotes,
                dRoomId: item.dRoomId,
                isBatchDoubtEnabled: item.isBatchDoubtEnabled,
                isSimulatedLecture: item.isSimulatedLecture,
                homeworkIds: [homework], // Individual homework
                topic: homework.topic,
                title: homework.topic,
                name: homework.topic,
                fileName: homework.note,
                displayName: homework.topic,
                baseUrl: homework.attachmentIds?.[0]?.baseUrl || "",
                key: homework.attachmentIds?.[0]?.key || ""
              });
            });
          }
        });
        
        return {
          ...response,
          data: expandedDPP
        };
      }
      
      return response;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const dpp = dppData?.data || []; // Extract data array from ContentResponse

  // Helper functions to determine if there are more pages
  const hasMoreLectures = () => {
    if (!lecturesPagination) return false;
    
    // Special case: if totalCount is 0 but we have data, check if current page has limit items
    if (lecturesPagination.totalCount === 0) {
      // If the current page fetched has exactly the limit number of items, there might be more pages
      const currentPageData = lecturesData?.data || [];
      return currentPageData.length >= (lecturesPagination.limit || 20);
    }
    // Otherwise check if there are more pages based on current page and total count
    const itemsPerPage = lecturesPagination.limit || 20;
    const totalPages = Math.ceil((lecturesPagination.totalCount || 0) / itemsPerPage);
    return lecturesPage < totalPages;
  };

  const hasMoreNotes = () => {
    // No pagination when using schedule API - always return false
    return false;
  };

  const getTotalLectures = () => {
    return allLectures.length; // Show accumulated count
  };

  const getTotalNotes = () => {
    return allNotes.length; // Show accumulated count
  };

  // Load more handlers
  const handleLoadMoreLectures = () => {
    setLecturesPage(prev => prev + 1);
  };

  const handleLoadMoreNotes = () => {
    setNotesPage(prev => prev + 1);
  };

  // Accumulate lectures when new data is fetched
  useEffect(() => {
    if (lecturesData?.data) {
      const newLectures = lecturesData.data as Lecture[];
      if (lecturesPage === 1) {
        // First page, replace all lectures
        setAllLectures(newLectures);
      } else {
        // Subsequent pages, append to existing lectures
        setAllLectures(prev => {
          // Avoid duplicates by filtering out lectures that already exist
          const existingIds = new Set(prev.map(lecture => lecture._id));
          const uniqueNewLectures = newLectures.filter(lecture => !existingIds.has(lecture._id));
          return [...prev, ...uniqueNewLectures];
        });
      }
    }
  }, [lecturesData, lecturesPage]);

  // Accumulate notes when new data is fetched
  useEffect(() => {
    if (notesData?.data) {
      const newNotes = notesData.data as Note[];
      if (notesPage === 1) {
        // First page, replace all notes
        setAllNotes(newNotes);
      } else {
        // Subsequent pages, append to existing notes
        setAllNotes(prev => {
          // Avoid duplicates by filtering out notes that already exist
          const existingIds = new Set(prev.map(note => note._id));
          const uniqueNewNotes = newNotes.filter(note => !existingIds.has(note._id));
          return [...prev, ...uniqueNewNotes];
        });
      }
    }
  }, [notesData, notesPage]);

  // Cache for attachment URLs to make view/download open faster
  const [attachmentUrlMap, setAttachmentUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!batchId || !subjectSlug) return;

    let mounted = true;
    const map: Record<string, string> = {};

    // Collect URLs from items that already have baseUrl and key
    [...notes, ...dpp].forEach((item) => {
      const contentItem = item as Note | DPPContent; // Cast to the correct types
      if (contentItem.baseUrl && contentItem.key) {
        // Check if key is already a full URL
        const url = contentItem.key.startsWith('http') ? contentItem.key : `${contentItem.baseUrl}${contentItem.key}`;
        map[contentItem._id] = url;
      } else if (contentItem.homeworkIds && contentItem.homeworkIds.length > 0) {
        const homework = contentItem.homeworkIds[0];
        if (homework.attachmentIds && homework.attachmentIds.length > 0) {
          const att = homework.attachmentIds[0];
          const base = att.baseUrl || "";
          const key = att.key || "";
          if (base && key) {
            // Check if key is already a full URL
            const url = key.startsWith('http') ? key : `${base}${key}`;
            map[contentItem._id] = url;
          }
        }
      }
    });

    // Update the map with directly available URLs
    if (Object.keys(map).length > 0) {
      setAttachmentUrlMap((p) => ({ ...p, ...map }));
    }

    // For items that don't have URLs, fetch from schedule details API
    const itemsNeedingFetch = [...notes, ...dpp].filter(item => !map[item._id]);

    if (itemsNeedingFetch.length === 0) {
      return;
    }

    // Create a map of parent schedule IDs to their homework items
    const parentScheduleMap = new Map<string, string[]>();

    // Collect all unique parent schedule IDs for items that need fetching
    itemsNeedingFetch.forEach((item) => {
      // Extract parent ID from generated unique ID
      let parentId = item._id;
      if (item._id.includes("-note-")) {
        parentId = item._id.split("-note-")[0];
      } else if (item._id.includes("-schedule-dpp-")) {
        parentId = item._id.split("-schedule-dpp-")[0];
      } else if (item._id.includes("-dpp-")) {
        parentId = item._id.split("-dpp-")[0];
      }
      if (!parentScheduleMap.has(parentId)) {
        parentScheduleMap.set(parentId, []);
      }
      parentScheduleMap.get(parentId)?.push(item._id);
    });

    if (parentScheduleMap.size === 0) return;

    (async () => {
      try {
        // Fetch all schedule details in parallel for better performance
        const results = await Promise.all(
          Array.from(parentScheduleMap.entries()).map(async ([parentId, itemIds]) => {
            try {
              // Use schedule details API instead of attachments API
              const scheduleDetails = await fetchScheduleDetails(batchId!, subjectSlug!, parentId);
              
              // Map the attachment URLs to all items that belong to this parent
              return itemIds.map(itemId => {
                let url = "";
                // Determine index and type from ID
                let index = 0;
                let isDPP = false;
                
                if (itemId.includes("-note-")) {
                  index = parseInt(itemId.split("-note-")[1], 10);
                } else if (itemId.includes("-schedule-dpp-")) {
                  index = parseInt(itemId.split("-schedule-dpp-")[1], 10);
                  isDPP = true;
                } else if (itemId.includes("-dpp-")) {
                  index = parseInt(itemId.split("-dpp-")[1], 10);
                  isDPP = true;
                }

                // Get attachments from schedule details
                if (isDPP && scheduleDetails?.dppHomeworks) {
                  const dppHomework = scheduleDetails.dppHomeworks[index];
                  if (dppHomework?.attachmentIds && dppHomework.attachmentIds.length > 0) {
                    const att = dppHomework.attachmentIds[0];
                    const base = att.baseUrl || "";
                    const key = att.key || "";
                    if (base && key) {
                      url = key.startsWith('http') ? key : `${base}${key}`;
                    }
                  }
                } else if (scheduleDetails?.homeworkIds) {
                  const homework = scheduleDetails.homeworkIds[index];
                  if (homework?.attachmentIds && homework.attachmentIds.length > 0) {
                    const att = homework.attachmentIds[0];
                    const base = att.baseUrl || "";
                    const key = att.key || "";
                    if (base && key) {
                      url = key.startsWith('http') ? key : `${base}${key}`;
                    }
                  }
                }

                return { id: itemId, url };
              });
            } catch {
              return itemIds.map(itemId => ({ id: itemId, url: "" }));
            }
          })
        );

        if (!mounted) return;
        const fetchedMap: Record<string, string> = {};
        // Flatten the results and create the attachment URL map
        results.flat().forEach((r) => {
          if (r.url) fetchedMap[r.id] = r.url;
        });
        if (Object.keys(fetchedMap).length > 0) {
          setAttachmentUrlMap((p) => ({ ...p, ...fetchedMap }));
        }
      } catch (err) {
        // silent fail — we'll fallback to on-demand fetch in handlers
      }
    })();

    return () => {
      mounted = false;
    };
  }, [batchId, subjectSlug, notes.length, dpp.length]);

  const toggleLectureMenu = (lectureId: string) => {
    setShowLectureMenu(showLectureMenu === lectureId ? null : lectureId);
  };

  const markLectureAsComplete = (lectureId: string) => {
    setCompletedLectures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lectureId)) {
        newSet.delete(lectureId);
        // Lecture unmarked as complete
      } else {
        newSet.add(lectureId);
        // Lecture marked as complete and saved to localStorage
      }
      return newSet;
    });
    setShowLectureMenu(null);
  };

  const isLectureCompleted = (lectureId: string) => {
    return completedLectures.has(lectureId);
  };

  const fetchLectureAttachments = async (lecture: Lecture) => {
    if (!batchId || !subjectSlug || !lecture._id) return;
    
    setAttachmentsLoading(true);
    setSelectedLecture(lecture);
    setShowAttachmentsDialog(true);
    
    try {
      const scheduleDetails = await fetchScheduleDetails(batchId, subjectSlug, lecture._id);
      const attachments: any[] = [];
      
      // Extract attachments from regular homeworkIds (notes)
      if (scheduleDetails && scheduleDetails.homeworkIds) {
        scheduleDetails.homeworkIds.forEach((homework: any) => {
          if (homework.attachmentIds && homework.attachmentIds.length > 0) {
            homework.attachmentIds.forEach((attachment: any) => {
              // Determine type based on multiple factors
              let type = 'Notes';
              if (homework.note && (
                homework.note.toLowerCase().includes('dpp') ||
                homework.note.toLowerCase().includes('practice') ||
                homework.note.toLowerCase().includes('problem')
              )) {
                type = 'DPP';
              }
              
              attachments.push({
                ...attachment,
                topic: homework.topic,
                type: type
              });
            });
          }
        });
      }
      
      // Extract attachments from DPP section (nested under dpp.homeworkIds)
      if (scheduleDetails && scheduleDetails.dpp && scheduleDetails.dpp.homeworkIds) {
        scheduleDetails.dpp.homeworkIds.forEach((homework: any) => {
          if (homework.attachmentIds && homework.attachmentIds.length > 0) {
            homework.attachmentIds.forEach((attachment: any) => {
              attachments.push({
                ...attachment,
                topic: homework.topic,
                type: 'DPP'
              });
            });
          }
        });
      }
      
      setLectureAttachments(attachments);
    } catch (error) {
      toast.error("Failed to fetch lecture attachments.");
    } finally {
      setAttachmentsLoading(false);
    }
  };


  const handleOpenContent = async (item: Note | DPPContent, action: 'view' | 'download') => {

    // Check if we have a cached URL
    const cached = attachmentUrlMap[item._id];
    if (cached) {
      if (action === 'view') {
        // Open PDF in new tab for viewing
        window.open(cached, "_blank");
      } else {
        // Trigger direct download
        downloadFile(cached, getContentName(item));
      }
      return;
    }

    let url = "";

    // Use schedule details API to fetch attachment URL
    try {
      // Extract the parent content ID from the generated ID
      let contentId = item._id;
      let isDPP = false;
      let index = 0;
      
      if (item._id.includes("-note-")) {
        contentId = item._id.split("-note-")[0];
        index = parseInt(item._id.split("-note-")[1], 10);
      } else if (item._id.includes("-schedule-dpp-")) {
        contentId = item._id.split("-schedule-dpp-")[0];
        index = parseInt(item._id.split("-schedule-dpp-")[1], 10);
        isDPP = true;
      } else if (item._id.includes("-dpp-")) {
        contentId = item._id.split("-dpp-")[0];
        index = parseInt(item._id.split("-dpp-")[1], 10);
        isDPP = true;
      }
      
      const scheduleDetails = await fetchScheduleDetails(batchId!, subjectSlug!, contentId);
      
      if (isDPP && scheduleDetails?.dppHomeworks) {
        const dppHomework = scheduleDetails.dppHomeworks[index];
        if (dppHomework?.attachmentIds && dppHomework.attachmentIds.length > 0) {
          const att = dppHomework.attachmentIds[0];
          const base = att.baseUrl || "";
          const key = att.key || "";
          if (base && key) {
            url = key.startsWith('http') ? key : `${base}${key}`;
          }
        }
      } else if (scheduleDetails?.homeworkIds) {
        const homework = scheduleDetails.homeworkIds[index];
        if (homework?.attachmentIds && homework.attachmentIds.length > 0) {
          const att = homework.attachmentIds[0];
          const base = att.baseUrl || "";
          const key = att.key || "";
          if (base && key) {
            url = key.startsWith('http') ? key : `${base}${key}`;
          }
        }
      }
    } catch (error) {
      // Failed to fetch attachment from schedule details
    }

    // Fallback to direct item properties if schedule fetch fails
    if (!url && item.baseUrl && item.key) {
      url = item.key.startsWith('http') ? item.key : `${item.baseUrl}${item.key}`;
    }

    if (!url && item.homeworkIds && item.homeworkIds.length > 0) {
      const homework = item.homeworkIds[0];
      if (homework.attachmentIds && homework.attachmentIds.length > 0) {
        const att = homework.attachmentIds[0];
        const base = att.baseUrl || "";
        const key = att.key || att.name || "";
        if (base && key) {
          url = key.startsWith('http') ? key : `${base}${key}`;
        }
      }
    }

    if (url) {
      // Cache the URL for future use
      setAttachmentUrlMap((p) => ({ ...p, [item._id]: url }));

      if (action === 'view') {
        // Open PDF in new tab for viewing
        window.open(url, "_blank");
      } else {
        // Trigger direct download
        downloadFile(url, getContentName(item));
      }
    } else {
      window.alert(`No attachment available to ${action}.`);
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
      <VideoPlayerSkeleton />
      <ListSkeleton items={5} />
    </div>
  );

  const renderErrorState = (onRetry: () => void) => (
    <Card className="p-12 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
        <AlertCircle className="h-8 w-8 text-primary" />
      </div>
      <p className="mb-4 text-muted-foreground">Unable to load content. Please try again.</p>
      <Button onClick={onRetry} className="bg-gradient-primary hover:opacity-90">
        Try again
      </Button>
    </Card>
  );

  const renderEmptyState = (type: string) => (
    <Card className="p-8 text-center shadow-card">
      <p className="text-muted-foreground">No {type} available for this topic.</p>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pb-28 pt-6 md:pb-12">
        <div className="mb-6 flex items-center justify-between">
          <BackButton label="Back" />
        </div>

        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">{topicName || "Topic Details"}</h1>
          {subjectName && <p className="text-sm text-muted-foreground">{subjectName}</p>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lectures">
              <Video className="mr-2 h-4 w-4" />
              Lectures
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="mr-2 h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="dpp">
              <ClipboardList className="mr-2 h-4 w-4" />
              DPP PDF
            </TabsTrigger>
          </TabsList>

          {/* LECTURES TAB */}
          <TabsContent value="lectures">
            {lecturesLoading ? (
              renderLoadingState()
            ) : lecturesError ? (
              renderErrorState(refetchLectures)
            ) : lectures.length === 0 ? (
              renderEmptyState("lectures")
            ) : (
              <>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {lectures.map((lecture) => (
                  <Card key={lecture._id} className={`overflow-hidden shadow-card hover:shadow-lg transition-shadow flex flex-col h-full ${
                    isLectureCompleted(lecture._id) ? 'ring-2 ring-green-500/20' : ''
                  }`}>
                    <div className="relative w-full aspect-video items-center justify-center bg-muted overflow-hidden flex-shrink-0">
                      {getThumbnailUrl(lecture) ? (
                        <img
                          src={getThumbnailUrl(lecture)}
                          alt={getContentName(lecture)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      {getContentDuration(lecture) && (
                        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                          {formatDuration(getContentDuration(lecture) || 0)}
                        </div>
                      )}
                      {isLectureCompleted(lecture._id) && (
                        <div className="absolute top-2 left-2 bg-green-500 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Completed
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
                            {lecture.title ?? getContentName(lecture)}
                          </h3>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground p-2 h-auto"
                              onClick={() => fetchLectureAttachments(lecture)}
                              title="View attachments"
                            >
                              <Paperclip className="h-4 w-4" />
                            </Button>
                            <div className="relative">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-foreground p-2 h-auto"
                                onClick={() => toggleLectureMenu(lecture._id)}
                                title="More options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                              
                              {/* Dropdown Menu */}
                              {showLectureMenu === lecture._id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50">
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markLectureAsComplete(lecture._id);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors text-foreground"
                                    >
                                      <Check className={`h-4 w-4 ${isLectureCompleted(lecture._id) ? 'text-green-500' : ''}`} />
                                      {isLectureCompleted(lecture._id) ? 'Unmark as Complete' : 'Mark as Complete'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {getContentDate(lecture) && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {formatDate(getContentDate(lecture))}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="gap-2 w-fit mt-auto"
                        onClick={async () => {
                          const sId = subjectId || "unknown";
                          const childId = lecture.findKey || lecture._id;
                          
                          // Navigate to video player page with new URL format
                          navigate(`/watch?piewallah=video&author=satyamrojhax&batchId=${batchId!}&subjectId=${sId}&childId=${childId}&penpencilvdo=true`);
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Watch Now
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              
              {hasMoreLectures() && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleLoadMoreLectures}
                    disabled={lecturesLoading}
                    size="lg"
                    variant="outline"
                    className="min-w-[200px] gap-2"
                  >
                    {lecturesLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        Load More Lectures
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {!hasMoreLectures() && lectures.length > 0 && (
                <div className="text-center mt-8 text-sm text-muted-foreground">
                  Showing all {getTotalLectures()} lectures
                </div>
              )}
              </>
            )}
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes">
            {notesLoading ? (
              renderLoadingState()
            ) : notesError ? (
              renderErrorState(refetchNotes)
            ) : notes.length === 0 ? (
              renderEmptyState("notes")
            ) : (
              <>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {notes.map((note) => (
                  <Card key={note._id} className="overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 flex flex-col h-full border-border/50">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground text-base flex-1">
                          {getContentName(note)} : Class Notes
                        </h3>
                        {getContentDate(note) && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(getContentDate(note))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between flex-1">
                      <button
                        onClick={() => handleOpenContent(note, 'view')}
                        className="flex items-center gap-2 text-foreground hover:bg-muted/50 px-3 py-2 rounded-lg transition-all duration-200"
                      >
                        <FileText className="h-5 w-5" />
                        <span className="text-sm font-medium">PDF</span>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-foreground hover:bg-muted/50 p-2 h-auto transition-all duration-200"
                        onClick={() => handleOpenContent(note, 'download')}
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              
              {hasMoreNotes() && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleLoadMoreNotes}
                    disabled={notesLoading}
                    size="lg"
                    variant="outline"
                    className="min-w-[200px] gap-2"
                  >
                    {notesLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        Load More Notes
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {!hasMoreNotes() && notes.length > 0 && (
                <div className="text-center mt-8 text-sm text-muted-foreground">
                  Showing all {getTotalNotes()} notes
                </div>
              )}
              </>
            )}
          </TabsContent>

          {/* DPP TAB */}
          <TabsContent value="dpp">
            {dppLoading ? (
              renderLoadingState()
            ) : dppError ? (
              renderErrorState(refetchDPP)
            ) : dpp.length === 0 ? (
              renderEmptyState("dpp")
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {dpp.map((item) => (
                  <Card key={item._id} className="overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 flex flex-col h-full border-border/50">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground text-base flex-1">
                          {getContentName(item)} : DPP
                        </h3>
                        {getContentDate(item) && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(getContentDate(item))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between flex-1">
                      <button
                        onClick={() => handleOpenContent(item, 'view')}
                        className="flex items-center gap-2 text-foreground hover:bg-muted/50 px-3 py-2 rounded-lg transition-all duration-200"
                        disabled={!(item.homeworkIds && item.homeworkIds.length > 0)}
                      >
                        <FileText className="h-5 w-5" />
                        <span className="text-sm font-medium">PDF</span>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-foreground hover:bg-muted/50 p-2 h-auto transition-all duration-200"
                        onClick={() => handleOpenContent(item, 'download')}
                        disabled={!(item.homeworkIds && item.homeworkIds.length > 0)}
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Attachments Dialog */}
      {showAttachmentsDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-elevation-3 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedLecture?.title || getContentName(selectedLecture!)} - Attachments
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  DPP and Notes for this lecture
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAttachmentsDialog(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {attachmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : lectureAttachments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No attachments available for this lecture.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lectureAttachments.map((attachment, index) => {
                    const fileUrl = attachment.baseUrl && attachment.key 
                      ? (attachment.key.startsWith('http') ? attachment.key : `${attachment.baseUrl}${attachment.key}`)
                      : '';
                    
                    return (
                      <Card key={index} className="p-4 border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-foreground">
                                {attachment.type}
                              </span>
                              {attachment.topic && (
                                <span className="text-xs text-muted-foreground">
                                  • {attachment.topic}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {attachment.name || `Attachment ${index + 1}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fileUrl && window.open(fileUrl, '_blank')}
                              disabled={!fileUrl}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fileUrl && downloadFile(fileUrl, attachment.name || `attachment-${index + 1}`)}
                              disabled={!fileUrl}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicSubjectDetails;
