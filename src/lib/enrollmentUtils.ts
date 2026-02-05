// Utility functions for managing enrolled batches in localStorage

export type EnrolledBatch = {
    _id: string;
    name: string;
    previewImage?: {
        baseUrl: string;
        key: string;
    };
    language?: string;
    class?: string;
    startDate?: string;
    endDate?: string;
    enrolledAt: string;
};

const STORAGE_KEY = 'enrolledBatches';
const MAX_ENROLLMENTS = 3;

export { MAX_ENROLLMENTS };

export const getEnrolledBatches = async (): Promise<EnrolledBatch[]> => {
    try {
        // Get from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        const localStorageBatches = stored ? JSON.parse(stored) : [];
        
        // Remove duplicates from localStorage as well
        const uniqueBatches = localStorageBatches.reduce((acc: EnrolledBatch[], batch: EnrolledBatch) => {
            const existingIndex = acc.findIndex(b => b._id === batch._id);
            if (existingIndex === -1) {
                acc.push(batch);
            } else {
                // Keep the one with the latest enrolledAt
                if (new Date(batch.enrolledAt) > new Date(acc[existingIndex].enrolledAt)) {
                    acc[existingIndex] = batch;
                }
            }
            return acc;
        }, []);
        
        // Update localStorage with deduplicated data
        if (uniqueBatches.length !== localStorageBatches.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueBatches));
        }
        
        return uniqueBatches;
    } catch (error) {
        return [];
    }
};

export const isEnrolled = async (batchId: string): Promise<boolean> => {
    const batches = await getEnrolledBatches();
    return batches.some(batch => batch._id === batchId);
};

export const enrollInBatch = async (batch: Omit<EnrolledBatch, 'enrolledAt'>): Promise<{ success: boolean; message: string }> => {
    try {
        const batches = await getEnrolledBatches();

        // Check if already enrolled
        if (batches.some(b => b._id === batch._id)) {
            return { success: false, message: "Already enrolled in this batch" };
        }

        // Check enrollment limit
        if (batches.length >= MAX_ENROLLMENTS) {
            return { 
                success: false, 
                message: `Cannot enroll in more than ${MAX_ENROLLMENTS} batches. Please unenroll from a batch first.` 
            };
        }

        // Save to localStorage
        const newBatch: EnrolledBatch = {
            ...batch,
            enrolledAt: new Date().toISOString(),
        };
        
        const currentBatches = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        currentBatches.push(newBatch);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentBatches));
        
        return { success: true, message: "Successfully enrolled" };
    } catch (error) {
        return { success: false, message: "Failed to enroll" };
    }
};

export const unenrollFromBatch = async (batchId: string): Promise<boolean> => {
    try {
        const batches = await getEnrolledBatches();
        
        // Check if batch exists
        if (!batches.some(batch => batch._id === batchId)) {
            return false; // Batch not found
        }

        // Remove from localStorage
        const filtered = batches.filter(batch => batch._id !== batchId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        
        return true;
    } catch (error) {
        return false;
    }
};

export const getEnrolledBatchIds = async (): Promise<string[]> => {
    const batches = await getEnrolledBatches();
    return batches.map(batch => batch._id);
};

export const getEnrollmentCount = async (): Promise<number> => {
    const batches = await getEnrolledBatches();
    return batches.length;
};

export const canEnrollMore = async (): Promise<boolean> => {
    const count = await getEnrollmentCount();
    return count < MAX_ENROLLMENTS;
};

export const canAccessBatchContent = (batchId: string): boolean => {
  // For synchronous access, check localStorage directly
  const stored = localStorage.getItem('enrolledBatches');
  if (!stored) return false;
  
  try {
    const batches = JSON.parse(stored);
    return batches.some((batch: any) => batch._id === batchId);
  } catch (error) {
    return false;
  }
};

export const getRemainingEnrollments = async (): Promise<number> => {
    const count = await getEnrollmentCount();
    return Math.max(0, MAX_ENROLLMENTS - count);
};
