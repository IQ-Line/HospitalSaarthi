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
import { Chrome, Eye, EyeOff } from "lucide-react"
import { ICON_STROKE_WIDTH } from "@pulse/constants"

interface LoginFormProps {
  onLogin?: (email: string, password: string) => void
  onGoogleLogin?: () => void
  showSignupLink?: boolean
  signupLink?: string
  showForgotPassword?: boolean
  forgotPasswordLink?: string
  title?: string
  description?: string
}

/**
 * Login Form Block
 * 
 * A reusable login form component with email/password fields.
 * Can be used in login pages or modals.
 * 
 * @example
 * ```tsx
 * <LoginForm 
 *   onLogin={(email, password) => handleLogin(email, password)}
 *   showSignupLink={true}
 *   signupLink="/signup"
 * />
 * ```
 */
export function LoginForm({
  onLogin,
  onGoogleLogin,
  showSignupLink = true,
  signupLink = "/signup",
  showForgotPassword = true,
  forgotPasswordLink = "/forgot-password",
  title = "Login to your account",
  description = "Enter your email below to login to your account",
}: LoginFormProps) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (onLogin) {
        await onLogin(email, password)
      } else {
        // Default behavior - replace with your auth logic
        console.log("Login:", { email, password })
      }
    } finally {
      setIsLoading(false)
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {showForgotPassword && (
                  <Link
                    to={forgotPasswordLink}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff strokeWidth={ICON_STROKE_WIDTH} className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye strokeWidth={ICON_STROKE_WIDTH} className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </Button>
            {onGoogleLogin && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onGoogleLogin}
                disabled={isLoading}
              >
                <Chrome strokeWidth={ICON_STROKE_WIDTH} className="mr-2 size-4" />
                Login with Google
              </Button>
            )}
            {showSignupLink && (
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Link to={signupLink} className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

