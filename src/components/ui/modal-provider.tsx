
import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Define the context type
type ModalContextType = {
  isModalOpen: boolean
  isLoading: boolean
  setIsModalOpen: (open: boolean) => void
  setIsLoading: (loading: boolean) => void
  forceResetModalState: () => void
}

// Create context with default values
const ModalContext = createContext<ModalContextType>({
  isModalOpen: false,
  isLoading: false,
  setIsModalOpen: () => {},
  setIsLoading: () => {},
  forceResetModalState: () => {}
})

// Custom hook to use the modal context
export const useModal = () => useContext(ModalContext)

// Provider component
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Force reset function to clear all modal state
  const forceResetModalState = () => {
    setIsModalOpen(false)
    setIsLoading(false)
    document.body.removeAttribute('data-modal-open')
    document.body.removeAttribute('data-loading')
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    document.body.style.overflow = ''
  }

  // Update the body's data attributes when modal state changes
  useEffect(() => {
    if (isModalOpen) {
      document.body.setAttribute('data-modal-open', 'true')
    } else {
      // Remove attribute and clean up styles immediately
      document.body.removeAttribute('data-modal-open')
    }
    
    return () => {
      // Safety cleanup
      document.body.removeAttribute('data-modal-open')
    }
  }, [isModalOpen])

  // Update the body's data attributes when loading state changes
  useEffect(() => {
    if (isLoading) {
      document.body.setAttribute('data-loading', 'true')
    } else {
      // Remove attribute immediately
      document.body.removeAttribute('data-loading')
    }
    
    return () => {
      // Safety cleanup
      document.body.removeAttribute('data-loading')
    }
  }, [isLoading])

  // Safety timeout to reset loading state if it gets stuck
  useEffect(() => {
    if (isLoading) {
      const safetyTimer = setTimeout(() => {
        setIsLoading(false)
        document.body.removeAttribute('data-loading')
      }, 10000) // 10 second safety timeout

      return () => {
        clearTimeout(safetyTimer)
      }
    }
  }, [isLoading])

  // Global event listener to ensure cleanup on any user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      // If we're not in modal or loading state but the attributes exist, clean them
      if (!isModalOpen && document.body.hasAttribute('data-modal-open')) {
        document.body.removeAttribute('data-modal-open')
      }
      
      if (!isLoading && document.body.hasAttribute('data-loading')) {
        document.body.removeAttribute('data-loading')
      }
    }
    
    // Add event listeners for any user interaction
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [isModalOpen, isLoading])

  // Emergency cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.removeAttribute('data-modal-open')
      document.body.removeAttribute('data-loading')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [])

  const value = {
    isModalOpen,
    isLoading,
    setIsModalOpen,
    setIsLoading,
    forceResetModalState
  }

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

// Custom hook that wraps operations in loading state
export const useLoadingOperation = () => {
  const { setIsLoading } = useModal()
  
  const withLoading = async <T extends any>(operation: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true)
      return await operation()
    } finally {
      setIsLoading(false) // Remove delay - set back to false immediately
    }
  }
  
  return { withLoading }
}
