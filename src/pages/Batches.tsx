import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarClock, 
  Users, 
  Video, 
  Clock, 
  BookOpen, 
  PlayCircle, 
  Loader2, 
  CheckCircle,
  Search,
  Filter,
  Star,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { fetchPopularBatches, PopularBatch } from "@/services/widgetService";
import { fetchBatchesChunked, Batch } from "@/services/batchService";
import { ContentGridSkeleton } from "@/components/ui/skeleton-loaders";

const IMAGE_FALLBACK = "https://static.pw.live/5eb393ee95fab7468a79d189/9ef3bea0-6eed-46a8-b148-4a35dd6b3b61.png";

// Popular Batch Card Component
const PopularBatchCard = ({ batch }: { batch: PopularBatch }) => {
  const typeInfo = batch.typeInfo;

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get the correct image URL from multiple possible sources
  const getImageUrl = () => {
    console.log('Getting image URL for batch:', typeInfo.name);
    
    // First try typeInfo.card.files array (primary source from API)
    if (typeInfo.card?.files?.length > 0) {
      console.log('Checking card files:', typeInfo.card.files);
      
      // Look for image files first
      const imageFile = typeInfo.card.files.find(file => file.type === 'IMAGE');
      if (imageFile?.url) {
        console.log('Using image file URL:', imageFile.url);
        return imageFile.url;
      }
      
      // If no image file, look for video files and use their thumbnail
      const videoFile = typeInfo.card.files.find(file => file.type === 'VIDEO');
      if (videoFile?.video?.image) {
        console.log('Using video thumbnail URL:', videoFile.video.image);
        return videoFile.video.image;
      }
      
      // Fallback to first file's URL if it's not a video
      const firstFile = typeInfo.card.files[0];
      if (firstFile?.url && firstFile.type !== 'VIDEO') {
        console.log('Using first file URL:', firstFile.url);
        return firstFile.url;
      }
    }
    
    // Try typeInfo.previewImage object - fix URL construction
    if (typeInfo.previewImage?.baseUrl && typeInfo.previewImage?.key) {
      // Ensure baseUrl ends with / and key doesn't start with /
      const baseUrl = typeInfo.previewImage.baseUrl.endsWith('/') 
        ? typeInfo.previewImage.baseUrl 
        : typeInfo.previewImage.baseUrl + '/';
      const key = typeInfo.previewImage.key.startsWith('/') 
        ? typeInfo.previewImage.key.slice(1) 
        : typeInfo.previewImage.key;
      const previewImageUrl = `${baseUrl}${key}`;
      console.log('Using previewImage URL:', previewImageUrl);
      console.log('previewImage data:', typeInfo.previewImage);
      return previewImageUrl;
    }
    
    // Try typeInfo.previewImageUrl (relative path)
    if (typeInfo.previewImageUrl) {
      const url = typeInfo.previewImageUrl.startsWith('http') 
        ? typeInfo.previewImageUrl
        : `https://static.pw.live/${typeInfo.previewImageUrl}`;
      console.log('Using previewImageUrl:', url);
      return url;
    }
    
    console.log('No image URL found, returning null');
    return null;
  };

  const imageUrl = getImageUrl();
  
  return (
    <Card className="group flex flex-col h-full overflow-hidden border border-border/60 shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card">
      {/* Header with Preview Image */}
      <div className="relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={typeInfo.name}
            className="h-40 sm:h-48 md:h-52 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onLoad={() => console.log('Image loaded successfully:', imageUrl)}
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              const target = e.target as HTMLImageElement;
              target.src = 'https://static.pw.live/5eb393ee95fab7468a79d189/9ef3bea0-6eed-46a8-b148-4a35dd6b3b61.png';
              target.onerror = () => {
                console.error('Fallback image also failed');
                const fallback = document.createElement('div');
                fallback.className = 'h-40 sm:h-48 md:h-52 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center';
                fallback.innerHTML = '<svg class="h-10 w-10 sm:h-12 sm:w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
                target.parentNode?.replaceChild(fallback, target);
              };
            }}
          />
        ) : (
          <div className="h-40 sm:h-48 md:h-52 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <svg className="h-10 w-10 sm:h-12 sm:w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-wrap gap-1 sm:gap-2">
          {typeInfo.markedAsNew && (
            <Badge className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium px-1.5 sm:px-2 py-1 shadow-md">
              New
            </Badge>
          )}
          {typeInfo.isCombo && (
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-medium px-1.5 sm:px-2 py-1 shadow-md">
              Combo
            </Badge>
          )}
        </div>

        {/* Fomo Icons */}
        {typeInfo.fomoIcons && typeInfo.fomoIcons.length > 0 && (
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
            <img 
              src={typeInfo.fomoIcons[0]} 
              alt="Special Offer" 
              className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 object-contain drop-shadow-md"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 md:p-5">
        {/* Title */}
        <h3 className="mb-2 text-sm sm:text-base md:text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {typeInfo.name}
        </h3>

        {/* Description Pointers */}
        {typeInfo.card?.descriptionPointers && typeInfo.card.descriptionPointers.length > 0 && (
          <div className="mb-3 space-y-1">
            {typeInfo.card.descriptionPointers.slice(0, 2).map((pointer, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                {pointer.image && (
                  <img src={pointer.image} alt="" className="h-3 w-3" />
                )}
                <span className="line-clamp-1">{pointer.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meta Information */}
        <div className="mb-3 space-y-1.5 sm:space-y-2 text-xs text-muted-foreground">
          {/* Class and Exam */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 md:gap-4">
            {typeInfo.class && (
              <span className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md">
                <BookOpen className="h-3 w-3" />
                Class {typeInfo.class}
              </span>
            )}
            {typeInfo.exam && typeInfo.exam.length > 0 && (
              <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                <TrendingUp className="h-3 w-3" />
                {typeInfo.exam.join(", ")}
              </span>
            )}
          </div>

          {/* Dates */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 md:gap-4">
            {typeInfo.startDate && (
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Starts: {formatDate(typeInfo.startDate)}
              </span>
            )}
            {typeInfo.mode && (
              <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                <Video className="h-3 w-3" />
                {typeInfo.mode}
              </span>
            )}
          </div>
        </div>

        {/* Footer with CTA */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-border/50">
          <div className="flex justify-center">
            <Button
              asChild
              size="sm"
              className="bg-gradient-primary hover:opacity-90 transition-all duration-200 w-full text-xs sm:text-sm hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              <Link to={`/batch/${typeInfo._id}`}>
                View Details
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Regular Batch Card Component
const BatchCard = ({ batch }: { batch: Batch }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getImageUrl = () => {
    if (batch.previewImage?.baseUrl && batch.previewImage?.key) {
      return `${batch.previewImage.baseUrl}${batch.previewImage.key}`;
    }
    return batch.image || IMAGE_FALLBACK;
  };

  return (
    <Card className="group flex flex-col h-full overflow-hidden border border-border/60 shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card">
      {/* Header with Preview Image */}
      <div className="relative overflow-hidden">
        <img
          src={getImageUrl()}
          alt={batch.name}
          className="h-40 sm:h-48 md:h-52 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = IMAGE_FALLBACK;
          }}
        />
        
        {/* Status Badge */}
        {batch.status && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
            <Badge 
              className={`${
                batch.status === 'Active' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                } text-white text-xs font-medium px-1.5 sm:px-2 py-1 shadow-md`
            }
            >
              {batch.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 md:p-5">
        {/* Title */}
        <h3 className="mb-2 text-sm sm:text-base md:text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {batch.name}
        </h3>

        {/* Meta Information */}
        <div className="mb-3 space-y-1.5 sm:space-y-2 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 md:gap-4">
            {batch.class && (
              <span className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md">
                <BookOpen className="h-3 w-3" />
                Class {batch.class}
              </span>
            )}
            {batch.exam && batch.exam.length > 0 && (
              <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                <TrendingUp className="h-3 w-3" />
                {batch.exam.join(", ")}
              </span>
            )}
          </div>

          {batch.startDate && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Starts: {formatDate(batch.startDate)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-border/50">
          <div className="flex justify-center">
            <Button
              asChild
              size="sm"
              className="bg-gradient-primary hover:opacity-90 transition-all duration-200 w-full text-xs sm:text-sm hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              <Link to={`/batch/${batch._id}`}>
                View Details
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Batches = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Increased debounce time for better performance
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch popular batches
  const {
    data: popularBatchesData,
    isLoading: isPopularLoading,
    error: popularError,
  } = useQuery({
    queryKey: ["popular-batches"],
    queryFn: fetchPopularBatches,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Infinite scroll for all batches
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isAllLoading,
    error: allError,
  } = useInfiniteQuery({
    queryKey: ["all-batches-chunked", debouncedSearchTerm],
    queryFn: ({ pageParam = 1 }) => fetchBatchesChunked(pageParam as number, 16), // Increased batch size for better performance
    getNextPageParam: (lastPage: any) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // Increased to 5 minutes for better caching
    refetchOnWindowFocus: false,
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time (replaces cacheTime)
  });

  // Intersection observer for infinite scrolling
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px", // Increased margin for earlier loading
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten infinite query data
  const allBatches = useMemo(() => {
    return infiniteData?.pages.flatMap((page: any) => page.batches || []) || [];
  }, [infiniteData]);

  // Filter batches based on search (optimized)
  const filteredBatches = useMemo(() => {
    if (!debouncedSearchTerm) return allBatches;
    const searchTerm = debouncedSearchTerm.toLowerCase();
    return allBatches.filter((batch: any) => {
      return batch.name?.toLowerCase().includes(searchTerm) ||
             batch.class?.toLowerCase().includes(searchTerm) ||
             batch.exam?.some((exam: string) => exam.toLowerCase().includes(searchTerm));
    });
  }, [allBatches, debouncedSearchTerm]);

  const popularBatches = popularBatchesData || [];
  const total = infiniteData?.pages?.[0]?.total || 0;

  const isLoading = isPopularLoading || isAllLoading;
  const error = popularError || allError;

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center shadow-card">
            <p className="mb-4 text-muted-foreground">
              {(error as Error)?.message ?? "Something went wrong while fetching batches."}
            </p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-primary hover:opacity-90">
              Try again
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Explore Our Batches
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Discover the perfect learning batch tailored to your educational journey
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 sm:mb-8">
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11 text-sm sm:text-base border-border/60 focus:border-primary/50 transition-colors duration-200"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Popular Batches Section */}
        {popularBatches.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="mb-4 sm:mb-6 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Popular Batches</h2>
            </div>
            
            {isPopularLoading ? (
              <ContentGridSkeleton items={6} />
            ) : (
              <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {popularBatches.map((batch) => (
                  <PopularBatchCard key={batch.typeId} batch={batch} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Batches Section */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                All Batches
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLoading ? 'Loading batches...' : `Showing ${filteredBatches.length} of ${total} batches`}
              </p>
            </div>
          </div>

          {/* Batches Grid with Infinite Scroll */}
          <div className="space-y-6 sm:space-y-8">
            {isAllLoading && filteredBatches.length === 0 ? (
              <ContentGridSkeleton items={9} />
            ) : filteredBatches.length === 0 && !isLoading ? (
              <Card className="p-6 sm:p-8 md:p-12 text-center shadow-card border-border/60">
                <div className="mx-auto mb-4 sm:mb-6 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary-light">
                  <CalendarClock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h3 className="mb-2 sm:mb-3 text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
                  No batches found
                </h3>
                <p className="mx-auto mb-6 sm:mb-8 max-w-md text-sm sm:text-base text-muted-foreground">
                  Try adjusting your search terms to find the perfect batch for you.
                </p>
                <Button 
                  onClick={() => {
                    setSearchTerm("");
                  }}
                  className="bg-gradient-primary hover:opacity-90 transition-all duration-200 hover:scale-[1.02] shadow-md"
                >
                  Clear Search
                </Button>
              </Card>
            ) : (
              <>
                {/* Mobile Optimized Grid */}
                <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBatches.map((batch: any, index: number) => (
                    <div
                      key={batch._id}
                      className="transform transition-all duration-300"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: 'fadeInUp 0.5s ease-out forwards',
                        opacity: 0,
                      }}
                    >
                      <BatchCard batch={batch} />
                    </div>
                  ))}
                </div>

                {/* Load More Indicator */}
                <div ref={loadMoreRef} className="flex justify-center py-6 sm:py-8">
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-3 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span className="text-sm font-medium">Loading more batches...</span>
                    </div>
                  )}
                  {!hasNextPage && filteredBatches.length > 0 && (
                    <div className="text-center text-muted-foreground bg-muted/30 px-4 py-2 rounded-full">
                      <p className="text-sm font-medium">You've reached the end</p>
                      <p className="text-xs mt-1">Showing all {filteredBatches.length} batches</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Batches;
