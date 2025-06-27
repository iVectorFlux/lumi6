import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.lexiscore.com';

/**
 * Submits candidate recordings for CEFR assessment with optimized upload
 */
export async function submitAssessment(
  recordings: Blob[], 
  candidateInfo: any,
  onUploadProgress?: (progress: number) => void
) {
  try {
    // Create FormData to upload audio files
    const formData = new FormData();
    
    // Add candidate info
    formData.append('candidateId', candidateInfo.id || '');
    formData.append('candidateName', candidateInfo.name || '');
    formData.append('candidateEmail', candidateInfo.email || '');
    
    // Compress and add each recording
    const compressedRecordings = await Promise.all(
      recordings.map(async (blob, index) => {
        // Additional compression for WebM files
        const compressedBlob = await compressAudioBlob(blob);
        return { blob: compressedBlob, index };
      })
    );
    
    compressedRecordings.forEach(({ blob, index }) => {
      formData.append(`recording_${index}`, blob, `question_${index + 1}.webm`);
    });
    
    console.log(`Uploading ${recordings.length} files, total size: ${
      recordings.reduce((sum, blob) => sum + blob.size, 0) / 1024
    }KB`);
    
    const response = await axios.post(`${API_URL}/api/assessments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 90000, // 90 second timeout (increased from 30s)
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error submitting assessment:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - please check your internet connection');
      }
      if (error.response?.status === 413) {
        throw new Error('Files too large - please try again');
      }
    }
    throw error;
  }
}

/**
 * Compress audio blob for faster upload
 */
async function compressAudioBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    // For WebM files, we can't re-encode on client side easily
    // But we can ensure optimal settings were used during recording
    // Return original blob for now, but this is where you'd add compression
    resolve(blob);
  });
}

/**
 * Alternative: Submit as single concatenated file (faster upload)
 */
export async function submitAssessmentConcatenated(
  recordings: Blob[], 
  candidateInfo: any,
  onUploadProgress?: (progress: number) => void
) {
  try {
    // Concatenate all audio blobs into one
    const concatenatedBlob = new Blob(recordings, { type: 'audio/webm' });
    
    const formData = new FormData();
    formData.append('candidateId', candidateInfo.id || '');
    formData.append('candidateName', candidateInfo.name || '');
    formData.append('candidateEmail', candidateInfo.email || '');
    formData.append('candidateTestId', candidateInfo.candidateTestId || ''); // Add candidateTestId
    formData.append('audioFile', concatenatedBlob, 'complete_assessment.webm');
    formData.append('questionCount', recordings.length.toString());
    
    console.log(`Uploading single concatenated file, size: ${concatenatedBlob.size / 1024}KB`);
    
    const response = await axios.post(`${API_URL}/api/assessments/concatenated`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for single file (increased from 20s)
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error submitting concatenated assessment:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - please check your internet connection and try again');
      }
      if (error.response?.status === 413) {
        throw new Error('Files too large - please try again with shorter recordings');
      }
      if (error.response?.status >= 500) {
        throw new Error('Server error - your submission may still be processing. Please check your results later.');
      }
      if (error.response?.status === 400) {
        throw new Error('Invalid submission format - please try again');
      }
    }
    throw error;
  }
}

/**
 * Retrieves assessment results by ID
 */
export async function getAssessmentResults(assessmentId: string) {
  try {
    const response = await axios.get(`${API_URL}/api/assessments/${assessmentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    throw error;
  }
}

/**
 * Fetches all assessments (for admin use)
 */
export async function getAllAssessments(filters = {}) {
  try {
    const response = await axios.get(`${API_URL}/api/assessments`, { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching assessments:', error);
    throw error;
  }
}

/**
 * Updates an assessment (for admin review)
 */
export async function updateAssessment(assessmentId: string, updates: any) {
  try {
    const response = await axios.put(`${API_URL}/api/assessments/${assessmentId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
} 