import * as React from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@pulse/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pulse/ui/card"
import { Input } from "@pulse/ui/input"
import { Label } from "@pulse/ui/label"
import { ArrowLeft } from "lucide-react"
import { ICON_STROKE_WIDTH } from "@pulse/constants"

interface PasswordResetFormProps {
  onReset?: (email: string) => void
  showLoginLink?: boolean
  loginLink?: string
  title?: string
  description?: string
  submitLabel?: string
  isLoading?: boolean
}

/**
 * Password Reset Form Block
 * 
 * A reusable password reset form component with email input.
 * Can be used in password reset pages or modals.
 * 
 * @example
 * ```tsx
 * <PasswordResetForm 
 *   onReset={(email) => handlePasswordReset(email)}
 *   showLoginLink={true}
 *   loginLink="/login"
 * />
 * ```
 */
export function PasswordResetForm({
  onReset,
  showLoginLink = true,
  loginLink = "/login",
  title = "Reset password",
  description = "Enter your email address and we'll send you a link to reset your password",
  submitLabel = "Send reset link",
  isLoading = false,
}: PasswordResetFormProps) {
  const [email, setEmail] = React.useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (onReset) {
      await onReset(email)
    } else {
      // Default behavior - replace with your reset logic
      console.log("Password reset requested for:", email)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : submitLabel}
            </Button>
            {showLoginLink && (
              <Button variant="secondary" className="w-full" asChild>
                <Link to={loginLink}>
                  <ArrowLeft strokeWidth={ICON_STROKE_WIDTH} className="mr-2 h-4 w-4" />
                  Back to login
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

