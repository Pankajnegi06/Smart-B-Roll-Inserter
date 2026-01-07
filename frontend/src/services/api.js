import axios from 'axios';

const API_URL = 'http://localhost:8080/api/pipeline';

export const api = {
  // Status
  getStatus: async () => {
    const response = await axios.get(`${API_URL}/status`);
    return response.data;
  },

  // Uploads
  uploadARoll: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await axios.post(`${API_URL}/upload-aroll`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress && onProgress(percentCompleted);
      }
    });
    return response.data;
  },

  uploadBRoll: async (file, description, onProgress) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', description);
    
    const response = await axios.post(`${API_URL}/upload-broll`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress && onProgress(percentCompleted);
      }
    });
    return response.data;
  },

  // Data Fetching
  getARolls: async () => {
    const response = await axios.get(`${API_URL}/arolls`);
    return response.data;
  },

  getBRolls: async () => {
    const response = await axios.get(`${API_URL}/brolls`);
    return response.data;
  },

  getTimelines: async () => {
    const response = await axios.get(`${API_URL}/timelines`);
    return response.data;
  },

  getTimeline: async (arollId) => {
    const response = await axios.get(`${API_URL}/timeline/${arollId}`);
    return response.data;
  },

  // Pipeline Actions
  generateEmbeddings: async () => {
    const response = await axios.post(`${API_URL}/embed`);
    return response.data;
  },

  runMatching: async () => {
    const response = await axios.post(`${API_URL}/match`);
    return response.data;
  },

  runFullPipeline: async () => {
    const response = await axios.post(`${API_URL}/process`);
    return response.data;
  },

  renderVideo: async (arollId) => {
    const response = await axios.post(`${API_URL}/render`, { aroll_id: arollId });
    return response.data;
  },

  clearData: async () => {
    const response = await axios.delete(`${API_URL}/clear`);
    return response.data;
  }
};
