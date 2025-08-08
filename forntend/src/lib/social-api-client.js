// Social Media API Client Service
// This file contains all social media API functions that communicate with MongoDB backend

import axios from 'axios';

// ==================== CONSTANTS ====================

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Sample images for "AI generation" (kept on frontend)
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1586227740560-8cf2732c1531?w=400&h=400&fit=crop'
]

// Content templates for rephrasing (kept on frontend)
const CONTENT_TEMPLATES = {
  professional: [
    "🚀 {content} - driving innovation forward.",
    "Excited to share: {content} 💼",
    "Professional insight: {content} #Business",
    "Industry update: {content} 📊",
    "{content} - our commitment to excellence continues."
  ],
  casual: [
    "Hey everyone! {content} 😊",
    "Just wanted to share - {content} ✨",
    "Quick update: {content} 👍",
    "Check this out! {content} 🎉",
    "{content} - thought you'd find this interesting!"
  ],
  engaging: [
    "What do you think about this? {content} 💭",
    "Let's discuss: {content} - drop your thoughts below! 👇",
    "This is exciting! {content} 🔥",
    "Your thoughts on {content}? Let me know! 💬",
    "Breaking: {content} - what's your take? 🤔"
  ],
  inspirational: [
    "Remember: {content} 🌟 Keep pushing forward!",
    "Motivation Monday: {content} 💪",
    "Believe in yourself! {content} ✨",
    "Success tip: {content} 🎯",
    "Stay focused: {content} - you've got this! 🚀"
  ]
}

// Platform configurations
const PLATFORM_CONFIGS = [
  { id: 'facebook', name: 'Facebook', color: 'from-blue-500 to-blue-600' },
  { id: 'instagram', name: 'Instagram', color: 'from-pink-500 to-purple-600' },
  { id: 'twitter', name: 'Twitter', color: 'from-blue-400 to-blue-500' },
  { id: 'linkedin', name: 'LinkedIn', color: 'from-blue-600 to-blue-700' }
]

// ==================== AXIOS SETUP ====================

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// ==================== UTILITY FUNCTIONS ====================

// Helper function to convert File to base64 string
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

// Helper function to convert base64 back to displayable image
export const base64ToImageUrl = (base64String) => {
  return base64String // base64 strings can be used directly as src
}

// Convert URL to File object for sample images
export const urlToFile = async (url, filename) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new File([blob], filename, { type: blob.type })
  } catch (error) {
    console.error('URL to File conversion error:', error)
    throw error
  }
}

// Validate URL format
export const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Invalid date'
  }
}

// Get platform color classes
export const getPlatformColor = (platform) => {
  const platformConfig = PLATFORM_CONFIGS.find(p => p.id === platform)
  return platformConfig ? platformConfig.color : 'from-gray-500 to-gray-600'
}

// Get status color classes
export const getStatusColor = (status) => {
  switch (status) {
    case 'published':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    case 'scheduled':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'draft':
      return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
    case 'failed':
      return 'text-red-400 bg-red-400/10 border-red-400/20'
    default:
      return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }
}

// ==================== API FUNCTIONS ====================

