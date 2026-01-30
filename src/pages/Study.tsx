import { useMemo, useState } from "react";
import { getApiUrl, safeFetch } from '../lib/apiConfig';
import { getVideoStreamUrl } from '../services/videoService';
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Users, Video, Clock, BookOpen, PlayCircle, Radio, FileText, Download, Loader2, ArrowLeft, Bell, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { getEnrolledBatches } from "@/lib/enrollmentUtils";
import { toast } from "sonner";
import { getCommonHeaders } from "@/lib/auth";
import { fetchScheduleDetails } from "@/services/contentService";
import CountdownTimer from "@/components/CountdownTimer";

const TODAYS_SCHEDULE_API = "/v1/batches/{batchId}/todays-schedule";
const IMAGE_FALLBACK = "https://static.pw.live/5eb393ee95fab7468a79d189/9ef3bea0-6eed-46a8-b148-4a35dd6b3b61.png";
const STALE_TIME = 1000 * 60 * 5; // 5 minutes
const GC_TIME = 1000 * 60 * 10; // 10 minutes

export type ScheduleItem = {
  _id: string;
  topic: string;
  subject?: string;
  subjectId?: string;
  subjectName?: string;
  batchId: string;
  batchName?: string;
  teacherName?: string;
  startTime: string;
  endTime?: string;
  status?: "live" | "upcoming" | "completed" | string;
  meetingUrl?: string;
  recordingUrl?: string;
  platform?: string;
  image?: string; // optional thumbnail for the session
  duration?: string; // duration from videoDetails
  tag?: string; // "Live", "Ended", "Upcoming", etc.
  lectureType?: string; // "LIVE", "RECORDED", "PDF", etc.
  type?: "LECTURE" | "NOTES" | "DPP_QUIZ" | "DPP_PDF" | "BULK_SCHEDULE"; // etc.
  parentScheduleId?: string; // for fetching live sessions
  scheduleIds?: string[]; // for fetching live sessions
  // API response structures
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
    findKey?: string; // findKey for video fetching
  };
  notesDetails?: any;
  dppQuizDetails?: any;
  dppPDFDetails?: any;
  bulkScheduleDetails?: any;
  homeworkIds?: Array<{
    _id?: string;
    topic?: string;
    note?: string;
    attachmentIds?: Array<{
      _id?: string;
      baseUrl?: string;
      key?: string;
      name?: string;
    }>;
  }>;
};

type BatchScheduleResponse = {
  success?: boolean;
  data?: ScheduleItem[];
  schedule?: ScheduleItem[];
};

type EnrolledBatch = {
  _id: string;
  name?: string;
};

type EnrolledBatchesResponse = {
  success?: boolean;
  data?: EnrolledBatch[];
  batches?: EnrolledBatch[];
};

