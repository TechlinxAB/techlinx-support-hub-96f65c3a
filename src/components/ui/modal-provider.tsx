
import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Define the context type
type ModalContextType = {
  isModalOpen: boolean
  isLoading: boolean
  setIsModalOpen: (open: boolean) => void
  setIsLoading: (loading: boolean) => void
}

// Create context with default values
const ModalContext = createContext<ModalContextType>({
  isModalOpen: false,
  isLoading: false,
  setIsModalOpen: () => {},
  setIsLoading: () => {}
})

// Custom hook to use the modal context
export const useModal = () => useContext(ModalContext)

// Provider component
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Update the body's data attributes when modal state changes
  useEffect(() => {
    const handleModalStateChange = () => {
      if (isModalOpen) {
        document.body.setAttribute('data-modal-open', 'true')
      } else {
        // Remove attribute immediately
        document.body.removeAttribute('data-modal-open')
      }
    }
    
    // Execute immediately
    handleModalStateChange()
    
    return () => {
      // Safety cleanup
      document.body.removeAttribute('data-modal-open')
    }
  }, [isModalOpen])

  // Update the body's data attributes when loading state changes
  useEffect(() => {
    const handleLoadingStateChange = () => {
      if (isLoading) {
        document.body.setAttribute('data-loading', 'true')
      } else {
        // Remove attribute immediately
        document.body.removeAttribute('data-loading')
      }
    }
    
    // Execute immediately
    handleLoadingStateChange()
    
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
      }, 10000) // 10 second safety timeout

      return () => {
        clearTimeout(safetyTimer)
      }
    }
  }, [isLoading])

  const value = {
    isModalOpen,
    isLoading,
    setIsModalOpen,
    setIsLoading
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