// Save a new post to MongoDB
export const savePost = async (postData) => {
  try {
    // Process media files to base64
    const processedMedia = []
    if (postData.mediaFiles && postData.mediaFiles.length > 0) {
      for (const file of postData.mediaFiles) {
        const base64 = await fileToBase64(file)
        processedMedia.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          lastModified: file.lastModified
        })
      }
    }

    const payload = {
      content: postData.content,
      title: postData.title || '',
      platforms: postData.platforms,
      status: postData.status || 'draft',
      scheduledDate: postData.scheduledDate || null,
      hashtags: postData.hashtags || '',
      link: postData.link || '',
      mediaFiles: processedMedia,
      targetAudience: postData.targetAudience || '',
      category: postData.category || ''
    }

    const response = await apiClient.post('/social', payload)
    
    return { 
      success: true, 
      data: response.data.data,
      message: response.data.message 
    }
  } catch (error) {
    console.error('Error saving post:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Get all posts from API (for backward compatibility)
export const getAllPosts = async () => {
  try {
    const response = await apiClient.get('/social?limit=1000') // Get all posts
    return response.data.data.posts
  } catch (error) {
    console.error('Error getting all posts:', error)
    return []
  }
}

// Get posts with filtering and pagination
export const getFilteredPosts = (options = {}) => {
  return new Promise(async (resolve) => {
    try {
      const params = new URLSearchParams()
      
      if (options.page) params.append('page', options.page)
      if (options.limit) params.append('limit', options.limit)
      if (options.status) params.append('status', options.status)
      if (options.platform) params.append('platform', options.platform)
      if (options.search) params.append('search', options.search)
      if (options.category) params.append('category', options.category)
      if (options.dateFrom) params.append('dateFrom', options.dateFrom)
      if (options.dateTo) params.append('dateTo', options.dateTo)
      if (options.sortBy) params.append('sortBy', options.sortBy)
      if (options.sortOrder) params.append('sortOrder', options.sortOrder)

      const response = await apiClient.get(`/social?${params.toString()}`)
      
      resolve({
        success: true,
        data: response.data.data
      })
    } catch (error) {
      console.error('Error getting filtered posts:', error)
      resolve({
        success: false,
        error: error.response?.data?.message || error.message
      })
    }
  })
}

// Get analytics data
export const getAnalytics = (dateRange = 30) => {
  return new Promise(async (resolve) => {
    try {
      const response = await apiClient.get(`/social/analytics?dateRange=${dateRange}`)
      
      resolve({
        success: true,
        data: response.data.data
      })
    } catch (error) {
      console.error('Error getting analytics:', error)
      resolve({
        success: false,
        error: error.response?.data?.message || error.message
      })
    }
  })
}

// Update an existing post
export const updatePost = async (postId, updateData) => {
  try {
    // Process media files if included
    let processedMedia = updateData.mediaFiles
    if (updateData.mediaFiles && Array.isArray(updateData.mediaFiles)) {
      processedMedia = []
      for (const file of updateData.mediaFiles) {
        if (typeof file === 'string' || file.data) {
          // Already processed base64
          processedMedia.push(file)
        } else {
          // New file to process
          const base64 = await fileToBase64(file)
          processedMedia.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            lastModified: file.lastModified
          })
        }
      }
    }

    const payload = {
      ...updateData,
      mediaFiles: processedMedia
    }

    const response = await apiClient.put(`/social/${postId}`, payload)
    
    return { 
      success: true, 
      data: response.data.data 
    }
  } catch (error) {
    console.error('Error updating post:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Delete a post (soft delete)
export const deletePost = async (postId) => {
  try {
    await apiClient.delete(`/social/${postId}`)
    return { success: true }
  } catch (error) {
    console.error('Error deleting post:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Get scheduled posts that need to be published
export const getScheduledPosts = async () => {
  try {
    const response = await apiClient.get('/social/scheduled')
    return { 
      success: true, 
      data: response.data.data 
    }
  } catch (error) {
    console.error('Error getting scheduled posts:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Update post performance
export const updatePostPerformance = async (postId, performanceData) => {
  try {
    const response = await apiClient.put(`/social/${postId}/performance`, performanceData)
    return { 
      success: true, 
      data: response.data.data 
    }
  } catch (error) {
    console.error('Error updating post performance:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Get connected accounts (mock data from API)
export const getMockConnectedAccounts = async () => {
  try {
    const response = await apiClient.get('/social/accounts')
    return response.data.data
  } catch (error) {
    console.error('Error getting connected accounts:', error)
    // Fallback to local mock data
    return [
      { platform: 'facebook', name: 'Your Business', followers: '12.5K', status: 'connected' },
      { platform: 'instagram', name: '@yourbusiness', followers: '8.2K', status: 'connected' },
      { platform: 'twitter', name: '@yourbusiness', followers: '5.1K', status: 'connected' },
      { platform: 'linkedin', name: 'Your Business', followers: '3.7K', status: 'connected' }
    ]
  }
}

// Get single post by ID
export const getPostById = async (postId) => {
  try {
    const response = await apiClient.get(`/social/${postId}`)
    return { 
      success: true, 
      data: response.data.data 
    }
  } catch (error) {
    console.error('Error getting post by ID:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Manually publish a scheduled post
export const publishPost = async (postId) => {
  try {
    const response = await apiClient.post(`/social/${postId}/publish`)
    return { 
      success: true, 
      data: response.data.data,
      message: response.data.message
    }
  } catch (error) {
    console.error('Error publishing post:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// Bulk delete posts
export const bulkDeletePosts = async (postIds) => {
  try {
    const response = await apiClient.post('/social/bulk-delete', { postIds })
    return { 
      success: true, 
      data: response.data,
      message: response.data.message
    }
  } catch (error) {
    console.error('Error bulk deleting posts:', error)
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    }
  }
}

// ==================== SAMPLE IMAGE GENERATION (Frontend Only) ====================

// Generate sample images with simulated AI processing
export const generateSampleImages = async (content, style = 'realistic') => {
  try {
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Select random sample images based on style
    const shuffledImages = [...SAMPLE_IMAGES].sort(() => 0.5 - Math.random())
    const selectedImages = shuffledImages.slice(0, 4)
    
    return {
      success: true,
      data: selectedImages
    }
  } catch (error) {
    console.error('Sample Generation Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// ==================== AI TEXT GENERATION (Backend API) ====================

// Rephrase existing content using Azure OpenAI backend
export const rephraseTextContent = async (content, tone = 'professional', platforms = [], variations = 3) => {
  try {
    const requestData = {
      content: content.trim(),
      tone,
      platforms,
      variations
    }
    
    console.log('Rephrase API Request:', requestData)
    
    const response = await apiClient.post('/social/rephrase-content', requestData)
    
    console.log('Rephrase API Response:', response.data)
    
    // Extract just the content strings for compatibility with existing frontend
    const rephrrasedTexts = response.data.data.map(variation => variation.content)
    
    return {
      success: true,
      data: rephrrasedTexts,
      metadata: response.data.metadata
    }
  } catch (error) {
    console.error('Text Rephrase Error:', error)
    console.error('Error Response:', error.response?.data)
    console.error('Error Status:', error.response?.status)
    
    // Extract detailed error information
    let errorMessage = 'Unknown error occurred'
    
    if (error.response?.data) {
      const errorData = error.response.data
      if (errorData.message) {
        errorMessage = errorData.message
      }
      if (errorData.errors && Array.isArray(errorData.errors)) {
        // Format validation errors
        const validationErrors = errorData.errors.map(err => err.msg).join(', ')
        errorMessage = `Validation failed: ${validationErrors}`
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

// Generate fresh text content using Azure OpenAI backend
export const generateTextContent = async (topic, tone = 'professional', platforms = [], variations = 3) => {
  try {
    const response = await apiClient.post('/social/generate-content', {
      topic: topic.trim() || 'exciting business update',
      tone,
      platforms,
      variations
    })
    
    // Extract just the content strings for compatibility with existing frontend
    const generatedTexts = response.data.data.map(variation => variation.content)
    
    return {
      success: true,
      data: generatedTexts,
      metadata: response.data.metadata
    }
  } catch (error) {
    console.error('Text Generation Error:', error)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

// Generate platform-specific content using Azure OpenAI backend
export const generateForPlatform = async (topic, platform, tone = 'professional') => {
  try {
    const response = await apiClient.post('/social/generate-for-platform', {
      topic: topic.trim(),
      platform,
      tone
    })
    
    return {
      success: true,
      data: response.data.data,
      metadata: response.data.metadata
    }
  } catch (error) {
    console.error('Platform-specific Generation Error:', error)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

// Analyze content statistics using backend
export const analyzeContent = async (content) => {
  try {
    const response = await apiClient.post('/social/analyze-content', {
      content: content.trim()
    })
    
    return {
      success: true,
      data: response.data.data
    }
  } catch (error) {
    console.error('Content Analysis Error:', error)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

// ==================== FALLBACK TEXT GENERATION (Frontend Templates) ====================

// Template-based rephrasing function (fallback)
const rephraseContentFallback = (content, tone = 'professional') => {
  const templates = CONTENT_TEMPLATES[tone] || CONTENT_TEMPLATES.professional
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)]
  return randomTemplate.replace('{content}', content.trim())
}

// Generate multiple rephrase options (fallback)
const generateRephraseOptionsFallback = (content, tone = 'professional') => {
  const options = []
  const templates = CONTENT_TEMPLATES[tone] || CONTENT_TEMPLATES.professional
  
  // Generate 3-4 different options
  const shuffledTemplates = [...templates].sort(() => 0.5 - Math.random())
  for (let i = 0; i < Math.min(4, templates.length); i++) {
    const rephrasedContent = shuffledTemplates[i].replace('{content}', content.trim())
    options.push(rephrasedContent)
  }
  
  return options
}

// Fallback text generation for offline use
export const generateTextContentFallback = async (baseContent, tone = 'professional') => {
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create a general prompt if no content exists
    const content = baseContent.trim() || 'exciting business update'
    const generatedTexts = generateRephraseOptionsFallback(content, tone)
    
    return {
      success: true,
      data: generatedTexts
    }
  } catch (error) {
    console.error('Fallback Text Generation Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// ==================== CONFIGURATION GETTERS ====================

// Get platform configurations
export const getPlatformConfigs = () => {
  return PLATFORM_CONFIGS
}

// Get content templates
export const getContentTemplates = () => {
  return CONTENT_TEMPLATES
}

// ==================== DEVELOPMENT/TESTING FUNCTIONS ====================

// Clear all posts (for development/testing) - calls API
export const clearAllPosts = async () => {
  try {
    // This would need a special endpoint on the backend for development
    console.warn('clearAllPosts: This function should only be used in development')
    return { 
      success: false, 
      error: 'Function not implemented on API for safety' 
    }
  } catch (error) {
    console.error('Error clearing posts:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

// Export posts to JSON file
export const exportPosts = async () => {
  try {
    const posts = await getAllPosts()
    const dataStr = JSON.stringify(posts, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `social-posts-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
    return { success: true }
  } catch (error) {
    console.error('Error exporting posts:', error)
    return { success: false, error: error.message }
  }
}

// Import posts from JSON data
export const importPosts = async (jsonData) => {
  try {
    const posts = JSON.parse(jsonData)
    if (!Array.isArray(posts)) {
      throw new Error('Invalid data format')
    }
    
    // This would need to be implemented as a batch import endpoint
    console.warn('importPosts: Batch import not yet implemented on API')
    return { 
      success: false, 
      error: 'Batch import not yet implemented on API' 
    }
  } catch (error) {
    console.error('Error importing posts:', error)
    return { success: false, error: error.message }
  }
}

// ==================== API CLIENT EXPORT ====================

// Export the configured axios instance for direct use if needed
export { apiClient } 