import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCommonHeaders } from '@/lib/auth';
import { saveNavigationState, getNavigationState } from '@/lib/navigationState';
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Book, ChevronRight, Lock, FileText, Library, FileText as FileTextIcon } from "lucide-react";
import { canAccessBatchContent } from "@/lib/enrollmentUtils";
import { ListSkeleton } from "@/components/ui/skeleton-loaders";

type LocationState = {
  subjectName?: string;
  batchName?: string;
  subjectId?: string;
};

const TopicDetails = () => {
  const { batchId, subjectSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state as LocationState) || {};
  const persistedState = getNavigationState();
  
  // Use location state first, fallback to persisted state
  const subjectName = locationState.subjectName || persistedState.subjectName;
  const batchName = locationState.batchName || persistedState.batchName;
  const subjectId = locationState.subjectId || persistedState.subjectId;
  const [activeTab, setActiveTab] = useState("chapters");

  // Save navigation state when component mounts or params change
  useEffect(() => {
    if (batchId && subjectSlug && subjectName) {
      saveNavigationState({
        batchId,
        subjectSlug,
        subjectId,
        subjectName,
        batchName,
      });
    }
  }, [batchId, subjectSlug, subjectName, batchName, subjectId]);

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
              You need to enroll in this batch to access chapters and study material.
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

  // Fetch chapters
  const {
    data: chaptersData,
    isLoading: chaptersLoading,
    isError: chaptersError,
    refetch: refetchChapters,
  } = useQuery({
    queryKey: ["subject-chapters", batchId, subjectId],
    enabled: Boolean(batchId && subjectId),
    queryFn: async () => {
      const response = await fetch(`https://api.penpencil.co/batch-service/v1/batch-tags/${batchId}/subject/${subjectId}/topics?page=1&batchTagType=UNITS&limit=20`, {
        headers: getCommonHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch chapters');
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const chapters = chaptersData?.data || [];

  // Fetch study material
  const {
    data: studyMaterialData,
    isLoading: studyMaterialLoading,
    isError: studyMaterialError,
    refetch: refetchStudyMaterial,
  } = useQuery({
    queryKey: ["subject-study-material", batchId, subjectId],
    enabled: Boolean(batchId && subjectId),
    queryFn: async () => {
      const response = await fetch(`https://api.penpencil.co/batch-service/v1/batch-tags/${batchId}/subject/${subjectId}/topics?page=1&batchTagType=STUDY_MATERIAL&limit=20`, {
        headers: getCommonHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch study material');
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const studyMaterial = studyMaterialData?.data || [];

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
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
      <p className="text-muted-foreground">No {type} available for this subject.</p>
    </Card>
  );

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-28 pt-6 md:pb-12">
          <div className="mb-6 flex items-center justify-between">
            <BackButton label="Back" />
          </div>

          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground">{subjectName ?? "Subject"}</h1>
            {batchName && <p className="text-sm text-muted-foreground">{batchName}</p>}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chapters">
                <Library className="mr-2 h-4 w-4" />
                Chapters
              </TabsTrigger>
              <TabsTrigger value="study-material">
                <FileTextIcon className="mr-2 h-4 w-4" />
                Study Material
              </TabsTrigger>
            </TabsList>

            {/* CHAPTERS TAB */}
            <TabsContent value="chapters">
              {chaptersLoading ? (
                <ListSkeleton items={8} />
              ) : chaptersError ? (
                <Card className="p-12 text-center shadow-card">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
                    <AlertCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="mb-4 text-muted-foreground">Unable to load chapters. Please try again.</p>
                  <Button onClick={() => refetchChapters()} className="bg-gradient-primary hover:opacity-90">
                    Try again
                  </Button>
                </Card>
              ) : chapters.length === 0 ? (
                <Card className="p-12 text-center shadow-card">
                  <Book className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="text-muted-foreground">No chapters have been added yet for this subject.</p>
                </Card>
              ) : (
                <>
                  {/* Grid of chapters */}
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {chapters.map((chapter: any, index: number) => (
                      <div
                        key={chapter._id}
                        className="transform transition-all duration-300"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeInUp 0.5s ease-out forwards',
                          opacity: 0,
                        }}
                      >
                        <Card
                          className="rounded-3xl border border-border/60 p-5 shadow-card cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all duration-200 card-hover"
                          onClick={() => {
                            navigate(`/batch/${batchId}/subject/${subjectSlug}/topic/${chapter._id}`, {
                              state: {
                                subjectName,
                                batchName,
                                subjectId,
                                topicName: chapter.name,
                              },
                            });
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-1 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-foreground">{chapter.name}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{chapter.videos || chapter.lectureVideos || 0} Videos</span>
                                <span className="text-border">|</span>
                                <span className="font-medium text-foreground">{chapter.exercises || 0} Exercises</span>
                                <span className="text-border">|</span>
                                <span className="font-medium text-foreground">{chapter.notes || 0} Notes</span>
                              </div>
                            </div>
                            <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* STUDY MATERIAL TAB */}
            <TabsContent value="study-material">
              {studyMaterialLoading ? (
                <ListSkeleton items={8} />
              ) : studyMaterialError ? (
                <Card className="p-12 text-center shadow-card">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
                    <AlertCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="mb-4 text-muted-foreground">Unable to load study material. Please try again.</p>
                  <Button onClick={() => refetchStudyMaterial()} className="bg-gradient-primary hover:opacity-90">
                    Try again
                  </Button>
                </Card>
              ) : studyMaterial.length === 0 ? (
                <Card className="p-12 text-center shadow-card">
                  <Book className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="text-muted-foreground">No study material has been added yet for this subject.</p>
                </Card>
              ) : (
                <>
                  {/* Grid of study materials */}
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {studyMaterial.map((material: any, index: number) => (
                      <div
                        key={material._id}
                        className="transform transition-all duration-300"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeInUp 0.5s ease-out forwards',
                          opacity: 0,
                        }}
                      >
                        <Card
                          className="rounded-3xl border border-border/60 p-5 shadow-card cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all duration-200 card-hover"
                          onClick={() => {
                            navigate(`/batch/${batchId}/subject/${subjectSlug}/topic/${material._id}`, {
                              state: {
                                subjectName,
                                batchName,
                                subjectId,
                                topicName: material.name,
                              },
                            });
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-1 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-foreground">{material.name}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{material.videos || material.lectureVideos || 0} Videos</span>
                                <span className="text-border">|</span>
                                <span className="font-medium text-foreground">{material.exercises || 0} Exercises</span>
                                <span className="text-border">|</span>
                                <span className="font-medium text-foreground">{material.notes || 0} Notes</span>
                              </div>
                            </div>
                            <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default TopicDetails;
