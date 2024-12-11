import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { PhotoIcon, ClockIcon, DocumentTextIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { SUPPORTED_IMAGE_TYPES } from './config'

function App() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState(null)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState('')

  const processImage = async (base64Image) => {
    try {
      setError(null)
      console.log('Making API request to Ollama...')
      
      const requestBody = {
        model: 'llama3.2-vision',
        messages: [{
          role: 'user',
          content: `Analyze this image and follow these instructions:

1. First, identify the type of content (e.g., document, invoice, handwritten note, screenshot, etc.).

2. Extract all text from the image with these requirements:
   - Maintain the original structure and formatting
   - Translate any non-English text to English
   - Preserve numbers, dates, and amounts exactly as shown
   - For handwritten text, focus on accuracy and context

3. Format the output in markdown:
   - Use appropriate headers (##) for sections
   - Use tables for structured data (especially in invoices)
   - Use bullet points for lists
   - Use code blocks for technical content
   - Preserve paragraph spacing

4. For specific content types:
   - Invoices: Clearly identify total amounts, dates, and parties involved
   - Documents: Maintain heading hierarchy and paragraph structure
   - Handwritten: Note any uncertain words with [?]
   - Technical: Preserve code formatting and indentation

Output the result in clean, well-formatted markdown. Focus on accuracy and readability.`,
          images: [base64Image]
        }],
        stream: true,
        options: {
          temperature: 0.3, // Lower temperature for more accurate extraction
          max_tokens: 2048  // Increased token limit for longer documents
        }
      }

      console.log('Request body:', JSON.stringify(requestBody, null, 2))

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response not OK:', response.status, errorText)
        throw new Error(`Failed to process image: ${response.status} ${errorText}`)
      }

      console.log('Response received, starting to read stream...')
      let fullText = ''
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        console.log('Received chunk:', chunk)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line)
            console.log('Parsed JSON:', json)
            if (json.message?.content) {
              fullText += json.message.content
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }

      if (!fullText.trim()) {
        console.error('No text extracted from the response')
        throw new Error('No text was extracted from the image')
      }

      console.log('Final extracted text:', fullText)
      return fullText
    } catch (error) {
      console.error('Error in processImage:', error)
      setError(error.message)
      throw error
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess('Copied!')
      setTimeout(() => setCopySuccess(''), 2000)
    } catch (err) {
      setCopySuccess('Failed to copy')
      setTimeout(() => setCopySuccess(''), 2000)
    }
  }

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    setLoading(true)
    setError(null)
    const file = acceptedFiles[0]
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        // Get base64 without the data URI prefix
        const base64Image = reader.result.split(',')[1]
        console.log('Image loaded, size:', base64Image.length)
        
        const text = await processImage(base64Image)
        console.log('Received text:', text)
        
        const result = {
          id: Date.now(),
          text,
          timestamp: new Date().toLocaleString(),
          image: URL.createObjectURL(file),
          filename: file.name
        }

        setCurrentResult(result)
        setHistory(prev => [result, ...prev])
      } catch (error) {
        console.error('Error in onDrop:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    reader.onerror = () => {
      console.error('Failed to read file')
      setError('Failed to read the image file')
      setLoading(false)
    }

    reader.readAsDataURL(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_IMAGE_TYPES
  })

  return (
    <div className="app-container">
      <div className="content-container">
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold gradient-text text-center"
        >
          Vision OCR
        </motion.h1>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 w-full"
        >
          {/* Upload Area */}
          <motion.div
            className="gradient-border"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div
              {...getRootProps()}
              className={`glass-panel p-8 text-center cursor-pointer drop-zone ${
                isDragActive ? 'active' : ''
              }`}
            >
              <input {...getInputProps()} />
              <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <AnimatePresence mode="wait">
                {isDragActive ? (
                  <motion.p
                    key="drag-active"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-lg text-blue-400 font-medium"
                  >
                    Drop the image here ...
                  </motion.p>
                ) : (
                  <motion.div
                    key="drag-inactive"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-lg mb-2 font-medium">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-sm text-gray-400">
                      Supports JPG and PNG files
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300"
              >
                <p className="text-center">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="loading"></div>
                <p className="mt-4 text-blue-300">Processing your image...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Result */}
          <AnimatePresence>
            {currentResult && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="gradient-border"
              >
                <div className="glass-panel p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="w-full lg:w-64 flex-shrink-0">
                      <div className="gradient-border">
                        <img
                          src={currentResult.image}
                          alt="Processed"
                          className="w-full h-64 object-cover rounded-xl"
                        />
                      </div>
                      <p className="text-center text-sm text-gray-400 mt-2">
                        {currentResult.filename}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="w-6 h-6 text-blue-400" />
                          <h3 className="text-xl font-semibold">Extracted Text</h3>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyToClipboard(currentResult.text)}
                          className="action-button"
                        >
                          <div className="flex items-center gap-2">
                            <ClipboardDocumentIcon className="w-5 h-5" />
                            <span>{copySuccess || 'Copy'}</span>
                          </div>
                        </motion.button>
                      </div>
                      <div className="gradient-border">
                        <pre className="glass-panel whitespace-pre-wrap font-mono text-sm p-4 rounded-xl overflow-auto max-h-[400px] leading-relaxed">
                          {currentResult.text}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          <AnimatePresence>
            {history.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-12"
              >
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <ClockIcon className="w-6 h-6 text-blue-400" />
                  Previous Scans
                </h2>
                <div className="space-y-4">
                  {history.slice(1).map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="gradient-border"
                    >
                      <div className="glass-panel p-4">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="w-full lg:w-48 flex-shrink-0">
                            <div className="gradient-border">
                              <img
                                src={item.image}
                                alt="Historical"
                                className="w-full h-48 object-cover rounded-xl"
                              />
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-2">
                              {item.filename}
                            </p>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-4">
                              <div className="flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                                <h4 className="font-medium">Scan Result</h4>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => copyToClipboard(item.text)}
                                className="action-button"
                              >
                                <div className="flex items-center gap-2">
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                  <span>Copy</span>
                                </div>
                              </motion.button>
                            </div>
                            <div className="gradient-border">
                              <pre className="glass-panel whitespace-pre-wrap font-mono text-sm p-4 rounded-xl overflow-auto max-h-[200px] leading-relaxed">
                                {item.text}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default App
