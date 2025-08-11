"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, Send, LogOut, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SheetRow {
  slNo: string
  phoneNumber: string
  message: string
  status: string
  sendMessage: string
}

export default function WhatsAppSheetsSync() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetData, setSheetData] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is already authenticated
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user")
      const savedSheetUrl = localStorage.getItem("sheetUrl")

      if (savedUser) {
        setUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
      }

      if (savedSheetUrl) {
        setSheetUrl(savedSheetUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && sheetUrl) {
      fetchSheetData()
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(fetchSheetData, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, sheetUrl])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // Simulate Google OAuth login
      const mockUser = {
        id: "1",
        name: "John Doe",
        email: "john.doe@gmail.com",
        picture: "/diverse-user-avatars.png",
      }

      setUser(mockUser)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(mockUser))
      }

      toast({
        title: "Login Successful",
        description: "Welcome! You can now sync with Google Sheets.",
      })
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    setSheetData([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
      localStorage.removeItem("sheetUrl")
    }
    setSheetUrl("")
  }

  const extractSheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  const parseCSVData = (csvText: string): SheetRow[] => {
    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length < 2) return []

    // Skip header row
    const dataLines = lines.slice(1)

    return dataLines
      .map((line, index) => {
        const columns = line.split(",").map((col) => col.replace(/"/g, "").trim())
        return {
          slNo: columns[0] || (index + 1).toString(),
          phoneNumber: columns[1] || "",
          message: columns[2] || "",
          status: columns[3] || "Pending",
          sendMessage: columns[4] || "Send",
        }
      })
      .filter((row) => row.phoneNumber && row.message)
  }

  const fetchSheetData = async () => {
    if (!sheetUrl) return

    setRefreshing(true)
    try {
      const sheetId = extractSheetId(sheetUrl)
      if (!sheetId) {
        throw new Error("Invalid sheet URL")
      }

      // Convert Google Sheets URL to CSV export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

      try {
        const response = await fetch(csvUrl)
        if (!response.ok) {
          throw new Error("Failed to fetch sheet data")
        }

        const csvText = await response.text()
        const parsedData = parseCSVData(csvText)
        setSheetData(parsedData)

        toast({
          title: "Data Synced",
          description: `Successfully synced ${parsedData.length} records from Google Sheets`,
        })
      } catch (fetchError) {
        // Fallback to mock data if fetch fails (CORS issues, etc.)
        const mockData: SheetRow[] = [
          {
            slNo: "1",
            phoneNumber: "+1234567890",
            message:
              "Hello! This is a test message with more content that will be truncated in the display but sent in full via WhatsApp.",
            status: "Pending",
            sendMessage: "Send",
          },
          {
            slNo: "2",
            phoneNumber: "+9876543210",
            message: "Welcome to our service! We hope you enjoy using our platform.",
            status: "Sent",
            sendMessage: "Send",
          },
          {
            slNo: "3",
            phoneNumber: "+5555555555",
            message: "Your order has been confirmed and will be delivered soon.",
            status: "Failed",
            sendMessage: "Send",
          },
        ]

        setSheetData(mockData)
        toast({
          title: "Demo Mode",
          description: "Using demo data. For real data, ensure your Google Sheet is publicly viewable.",
        })
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Could not fetch data from Google Sheets. Using demo data.",
        variant: "destructive",
      })

      // Show demo data on error
      const mockData: SheetRow[] = [
        {
          slNo: "1",
          phoneNumber: "+1234567890",
          message: "Hello! This is a test message.",
          status: "Pending",
          sendMessage: "Send",
        },
      ]
      setSheetData(mockData)
    } finally {
      setRefreshing(false)
    }
  }

  const handleSheetUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetUrl) return

    const sheetId = extractSheetId(sheetUrl)
    if (!sheetId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Sheets URL",
        variant: "destructive",
      })
      return
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("sheetUrl", sheetUrl)
    }
    fetchSheetData()
  }

  const sendWhatsAppMessage = async (phoneNumber: string, message: string, slNo: string) => {
    try {
      // Format phone number (remove + and spaces)
      const formattedPhone = phoneNumber.replace(/[+\s-]/g, "")

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`

      // Open WhatsApp
      const newWindow = window.open(whatsappUrl, "_blank")

      // Update status based on whether WhatsApp opened
      setTimeout(() => {
        const newStatus = newWindow ? "Sent" : "Failed"
        updateStatus(slNo, newStatus)

        toast({
          title: newStatus === "Sent" ? "Message Sent" : "Send Failed",
          description: newStatus === "Sent" ? "WhatsApp opened successfully" : "Could not open WhatsApp",
          variant: newStatus === "Sent" ? "default" : "destructive",
        })
      }, 1000)
    } catch (error) {
      updateStatus(slNo, "Failed")
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const updateStatus = (slNo: string, newStatus: string) => {
    setSheetData((prev) => prev.map((row) => (row.slNo === slNo ? { ...row, status: newStatus } : row)))
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
        return "default"
      case "failed":
        return "destructive"
      case "pending":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-600">WhatsApp Sheets Sync</CardTitle>
            <p className="text-muted-foreground">Sign in with Google to sync your sheets</p>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoogleLogin} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">WhatsApp Sync</h1>
                <p className="text-xs text-gray-500">Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={fetchSheetData} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Sheet URL Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Google Sheets Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSheetUrlSubmit} className="space-y-3">
              <div>
                <Label htmlFor="sheetUrl">Google Sheets Viewer URL</Label>
                <Input
                  id="sheetUrl"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Make sure your Google Sheet is publicly viewable (Anyone with the link can view)
                </p>
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Sheet
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Data Display */}
        {sheetData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Messages ({sheetData.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-1">
                  {sheetData.map((row, index) => (
                    <div key={row.slNo} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs font-medium text-gray-500">#{row.slNo}</span>
                            <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mb-1">{row.phoneNumber}</div>
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {row.message.substring(0, 50)}
                            {row.message.length > 50 && "..."}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendWhatsAppMessage(row.phoneNumber, row.message, row.slNo)}
                          className="bg-green-600 hover:bg-green-700 shrink-0"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Send
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {sheetData.length === 0 && sheetUrl && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No data found. Make sure your sheet has the correct format:</p>
              <div className="mt-4 text-sm text-gray-400">
                <p>A1: SL No | B1: Phone Number | C1: Message | D1: Status | E1: Send Message</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
