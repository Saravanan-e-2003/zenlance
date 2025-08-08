import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Image, 
  Calendar,
  Hash,
  Send,
  Eye,
  Save,
  X,
  Upload,
  Link,
  Type,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  ThumbsUp,
  MoreHorizontal,
  Bookmark,
  Play,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  Wand2
} from 'lucide-react'
import { 
  Facebook as FacebookIcon, 
  Instagram as InstagramIcon, 
  Twitter as TwitterIcon, 
  LinkedIn as LinkedInIcon 
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { 
  savePost,
  generateSampleImages,
  rephraseTextContent,
  generateTextContent,
  urlToFile,
  isValidUrl,
  getPlatformConfigs
} from '../lib/social-api-client'

// Helper function to get platform icon
const getPlatformIcon = (platform, size = 16) => {
  switch (platform) {
    case 'facebook':
      return <FacebookIcon sx={{ fontSize: size, color: '#06b6d4' }} />
    case 'instagram':
      return <InstagramIcon sx={{ fontSize: size, color: '#06b6d4' }} />
    case 'twitter':
      return <TwitterIcon sx={{ fontSize: size, color: '#06b6d4' }} />
    case 'linkedin':
      return <LinkedInIcon sx={{ fontSize: size, color: '#06b6d4' }} />
    default:
      return platform.substring(0, 1).toUpperCase()
  }
}

// Image processing utilities
const createImagePreview = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

const ImagePreview = ({ file, aspectRatio = "square", className = "" }) => {
  const [mediaSrc, setMediaSrc] = useState(null)
  const [isVideo, setIsVideo] = useState(false)

  useEffect(() => {
    if (file) {
      setIsVideo(file.type.startsWith('video/'))
      createImagePreview(file).then(setMediaSrc)
    }
  }, [file])

  if (!mediaSrc) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <Image className="w-8 h-8 text-gray-400" />
      </div>
    )
  }

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video", // 16:9
    portrait: "aspect-[4/5]", // Instagram portrait
    story: "aspect-[9/16]" // Stories format
  }

  return (
    <div className={`${aspectClasses[aspectRatio]} ${className} overflow-hidden bg-gray-100 relative`}>
      {isVideo ? (
        <>
          <video 
            src={mediaSrc} 
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        </>
      ) : (
        <img 
          src={mediaSrc} 
          alt="Preview" 
          className="w-full h-full object-cover"
        />
      )}
    </div>
  )
}

