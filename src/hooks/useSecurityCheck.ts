import { useState, useCallback } from 'react'

interface UseSecurityCheckReturn {
  isSecurityAlertOpen: boolean
  showSecurityAlert: (callback: () => void, title?: string, description?: string) => void
  hideSecurityAlert: () => void
  confirmedCallback: (() => void) | null
  securityTitle: string
  securityDescription: string
}

export function useSecurityCheck(): UseSecurityCheckReturn {
  const [isSecurityAlertOpen, setIsSecurityAlertOpen] = useState(false)
  const [confirmedCallback, setConfirmedCallback] = useState<(() => void) | null>(null)
  const [securityTitle, setSecurityTitle] = useState("Confirmação de Segurança")
  const [securityDescription, setSecurityDescription] = useState("Digite a senha para confirmar esta operação:")

  const showSecurityAlert = useCallback((
    callback: () => void, 
    title = "Confirmação de Segurança", 
    description = "Digite a senha para confirmar esta operação:"
  ) => {
    setConfirmedCallback(() => callback)
    setSecurityTitle(title)
    setSecurityDescription(description)
    setIsSecurityAlertOpen(true)
  }, [])

  const hideSecurityAlert = useCallback(() => {
    setIsSecurityAlertOpen(false)
    setConfirmedCallback(null)
  }, [])

  return {
    isSecurityAlertOpen,
    showSecurityAlert,
    hideSecurityAlert,
    confirmedCallback,
    securityTitle,
    securityDescription
  }
}