// Fetch weekly schedules for a batch
const fetchWeeklySchedules = async (batchId: string, startDate: string, endDate: string, batchSubjectId?: string): Promise<ScheduleItem[]> => {
  const authToken = localStorage.getItem("param_auth_token");
  if (!authToken) {
    // No auth token found
    return [];
  }

  try {
    const subjectId = batchSubjectId || '';
    const url = getApiUrl(`/weekly-schedules`, {
      batchId,
      batchSubjectId: subjectId,
      startDate,
      endDate,
      page: '1'
    });
    
    const response = await safeFetch(url, {
      method: 'GET',
      headers: {
        ...getCommonHeaders(),
        'authorization': `Bearer ${authToken}`,
        'client-version': '1.0.0',
        'referer': 'https://www.pw.live/',
        'origin': 'https://www.pw.live'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return [];
    }
    
    const data: BatchScheduleResponse = await response.json();
    const items = data.data || data.schedule || [];
    
    return items.map((item) => ({
      ...item,
      batchId,
      image: (item as any).videoDetails?.image ||
        (item as any).previewImageUrl ||
        (item as any).previewImageUrlMWeb ||
        (item as any).image ||
        (item as any).thumbnail ||
        (item as any).imageUrl ||
        IMAGE_FALLBACK,
      subject: (item as any).subjectId?.name || (item as any).subject,
      subjectId: (item as any).subjectId?._id || (item as any).subjectId || batchSubjectId,
      subjectName: (item as any).subjectId?.name || (item as any).subject,
      startTime: (item as any).startTime || (item as any).start_time,
      endTime: (item as any).endTime || (item as any).end_time,
    }));
  } catch (error) {
    return [];
  }
};

// Fetch weekly planner data for a batch
const fetchWeeklyPlanner = async (batchId: string, startDate: string): Promise<any> => {
  const authToken = localStorage.getItem("param_auth_token");
  if (!authToken) {
    return null;
  }

  try {
    const url = getApiUrl(`/weekly-planner`, {
      batchId,
      startDate
    });
    
    const response = await safeFetch(url, {
      method: 'GET',
      headers: {
        ...getCommonHeaders(),
        'authorization': `Bearer ${authToken}`,
        'client-version': '1.0.0',
        'referer': 'https://www.pw.live/',
        'origin': 'https://www.pw.live'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

// Fetch today's schedule from all enrolled batches
const fetchTodaysSchedule = async (batchIds: string[]): Promise<ScheduleItem[]> => {
  if (batchIds.length === 0) return [];
  
  // Get auth token from localStorage
  const authToken = localStorage.getItem("param_auth_token");
  if (!authToken) {
    return [];
  }

  try {
    const schedules = await Promise.all(
      batchIds.map(async (batchId) => {
        try {
          // Use local proxy endpoint (Vite will proxy to PenPencil API)
          const url = getApiUrl(`/v1/batches/${batchId}/todays-schedule`, {
            isNewStudyMaterialFlow: 'true'
          });
          
          const response = await safeFetch(url, {
            method: 'GET',
            headers: {
              ...getCommonHeaders(),
              'authorization': `Bearer ${authToken}`,
              'client-version': '1.0.0',
              'referer': 'https://www.pw.live/',
              'origin': 'https://www.pw.live'
            }
          });
          
          // Enhanced error logging
          if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401) {
              localStorage.removeItem("param_auth_token");
            }
            return [];
          }
          
          const data: BatchScheduleResponse = await response.json();
          const items = data.data || data.schedule || [];
          
          return items.map((item) => {
            // Extract the correct nested object based on type
            let details: any = {};
            if (item.type === 'LECTURE' && item.videoDetails) {
              details = item.videoDetails;
            } else if (item.type === 'NOTES' && item.notesDetails) {
              details = item.notesDetails;
            } else if (item.type === 'DPP_QUIZ' && item.dppQuizDetails) {
              details = item.dppQuizDetails;
            } else if (item.type === 'DPP_PDF' && item.dppPDFDetails) {
              details = item.dppPDFDetails;
            } else if (item.type === 'BULK_SCHEDULE' && item.bulkScheduleDetails) {
              details = item.bulkScheduleDetails;
            } else {
              // Fallback to item itself if no specific type structure
              details = item;
            }

            return {
              ...item,
              batchId,
              image: details.videoDetails?.image ||
                details.previewImageUrl ||
                details.previewImageUrlMWeb ||
                details.image ||
                details.thumbnail ||
                details.imageUrl ||
                "https://static.pw.live/5eb393ee95fab7468a79d189/9ef3bea0-6eed-46a8-b148-4a35dd6b3b61.png",
              subject: details.subjectId?.name || item.subject,
              subjectId: details.subjectId?._id || item.subjectId,
              subjectName: details.subjectId?.name || item.subject,
              startTime: details.startTime || item.startTime,
              endTime: details.endTime || item.endTime,
              topic: details.topic || item.topic,
              status: details.status || item.status,
              lectureType: details.lectureType || item.lectureType,
              tag: details.tag || item.tag,
              homeworkIds: details.homeworkIds || item.homeworkIds,
            };
          });
        } catch (error) {
          return [];
        }
      })
    );
    return schedules.flat();
  } catch (error) {
    return [];
  }
};

const fetchEnrolledBatches = async (): Promise<EnrolledBatch[]> => {
  // Get enrolled batches from localStorage
  return getEnrolledBatches();
};

const formatTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const getStatus = (startTime: string, endTime?: string): "live" | "upcoming" | "completed" => {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  if (now < start) return "upcoming";
  if (end && now > end) return "completed";
  return "live";
};

// Convert status to uppercase to match HTML
const normalizeStatus = (status?: string): "live" | "upcoming" | "completed" | "canceled" => {
  if (!status) return "upcoming";
  const upperStatus = status.toUpperCase();
  if (upperStatus.includes("COMPLETED")) return "completed";
  if (upperStatus.includes("LIVE")) return "live";
  if (upperStatus.includes("CANCELED") || upperStatus.includes("CANCELLED")) return "canceled";
  if (upperStatus.includes("UPCOMING") || upperStatus.includes("PENDING") || upperStatus.includes("SCHEDULED")) return "upcoming";
  return "upcoming";
};

const statusStyles: Record<"live" | "upcoming" | "completed" | "canceled", string> = {
  live: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  upcoming: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  completed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  canceled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const Study = () => {
  const navigate = useNavigate();
  const [openingMaterialId, setOpeningMaterialId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all"); // "all" or specific batch ID
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [showUpcomingPopup, setShowUpcomingPopup] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today'); // 'today' or 'week'
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(today.setDate(diff));
  });

  // Enrolled batches
  const {
    data: enrolledBatches = [],
    isLoading: isEnrolledLoading,
    isError: isEnrolledError,
    error: enrolledError,
    refetch: refetchEnrolled,
  } = useQuery<EnrolledBatch[]>({
    queryKey: ["enrolled-batches"],
    queryFn: fetchEnrolledBatches,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const enrolledBatchIds = useMemo(() => enrolledBatches.map((b) => b._id).filter(Boolean), [enrolledBatches]);
  const hasEnrollments = enrolledBatchIds.length > 0;

  // Calculate week dates
  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6); // Monday to Sunday
    return end;
  }, [currentWeekStart]);

  const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Weekly schedules query
  const {
    data: weeklyScheduleItems = [],
    isLoading: isWeeklyLoading,
    isFetching: isWeeklyFetching,
    isError: isWeeklyError,
    error: weeklyError,
    refetch: refetchWeekly,
  } = useQuery<ScheduleItem[]>({
    queryKey: ["weekly-schedules", enrolledBatchIds, formatDate(currentWeekStart), formatDate(currentWeekEnd)],
    queryFn: async () => {
      if (viewMode !== 'week' || enrolledBatchIds.length === 0) return [];
      
      const schedules = await Promise.all(
        enrolledBatchIds.map(async (batchId) => {
          return await fetchWeeklySchedules(batchId, formatDate(currentWeekStart), formatDate(currentWeekEnd));
        })
      );
      return schedules.flat();
    },
    enabled: viewMode === 'week' && hasEnrollments,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Today's schedule
  const {
    data: scheduleItems = [],
    isLoading: isScheduleLoading,
    isFetching: isScheduleFetching,
    isError: isScheduleError,
    error: scheduleError,
    refetch: refetchSchedule,
  } = useQuery<ScheduleItem[]>({
    queryKey: ["todays-schedule", enrolledBatchIds],
    queryFn: () => fetchTodaysSchedule(enrolledBatchIds),
    enabled: hasEnrollments,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const isLoading = isEnrolledLoading || (hasEnrollments && (viewMode === 'today' ? isScheduleLoading : isWeeklyLoading));
  const isFetching = hasEnrollments && (viewMode === 'today' ? isScheduleFetching : isWeeklyFetching);

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    if (direction === 'prev') {
      newWeekStart.setDate(newWeekStart.getDate() - 7);
    } else {
      newWeekStart.setDate(newWeekStart.getDate() + 7);
    }
    setCurrentWeekStart(newWeekStart);
  };

  const goToToday = () => {
    setViewMode('today');
  };

  const goToThisWeek = () => {
    navigate('/weekly-schedule');
  };

  // Get current display items based on view mode
  const currentItems = viewMode === 'today' ? scheduleItems : weeklyScheduleItems;

  // Ensure each item has a status and normalize it
  const itemsWithStatus = useMemo(() =>
    currentItems.map((item) => ({
      ...item,
      status: normalizeStatus(item.status) || getStatus(item.startTime, item.endTime),
    })),
    [currentItems]
  );

  // Filter by selected batch
  const displayedClasses = useMemo(() => {
    if (selectedBatchId === "all") {
      return itemsWithStatus;
    }
    return itemsWithStatus.filter((item) => item.batchId === selectedBatchId);
  }, [itemsWithStatus, selectedBatchId]);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = IMAGE_FALLBACK;

    // If fallback image also fails, hide image and show icon fallback
    event.currentTarget.onerror = (e: Event | string) => {
      const target = e instanceof Event ? (e.target as HTMLImageElement) : event.currentTarget;
      target.style.display = 'none';
      // Create icon fallback
      const icon = document.createElement('div');
      icon.className = 'flex items-center justify-center h-48 w-full rounded-lg bg-muted/30';
      icon.innerHTML = '<svg class="h-12 w-12 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
      target.parentNode?.replaceChild(icon, target);
    };
  };

  const handleRefresh = () => {
    refetchEnrolled();
    if (hasEnrollments) {
      if (viewMode === 'today') {
        refetchSchedule();
      } else {
        refetchWeekly();
      }
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenMaterial = async (item: ScheduleItem) => {
    if (!item.batchId || !item._id) return;

    setOpeningMaterialId(item._id);
    try {
      // Get subject ID from the item with better fallback handling
      const subjectId = (item as any).subjectId?._id || (item as any).subjectId || (item as any).batchSubjectId || "unknown";
      const subjectName = (item as any).subjectId?.name || (item as any).subjectName || (item as any).subject || subjectId;
      
      // Fetch schedule details to get both notes and DPP content
      const scheduleDetails = await fetchScheduleDetails(item.batchId, subjectId, item._id);
      
      if (!scheduleDetails) {
        toast.error("No materials found for this session.");
        return;
      }

      let url = "";
      
      // First check regular homeworkIds (notes)
      if (scheduleDetails.homeworkIds && scheduleDetails.homeworkIds.length > 0) {
        const homework = scheduleDetails.homeworkIds[0];
        if (homework.attachmentIds && homework.attachmentIds.length > 0) {
          const att = homework.attachmentIds[0];
          const base = att.baseUrl || "";
          const key = att.key || "";
          if (base && key) {
            url = key.startsWith('http') ? key : `${base}${key}`;
          }
        }
      }
      
      // If no notes found, check DPP content
      if (!url && scheduleDetails.dppHomeworks && scheduleDetails.dppHomeworks.length > 0) {
        const dppHomework = scheduleDetails.dppHomeworks[0];
        if (dppHomework.attachmentIds && dppHomework.attachmentIds.length > 0) {
          const att = dppHomework.attachmentIds[0];
          const base = att.baseUrl || "";
          const key = att.key || "";
          if (base && key) {
            url = key.startsWith('http') ? key : `${base}${key}`;
          }
        }
      }

      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("No document found for this session.");
      }
    } catch (error) {
      toast.error("Failed to open material. Please try again.");
    } finally {
      setOpeningMaterialId(null);
    }
  };

  const handleJoinLive = async (item: ScheduleItem) => {
    if (!item.batchId) return;

    setLoadingVideoId(item._id);
    try {
      // First try to use existing meetingUrl
      if (item.meetingUrl) {
        window.open(item.meetingUrl, "_blank");
        setLoadingVideoId(null);
        return;
      }

      // Try to get video details and navigate to player
      const findKey = item.videoDetails?.findKey || item.videoDetails?._id || item._id;
      const subjectId = (item as any).subjectId?._id || (item as any).subjectId || "unknown";
      const subjectName = (item as any).subjectId?.name || (item as any).subjectName || subjectId;

      if (findKey && item.batchId) {
        // Navigate to video player page with new URL format
        navigate(`/watch?piewallah=video&author=satyamrojhax&batchId=${item.batchId}&subjectId=${subjectId}&childId=${findKey}&penpencilvdo=true`);
      } else {
        toast.error("Video details not available");
      }
    } catch (error) {
      toast.error("Failed to join live session. Please try again.");
    } finally {
      setLoadingVideoId(null);
    }
  };

  const handleSetReminder = async (item: ScheduleItem) => {
    try {
      // Check if browser supports notifications
      if (!("Notification" in window)) {
        toast.error("Your browser doesn't support notifications");
        return;
      }

      // Request notification permission if not granted
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied");
          return;
        }
      }

      // Calculate reminder time (15 minutes before lecture starts)
      const lectureStartTime = new Date(item.startTime);
      const reminderTime = new Date(lectureStartTime.getTime() - 15 * 60 * 1000); // 15 minutes before
      const now = new Date();

      if (reminderTime <= now) {
        toast.error("Lecture starts soon or has already started");
        return;
      }

      // Schedule browser notification
      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      setTimeout(() => {
        new Notification("Lecture Reminder", {
          body: `${item.topic} starts in 15 minutes at ${formatTime(item.startTime)}`,
          icon: "/favicon.ico",
          tag: item._id, // Prevent duplicate notifications
        });

        toast.success(`Reminder set for ${item.topic}`);
      }, timeUntilReminder);

      toast.success(`Reminder set for ${item.topic} - 15 minutes before start`);
    } catch (error) {
      toast.error("Failed to set reminder. Please try again.");
    }
  };

  const handleWatchRecording = async (item: ScheduleItem) => {
    if (!item.batchId) return;

    setLoadingVideoId(item._id);
    try {
      // First try to use existing recordingUrl
      if (item.recordingUrl) {
        window.open(item.recordingUrl, "_blank");
        setLoadingVideoId(null);
        return;
      }

      // Try to get video details and use new API
      const findKey = item.videoDetails?.findKey || item.videoDetails?._id || item._id;
      const subjectId = (item as any).subjectId?._id || (item as any).subjectId || (item as any).batchSubjectId || "unknown";
      const subjectName = (item as any).subjectId?.name || (item as any).subjectName || (item as any).subject || subjectId;

      if (findKey && item.batchId) {
        // Navigate to video player page with new URL format
        navigate(`/watch?piewallah=video&author=satyamrojhax&batchId=${item.batchId}&subjectId=${subjectId}&childId=${findKey}&penpencilvdo=true`);
      } else {
        toast.error("Recording not available yet");
      }
    } catch (error) {
      toast.error("Failed to load recording. Please try again.");
    } finally {
      setLoadingVideoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-28 pt-8 md:pb-12">
        <div className="mb-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {viewMode === 'today' ? 'Today\'s Schedule' : 'Weekly Schedule'}
              </h1>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full px-2 sm:px-3" onClick={handleRefresh}>Refresh</Button>
          </div>

          {/* View Mode Toggle and Week Navigation */}
          {hasEnrollments && (
            <div className="flex flex-col gap-4 p-4 bg-card/60 rounded-2xl border border-border/60">
              {/* View Mode Toggle */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={viewMode === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={goToToday}
                  className="rounded-full flex-1 sm:flex-none min-w-0"
                >
                  <CalendarClock className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Today</span>
                  <span className="sm:hidden">Today</span>
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={goToThisWeek}
                  className="rounded-full flex-1 sm:flex-none min-w-0"
                >
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">This Week</span>
                  <span className="sm:hidden">Week</span>
                </Button>
              </div>

              {/* Week Navigation */}
              {viewMode === 'week' && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('prev')}
                    className="rounded-full px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-xs sm:text-sm font-medium truncate block">
                      {currentWeekStart.toLocaleDateString('en-IN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} - {currentWeekEnd.toLocaleDateString('en-IN', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('next')}
                    className="rounded-full px-2 sm:px-3"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Batch Toggle - Only show if user has multiple batches */}
        {hasEnrollments && enrolledBatches.length > 1 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 p-4 bg-card/60 rounded-2xl border border-border/60">
              <Button
                variant={selectedBatchId === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBatchId("all")}
                className="rounded-full"
              >
                All Batches ({currentItems.length})
              </Button>
              {enrolledBatches.map((batch) => (
                <Button
                  key={batch._id}
                  variant={selectedBatchId === batch._id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedBatchId(batch._id)}
                  className="rounded-full"
                >
                  {batch.name || `Batch ${batch._id.slice(-6)}`}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Error handling */}
        {isEnrolledError ? (
          <Card className="p-12 text-center shadow-card">
            <p className="mb-4 text-muted-foreground">{(enrolledError as Error)?.message ?? "We couldn't load your enrolled batches."}</p>
            <Button onClick={() => refetchEnrolled()} className="bg-gradient-primary hover:opacity-90">Try again</Button>
          </Card>
        ) : !hasEnrollments && !isEnrolledLoading ? (
          <Card className="p-12 text-center shadow-card">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold text-foreground">Enroll to view schedules</h3>
            <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
              You haven't enrolled in any batches yet. Join a batch to see today's live classes and stay on track.
            </p>
            <Link to="/batches">
              <Button size="lg" className="bg-gradient-primary px-6">Browse batches</Button>
            </Link>
          </Card>
        ) : isLoading ? (
          <Card className="p-12 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
              <Clock className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">
              Fetching {viewMode === 'today' ? 'today\'s schedule' : 'weekly schedule'}, please wait...
            </p>
          </Card>
        ) : (viewMode === 'today' ? isScheduleError : isWeeklyError) ? (
          <Card className="p-12 text-center shadow-card">
            <p className="mb-4 text-muted-foreground">
              {((viewMode === 'today' ? scheduleError : weeklyError) as Error)?.message ?? 
               `Something went wrong while fetching ${viewMode === 'today' ? 'today\'s' : 'weekly'} schedule.`}
            </p>
            <Button 
              onClick={() => viewMode === 'today' ? refetchSchedule() : refetchWeekly()} 
              className="bg-gradient-primary hover:opacity-90"
            >
              Try again
            </Button>
          </Card>
        ) : displayedClasses.length === 0 ? (
          <Card className="p-12 text-center shadow-card">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold text-foreground">No classes scheduled</h3>
            <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
              {viewMode === 'today' 
                ? 'No classes are scheduled for today. Check back tomorrow or explore other batches.'
                : `No classes are scheduled for this week. Try navigating to a different week.`
              }
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {displayedClasses.map((item) => (
              <Card
                key={item._id}
                className="flex flex-col rounded-2xl sm:rounded-3xl border border-border/60 bg-card/80 p-4 sm:p-6 shadow-card transition-all hover:shadow-soft"
              >
                {item.image && (
                  <div className="relative w-full overflow-hidden rounded-lg mb-3 sm:mb-4">
                    <img
                      src={item.image}
                      alt={item.topic}
                      className="w-full h-32 sm:h-48 object-cover"
                      onError={handleImageError}
                    />
                  </div>
                )}
                <div className="mb-3 sm:mb-4 flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    {item.tag && (
                      <Badge className={statusStyles[item.tag.toLowerCase() === "live" ? "live" :
                        item.tag.toLowerCase() === "ended" ? "completed" : "upcoming"] + " text-xs"}>
                        {item.tag}
                      </Badge>
                    )}
                    {item.subject && (
                      <Badge variant="outline" className="bg-background/60 ml-1 sm:ml-2 text-xs">{item.subject}</Badge>
                    )}
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-1 sm:mt-2 line-clamp-2">{item.topic}</h3>
                    {item.batchName && <p className="mt-1 text-xs sm:text-sm text-muted-foreground truncate">{item.batchName}</p>}
                  </div>
                  {item.platform && (
                    <Badge variant="outline" className="bg-background/60 text-muted-foreground text-xs flex-shrink-0">{item.platform}</Badge>
                  )}
                </div>
                <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 text-primary/80 flex-shrink-0" />
                    <span className="truncate">{formatTime(item.startTime)}{item.endTime ? ` – ${formatTime(item.endTime)}` : ""}</span>
                    {(item.duration || item.videoDetails?.duration) && (
                      <span className="ml-auto text-xs bg-muted px-1 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
                        {item.duration || item.videoDetails?.duration}
                      </span>
                    )}
                  </div>
                  {item.teacherName && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary/80 flex-shrink-0" />
                      <span className="truncate">{item.teacherName}</span>
                    </div>
                  )}
                  {item.subject && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-primary/80 flex-shrink-0" />
                      <span className="truncate">{item.subject}</span>
                    </div>
                  )}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  {/* View Material Button - Always show if available */}
                  {item.homeworkIds && item.homeworkIds.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full min-w-0 text-xs sm:text-sm"
                      onClick={() => handleOpenMaterial(item)}
                      disabled={openingMaterialId === item._id}
                    >
                      {openingMaterialId === item._id ? (
                        <>
                          <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin flex-shrink-0" /> <span className="hidden sm:inline">Opening...</span><span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> <span className="hidden sm:inline">View Material</span><span className="sm:hidden">Material</span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Video Buttons - Show for live lectures or items with video content */}
                  {(item.videoDetails || item.duration || item.videoDetails?.duration || item.meetingUrl || item.recordingUrl ||
                    (item.lectureType === "LIVE")) && (
                      // Show Join Live button for LIVE lectures that are currently live or tagged as Live
                      (item.tag === "Live" || (item.lectureType === "LIVE" && item.status === "live")) ? (
                        <Button
                          className="w-full bg-gradient-primary min-w-0 text-xs sm:text-sm"
                          size="sm"
                          onClick={() => handleJoinLive(item)}
                          disabled={loadingVideoId === item._id}
                        >
                          {loadingVideoId === item._id ? (
                            <>
                              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin flex-shrink-0" /> <span className="hidden sm:inline">Loading...</span><span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <Radio className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> <span className="hidden sm:inline">Join Live</span><span className="sm:hidden">Live</span>
                            </>
                          )}
                        </Button>
                      ) : (item.status === "completed" || item.tag === "Ended" || item.lectureType === "RECORDED") && item.status !== "canceled" ? (
                        // Show Watch Recording for completed or ended lectures
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full min-w-0 text-xs sm:text-sm"
                          onClick={() => handleWatchRecording(item)}
                          disabled={loadingVideoId === item._id}
                        >
                          {loadingVideoId === item._id ? (
                            <>
                              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin flex-shrink-0" /> <span className="hidden sm:inline">Loading...</span><span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> <span className="hidden sm:inline">Watch Recording</span><span className="sm:hidden">Recording</span>
                            </>
                          )}
                        </Button>
                      ) : null
                    )}

                  {/* Countdown Timer for live classes when no other content is available */}
                  {!(item.homeworkIds && item.homeworkIds.length > 0) &&
                    !(item.videoDetails || item.duration || item.videoDetails?.duration || item.meetingUrl || item.recordingUrl) &&
                    !(item.tag === "Live" && item.lectureType === "LIVE") && (
                      (item.status === 'upcoming' || item.tag === 'Upcoming') ? (
                        <div className="w-full rounded-lg border border-border/50 bg-muted/30 p-2 sm:p-3">
                          <CountdownTimer 
                            startTime={item.startTime} 
                            className="justify-center text-xs sm:text-sm"
                          />
                        </div>
                      ) : null
                    )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Popup - Mobile Optimized */}
      {showUpcomingPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUpcomingPopup(false)}>
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-sm w-full mx-auto text-center shadow-2xl transform scale-95 transition-transform" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl sm:text-5xl text-amber-500 mb-3 sm:mb-4">
              <Clock className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-2">Lecture Not Started</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">This lecture is not started yet. Please wait for the scheduled time.</p>
            <Button
              onClick={() => setShowUpcomingPopup(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Study;