// Platform-specific preview components
const InstagramPreview = ({ content, hashtags, link, mediaFiles }) => (
  <div className="bg-white rounded-lg overflow-hidden max-w-sm mx-auto shadow-lg">
    {/* Header */}
    <div className="flex items-center p-3 border-b border-gray-100">
      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">YB</span>
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-semibold text-gray-900">yourbusiness</p>
        <p className="text-xs text-gray-500">2 minutes ago</p>
      </div>
      <MoreHorizontal className="w-5 h-5 text-gray-400" />
    </div>
    
    {/* Media */}
    {mediaFiles.length > 0 ? (
      <div className="relative">
        {mediaFiles.length === 1 ? (
          <ImagePreview file={mediaFiles[0]} aspectRatio="square" />
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {mediaFiles.slice(0, 4).map((file, index) => (
              <div key={index} className="relative">
                <ImagePreview file={file} aspectRatio="square" className="aspect-square" />
                {index === 3 && mediaFiles.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold">+{mediaFiles.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <Image className="w-16 h-16 text-gray-400" />
      </div>
    )}
    
    {/* Action buttons */}
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <Heart className="w-6 h-6 text-gray-700" />
          <MessageCircle className="w-6 h-6 text-gray-700" />
          <Share className="w-6 h-6 text-gray-700" />
        </div>
        <Bookmark className="w-6 h-6 text-gray-700" />
      </div>
      
      {/* Content */}
      <div className="text-sm text-gray-900">
        <span className="font-semibold">yourbusiness</span> {content}
      </div>
      
      {/* Hashtags */}
      {hashtags && (
        <div className="text-sm text-blue-600 mt-1">
          {hashtags}
        </div>
      )}
      
      {/* Link */}
      {link && (
        <div className="text-sm text-blue-600 mt-1 underline">
          {link}
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-2">View all comments</p>
    </div>
  </div>
)

const TwitterPreview = ({ content, hashtags, link, mediaFiles }) => (
  <div className="bg-white rounded-lg border border-gray-200 max-w-lg mx-auto p-4">
    <div className="flex space-x-3">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-bold">YB</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <p className="text-sm font-bold text-gray-900">Your Business</p>
          <p className="text-sm text-gray-500">@yourbusiness</p>
          <span className="text-gray-500">·</span>
          <p className="text-sm text-gray-500">2m</p>
        </div>
        
        <div className="text-sm text-gray-900 mb-3">
          {content} {hashtags && <span className="text-blue-500">{hashtags}</span>}
        </div>
        
        {/* Media */}
        {mediaFiles.length > 0 && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
            {mediaFiles.length === 1 ? (
              <ImagePreview file={mediaFiles[0]} aspectRatio="video" />
            ) : mediaFiles.length === 2 ? (
              <div className="grid grid-cols-2 gap-1">
                {mediaFiles.slice(0, 2).map((file, index) => (
                  <ImagePreview key={index} file={file} aspectRatio="square" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <ImagePreview file={mediaFiles[0]} aspectRatio="video" />
                <div className="grid grid-cols-2 gap-1">
                  {mediaFiles.slice(1, 3).map((file, index) => (
                    <div key={index} className="relative">
                      <ImagePreview file={file} aspectRatio="video" className="aspect-video" />
                      {index === 1 && mediaFiles.length > 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-semibold">+{mediaFiles.length - 3}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Link preview */}
        {link && (
          <div className="border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-blue-500 truncate">{link}</p>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center justify-between max-w-md text-gray-500">
          <div className="flex items-center space-x-2 hover:text-blue-500 cursor-pointer">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">12</span>
          </div>
          <div className="flex items-center space-x-2 hover:text-green-500 cursor-pointer">
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm">5</span>
          </div>
          <div className="flex items-center space-x-2 hover:text-red-500 cursor-pointer">
            <Heart className="w-5 h-5" />
            <span className="text-sm">23</span>
          </div>
          <div className="flex items-center space-x-2 hover:text-blue-500 cursor-pointer">
            <Share className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  </div>
)

const LinkedInPreview = ({ content, hashtags, link, mediaFiles }) => (
  <div className="bg-white rounded-lg border border-gray-200 max-w-lg mx-auto overflow-hidden">
    {/* Header */}
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">YB</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Your Business</p>
          <p className="text-xs text-gray-500">Company • 2nd • 2m</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>
    </div>
    
    {/* Content */}
    <div className="p-4">
      <div className="text-sm text-gray-900 mb-3">
        {content}
      </div>
      
      {hashtags && (
        <div className="text-sm text-blue-600 mb-3">
          {hashtags}
        </div>
      )}
      
      {/* Media */}
      {mediaFiles.length > 0 && (
        <div className="mb-3 rounded-lg overflow-hidden">
          {mediaFiles.length === 1 ? (
            <ImagePreview file={mediaFiles[0]} aspectRatio="video" />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {mediaFiles.slice(0, 4).map((file, index) => (
                <div key={index} className="relative">
                  <ImagePreview file={file} aspectRatio="square" className="aspect-square" />
                  {index === 3 && mediaFiles.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-semibold">+{mediaFiles.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Link preview */}
      {link && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
          <div className="bg-gray-50 h-32 flex items-center justify-center">
            <Link className="w-8 h-8 text-gray-400" />
          </div>
          <div className="p-3">
            <p className="text-sm font-medium text-gray-900 truncate">Link Preview</p>
            <p className="text-xs text-gray-500 truncate">{link}</p>
          </div>
        </div>
      )}
    </div>
    
    {/* Action buttons */}
    <div className="border-t border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm">Like</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comment</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">Repost</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <Share className="w-5 h-5" />
          <span className="text-sm">Send</span>
        </div>
      </div>
    </div>
  </div>
)

const FacebookPreview = ({ content, hashtags, link, mediaFiles }) => (
  <div className="bg-white rounded-lg border border-gray-200 max-w-lg mx-auto overflow-hidden">
    {/* Header */}
    <div className="p-4">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">YB</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Your Business</p>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>2 minutes ago</span>
            <span>•</span>
            <span>🌍</span>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>
      
      {/* Content */}
      <div className="text-sm text-gray-900 mb-3">
        {content}
      </div>
      
      {hashtags && (
        <div className="text-sm text-blue-600 mb-3">
          {hashtags}
        </div>
      )}
    </div>
    
    {/* Media */}
    {mediaFiles.length > 0 && (
      <div className="overflow-hidden">
        {mediaFiles.length === 1 ? (
          <ImagePreview file={mediaFiles[0]} aspectRatio="video" />
        ) : mediaFiles.length === 2 ? (
          <div className="grid grid-cols-2">
            {mediaFiles.slice(0, 2).map((file, index) => (
              <ImagePreview key={index} file={file} aspectRatio="square" />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            <ImagePreview file={mediaFiles[0]} aspectRatio="video" />
            <div className="grid grid-cols-2">
              {mediaFiles.slice(1, 3).map((file, index) => (
                <div key={index} className="relative">
                  <ImagePreview file={file} aspectRatio="square" className="aspect-square" />
                  {index === 1 && mediaFiles.length > 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">+{mediaFiles.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
    
    {/* Link preview */}
    {link && (
      <div className="border-t border-gray-200">
        <div className="bg-gray-50 h-32 flex items-center justify-center">
          <Link className="w-8 h-8 text-gray-400" />
        </div>
        <div className="p-3 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900 truncate">Link Preview</p>
          <p className="text-xs text-gray-500 truncate">{link}</p>
        </div>
      </div>
    )}
    
    {/* Reactions and stats */}
    <div className="px-4 py-2 border-b border-gray-100">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">👍</div>
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">❤️</div>
          </div>
          <span>15</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>3 comments</span>
          <span>2 shares</span>
        </div>
      </div>
    </div>
    
    {/* Action buttons */}
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm">Like</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comment</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">Repost</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer">
          <Share className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </div>
      </div>
    </div>
  </div>
)

const CreateSocialPost = () => {
  const navigate = useNavigate()
  const [loading, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [aiGenerationModal, setAiGenerationModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiGeneratedImages, setAiGeneratedImages] = useState([])
  const [textGenerating, setTextGenerating] = useState(false)
  const [textGenerationModal, setTextGenerationModal] = useState(false)
  const [generatedTexts, setGeneratedTexts] = useState([])
  
  const [formData, setFormData] = useState({
    content: '',
    platforms: [],
    scheduleDate: '',
    scheduleTime: '',
    mediaFiles: [],
    hashtags: '',
    link: ''
  })

  // Get platform configurations from service
  const platforms = getPlatformConfigs()

  // Validation function
  const validateForm = () => {
    const errors = {}
    
    if (!formData.content.trim()) {
      errors.content = 'Post content is required'
    } else if (formData.content.length > 280) {
      errors.content = 'Content must be 280 characters or less'
    }
    
    if (formData.platforms.length === 0) {
      errors.platforms = 'Please select at least one platform'
    }
    
    if (formData.link && !isValidUrl(formData.link)) {
      errors.link = 'Please enter a valid URL'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handlePlatformToggle = (platformId) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(id => id !== platformId)
        : [...prev.platforms, platformId]
    }))
    
    // Clear platforms validation error
    if (validationErrors.platforms) {
      setValidationErrors(prev => ({
        ...prev,
        platforms: undefined
      }))
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files]
    }))
  }

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
    }))
  }

  // Sample Image Generation Functions
  const handleAIGeneration = () => {
    if (!formData.content.trim()) {
      toast.error('Please enter some content first to generate relevant images')
      return
    }
    setAiGenerationModal(true)
  }

  const generateAIImages = async (style = 'realistic') => {
    try {
      setAiGenerating(true)
      
      const result = await generateSampleImages(formData.content, style)
      
      if (result.success) {
        setAiGeneratedImages(result.data)
        toast.success(`Generated ${result.data.length} images based on your content!`)
      } else {
        throw new Error(result.error)
      }
      
    } catch (error) {
      console.error('Sample Generation Error:', error)
      toast.error('Failed to generate images. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const addAIImageToPost = async (imageUrl) => {
    try {
      const filename = `generated-${Date.now()}.jpg`
      const file = await urlToFile(imageUrl, filename)
      
      // Add to form data
      setFormData(prev => ({
        ...prev,
        mediaFiles: [...prev.mediaFiles, file]
      }))
      
      toast.success('Generated image added to your post!')
      setAiGenerationModal(false)
      setAiGeneratedImages([])
      
    } catch (error) {
      console.error('Error adding sample image:', error)
      toast.error('Failed to add image. Please try again.')
    }
  }

  // Template-based Text Generation Functions
  const handleTextGeneration = () => {
    setTextGenerationModal(true)
  }

  const handleRephrase = async () => {
    if (!formData.content.trim()) {
      toast.error('Please enter some content to rephrase')
      return
    }

    // Validate content length before API call
    const trimmedContent = formData.content.trim()
    if (trimmedContent.length < 10) {
      toast.error('Content must be at least 10 characters long')
      return
    }
    
    if (trimmedContent.length > 1000) {
      toast.error('Content must be 1000 characters or less')
      return
    }

    try {
      setTextGenerating(true)
      
      // Map platform IDs to platform names for backend compatibility
      const platformNames = formData.platforms.map(platformId => {
        const platform = platforms.find(p => p.id === platformId)
        return platform ? platform.name.toLowerCase() : platformId
      })
      
      console.log('Sending rephrase request:', {
        content: trimmedContent,
        tone: 'professional',
        platforms: platformNames,
        variations: 3
      })
      
      const result = await rephraseTextContent(
        trimmedContent, 
        'professional', 
        platformNames, 
        3
      )
      
      if (result.success) {
        setGeneratedTexts(result.data)
        setTextGenerationModal(true)
        toast.success('Content rephrased successfully using AI!')
      } else {
        console.error('Rephrase API Error:', result.error)
        throw new Error(result.error || 'Failed to rephrase content')
      }
    } catch (error) {
      console.error('Text Rephrase Error:', error)
      // Provide more specific error messages
      if (error.message.includes('Validation failed')) {
        toast.error('Content validation failed. Please check your input and try again.')
      } else if (error.message.includes('AI service')) {
        toast.error('AI service is currently unavailable. Please try again later.')
      } else {
        toast.error('Failed to rephrase content. Please try again.')
      }
    } finally {
      setTextGenerating(false)
    }
  }

  const generateTextContentHandler = async (tone = 'professional') => {
    try {
      setTextGenerating(true)
      
      const baseContent = formData.content.trim() || 'exciting business update'
      const result = await generateTextContent(
        baseContent, 
        tone, 
        formData.platforms, 
        3
      )
      
      if (result.success) {
        setGeneratedTexts(result.data)
        toast.success(`Generated ${result.data.length} AI text variations!`)
      } else {
        throw new Error(result.error)
      }
      
    } catch (error) {
      console.error('Text Generation Error:', error)
      toast.error('Failed to generate content. Please try again.')
    } finally {
      setTextGenerating(false)
    }
  }

  const useGeneratedText = (text) => {
    setFormData(prev => ({
      ...prev,
      content: text
    }))
    setTextGenerationModal(false)
    setGeneratedTexts([])
    toast.success('Text applied to your post!')
  }

  const handleSave = async (isDraft = true) => {
    try {
      setSaving(true)
      
      // Validate form
      if (!validateForm()) {
        toast.error('Please fix the errors before saving')
        return
      }
      
      // Determine status based on schedule and isDraft parameter
      let status = 'draft'
      if (!isDraft && formData.scheduleDate && formData.scheduleTime) {
        status = 'scheduled'
      } else if (!isDraft || (!formData.scheduleDate && !formData.scheduleTime)) {
        status = 'published' // If no schedule is specified, mark as published
      }
      
      // Prepare data for API
      const postData = {
        content: formData.content.trim(),
        platforms: formData.platforms,
        hashtags: formData.hashtags || '',
        link: formData.link || '',
        mediaFiles: formData.mediaFiles,
        status: status
      }

      // Add scheduling if provided and not draft
      if (formData.scheduleDate && formData.scheduleTime && status === 'scheduled') {
        postData.scheduledDate = new Date(`${formData.scheduleDate}T${formData.scheduleTime}`).toISOString()
      }

      // Save to MongoDB via API
      const result = await savePost(postData)
      
      if (result.success) {
        toast.success(result.message || 'Post saved successfully!')
        navigate('/social-media')
      } else {
        throw new Error(result.error || 'Failed to save post')
      }
      
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before previewing')
      return
    }
    setPreviewMode(true)
  }

  const renderPlatformPreview = (platform) => {
    const previewProps = {
      content: formData.content,
      hashtags: formData.hashtags,
      link: formData.link,
      mediaFiles: formData.mediaFiles
    }

    switch (platform) {
      case 'instagram':
        return <InstagramPreview key={platform} {...previewProps} />
      case 'twitter':
        return <TwitterPreview key={platform} {...previewProps} />
      case 'linkedin':
        return <LinkedInPreview key={platform} {...previewProps} />
      case 'facebook':
        return <FacebookPreview key={platform} {...previewProps} />
      default:
        return null
    }
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/social-media')}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-light text-white mb-2">Create Social Post</h1>
              <p className="text-slate-400 font-light">
                Create and schedule engaging content for your social media platforms
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreview}
              className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-colors font-medium flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
            
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded-xl transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Publishing...' : 'Publish Post'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Type className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-light text-white">Post Content</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                {formData.content.trim() && (
                  <button
                    onClick={handleRephrase}
                    disabled={textGenerating}
                    className="flex items-center space-x-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
                    title="Rephrase existing content"
                  >
                    <RefreshCw className={`w-4 h-4 ${textGenerating ? 'animate-spin' : ''}`} />
                    <span className="text-sm">Rephrase</span>
                  </button>
                )}
                
                <button
                  onClick={handleTextGeneration}
                  disabled={textGenerating}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  title="Generate content with AI"
                >
                  <Wand2 className="w-4 h-4" />
                  <span className="text-sm">Generate</span>
                </button>
              </div>
            </div>
            
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="What's on your mind? Share your thoughts, insights, or updates with your audience..."
              className={`w-full h-32 bg-white/5 border rounded-xl p-4 text-white placeholder-slate-400 focus:outline-none focus:bg-white/10 transition-all resize-none ${
                validationErrors.content 
                  ? 'border-red-400/50 focus:border-red-400' 
                  : 'border-white/10 focus:border-cyan-400/50'
              }`}
            />
            
            {validationErrors.content && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.content}</p>
            )}
            
            <div className="mt-3 text-right">
              <span className={`text-sm ${
                formData.content.length > 280 ? 'text-red-400' : 'text-slate-400'
              }`}>
                {formData.content.length}/280 characters
              </span>
            </div>
          </motion.div>

          {/* Media Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Image className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xl font-light text-white">Media</h3>
            </div>
            
            <div className="space-y-4">
              {/* Upload Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Traditional Upload */}
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-cyan-400/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-slate-400" />
                    <p className="text-white font-medium">Upload Files</p>
                    <p className="text-slate-400 text-sm">Images or Videos</p>
                  </label>
                </div>

                {/* AI Generation */}
                <div 
                  onClick={handleAIGeneration}
                  className="border-2 border-dashed border-purple-400/20 rounded-xl p-6 text-center hover:border-purple-400/50 transition-colors cursor-pointer bg-purple-500/5"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                    <p className="text-white font-medium">Generate with AI</p>
                    <p className="text-slate-400 text-sm">Based on your content</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {formData.mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.mediaFiles.map((file, index) => (
                    <div key={index} className="relative bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center space-x-2">
                        <Image className="w-4 h-4 text-cyan-400" />
                        <span className="text-white text-sm truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Additional Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-light text-white mb-4">Additional Options</h3>
            
            <div className="space-y-4">
              {/* Hashtags */}
              <div>
                <label className="flex items-center space-x-2 text-white font-medium mb-2">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  <span>Hashtags</span>
                </label>
                <input
                  type="text"
                  value={formData.hashtags}
                  onChange={(e) => handleInputChange('hashtags', e.target.value)}
                  placeholder="#socialmedia #marketing #business"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all"
                />
              </div>

              {/* Link */}
              <div>
                <label className="flex items-center space-x-2 text-white font-medium mb-2">
                  <Link className="w-4 h-4 text-cyan-400" />
                  <span>Link</span>
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:bg-white/10 transition-all ${
                    validationErrors.link 
                      ? 'border-red-400/50 focus:border-red-400' 
                      : 'border-white/10 focus:border-cyan-400/50'
                  }`}
                />
                {validationErrors.link && (
                  <p className="text-red-400 text-sm mt-2">{validationErrors.link}</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Platform Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-light text-white mb-4">Select Platforms</h3>
            
            <div className="space-y-3">
              {platforms.map((platform) => (
                <label
                  key={platform.id}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={formData.platforms.includes(platform.id)}
                    onChange={() => handlePlatformToggle(platform.id)}
                    className="w-5 h-5 text-cyan-400 bg-transparent border border-white/20 rounded focus:ring-cyan-400 focus:ring-2"
                  />
                                  <div className={`w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center`}>
                  {getPlatformIcon(platform.id, 20)}
                </div>
                  <span className="text-white group-hover:text-cyan-300 transition-colors">
                    {platform.name}
                  </span>
                </label>
              ))}
            </div>
            
            {validationErrors.platforms && (
              <p className="text-red-400 text-sm mt-2">{validationErrors.platforms}</p>
            )}
          </motion.div>

          {/* Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xl font-light text-white">Schedule (Optional)</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">Date</label>
                <input
                  type="date"
                  value={formData.scheduleDate}
                  onChange={(e) => handleInputChange('scheduleDate', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all"
                />
              </div>
              
              <div>
                <label className="text-white font-medium mb-2 block">Time</label>
                <input
                  type="time"
                  value={formData.scheduleTime}
                  onChange={(e) => handleInputChange('scheduleTime', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all"
                />
              </div>
              
              <p className="text-slate-400 text-sm">
                Leave empty to publish immediately
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sample Image Generation Modal */}
      {aiGenerationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-light text-white">Generate AI Images</h3>
              </div>
              <button
                onClick={() => {
                  setAiGenerationModal(false)
                  setAiGeneratedImages([])
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-white font-medium mb-2">Your Post Content:</h4>
              <p className="text-slate-300 italic">"{formData.content}"</p>
            </div>

            {/* Generation Options */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-4">Style Options:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'realistic', name: 'Business', desc: 'Professional content' },
                  { id: 'artistic', name: 'Creative', desc: 'Artistic designs' },
                  { id: 'minimal', name: 'Minimal', desc: 'Clean and simple' },
                  { id: 'vibrant', name: 'Vibrant', desc: 'Bright and colorful' }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => generateAIImages(style.id)}
                    disabled={aiGenerating}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors disabled:opacity-50"
                  >
                    <div className="text-white font-medium">{style.name}</div>
                    <div className="text-slate-400 text-sm">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {aiGenerating && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-white">Generating images based on your content...</p>
                <p className="text-slate-400 text-sm">This may take a few seconds</p>
              </div>
            )}

            {/* Generated Images */}
            {aiGeneratedImages.length > 0 && (
              <div className="mb-6">
                <h4 className="text-white font-medium mb-4">Generated Images:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {aiGeneratedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Generated ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-white/10"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <button
                          onClick={() => addAIImageToPost(imageUrl)}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Use This</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setAiGenerationModal(false)
                  setAiGeneratedImages([])
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Text Generation Modal */}
      {textGenerationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Wand2 className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-light text-white">Generate Text Content</h3>
              </div>
              <button
                onClick={() => {
                  setTextGenerationModal(false)
                  setGeneratedTexts([])
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Current Content Preview */}
            {formData.content && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-medium mb-2">Current Content:</h4>
                <p className="text-slate-300 italic">"{formData.content}"</p>
              </div>
            )}

            {/* Tone Options */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-4">Tone & Style:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'professional', name: 'Professional', desc: 'Business-focused' },
                  { id: 'casual', name: 'Casual', desc: 'Friendly and relaxed' },
                  { id: 'engaging', name: 'Engaging', desc: 'Interactive and fun' },
                  { id: 'inspirational', name: 'Inspirational', desc: 'Motivating and uplifting' }
                ].map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => generateTextContentHandler(tone.id)}
                    disabled={textGenerating}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors disabled:opacity-50"
                  >
                    <div className="text-white font-medium">{tone.name}</div>
                    <div className="text-slate-400 text-sm">{tone.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {textGenerating && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-white">Generating content variations...</p>
                <p className="text-slate-400 text-sm">This may take a few seconds</p>
              </div>
            )}

            {/* Generated Text Options */}
            {generatedTexts.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-white font-medium">Generated Content:</h4>
                {generatedTexts.map((text, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group">
                    <p className="text-white mb-3">{text}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">{text.length} characters</span>
                      <button
                        onClick={() => useGeneratedText(text)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <span>Use This</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setTextGenerationModal(false)
                  setGeneratedTexts([])
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-light text-white">Platform Previews</h3>
              <button
                onClick={() => setPreviewMode(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {formData.platforms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Please select at least one platform to see previews</p>
              </div>
            ) : (
              <div className="space-y-8">
                {formData.platforms.map((platform) => {
                  const platformName = platforms.find(p => p.id === platform)?.name || platform
                  return (
                    <div key={platform}>
                      <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                                        <div className={`w-6 h-6 rounded bg-slate-700/50 flex items-center justify-center`}>
                  {getPlatformIcon(platform, 16)}
                </div>
                        <span>{platformName} Preview</span>
                      </h4>
                      <div className="flex justify-center">
                        {renderPlatformPreview(platform)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPreviewMode(false)}
                className="bg-cyan-400 hover:bg-cyan-500 text-black px-6 py-2 rounded-xl transition-colors font-medium"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CreateSocialPost 