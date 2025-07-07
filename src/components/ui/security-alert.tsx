import * as React from "react"
import { useState } from "react"
import { Lock } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"

interface SecurityAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
}

export function SecurityAlert({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title = "Confirmação de Segurança",
  description = "Digite a senha para confirmar esta operação:"
}: SecurityAlertProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleConfirm = async () => {
    console.log('🔐 SecurityAlert: Verificando senha...', { password, expectedPassword: import.meta.env.VITE_SECURITY_PASSWORD || "admin123" })
    const securityPassword = import.meta.env.VITE_SECURITY_PASSWORD || "admin123"
    if (password === securityPassword) {
      console.log('✅ SecurityAlert: Senha correta!')
      setPassword("")
      setError("")
      // Execute the callback and let it handle the modal closing
      try {
        console.log('🔄 SecurityAlert: Executando callback...')
        await onConfirm()
        console.log('✅ SecurityAlert: Callback executado com sucesso!')
        // Only close the security alert if the callback succeeds
        onOpenChange(false)
      } catch (error) {
        console.error('❌ SecurityAlert: Erro ao executar callback:', error)
        // Don't close the security alert on error, let user try again
      }
    } else {
      console.log('❌ SecurityAlert: Senha incorreta!')
      setError("Senha incorreta. Tente novamente.")
      setPassword("")
    }
  }

  const handleCancel = () => {
    setPassword("")
    setError("")
    onOpenChange(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Digite a senha..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className={error ? "border-red-500" : ""}
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}