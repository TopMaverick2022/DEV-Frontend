import { useState, useEffect } from "react"
import { Folder, FileText, ChevronRight, CornerUpLeft, HardDrive, Loader2, UploadCloud, DownloadCloud, Key } from "lucide-react"
import apiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface FileItem {
  name: string
  directory: boolean
  size: number
  status: 'ADDED' | 'MODIFIED' | 'NONE'
  lastModifiedText: string
  lastModified: number
}

interface RepositoryBrowserProps {
  projectId: number
  project?: any
  className?: string
}

function parseGitUrl(urlStr: string): { provider: 'github' | 'gitlab' } | null {
  try {
    const cleaned = urlStr.trim()
    const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`)
    const hostname = url.hostname
    if (hostname.includes('gitlab')) return { provider: 'gitlab' }
    if (hostname.includes('github')) return { provider: 'github' }
  } catch {}
  return null
}

function getStoredToken(provider: 'github' | 'gitlab') {
  const key = provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
  return localStorage.getItem(key) ?? ''
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return ""
  
  const now = Date.now()
  const diffMs = now - timestamp
  
  // Guard against slight client/server clock drifts
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  
  const dateObj = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const timeStr = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`
  const dateStr = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`

  if (diffMin < 1) {
    return "just now"
  }
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`
  }
  if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`
  }
  
  // Calendar yesterday check
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const compareDate = new Date(timestamp)
  compareDate.setHours(0, 0, 0, 0)
  
  if (compareDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${timeStr}`
  }
  
  return `${dateStr} ${timeStr}`
}

export function RepositoryBrowser({ projectId, project, className }: RepositoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null)
  const [addedLines, setAddedLines] = useState<number[]>([])
  const [modifiedLines, setModifiedLines] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Git commit/push states
  const parsedGit = project?.githubRepoUrl ? parseGitUrl(project.githubRepoUrl) : null
  const provider = parsedGit?.provider
  const isGitProject = !!project?.githubRepoUrl && !!provider

  const [commitMessage, setCommitMessage] = useState("AI Auto-update from Project Explorer")
  const [gitToken, setGitToken] = useState("")
  const [pushing, setPushing] = useState(false)
  const [gitSuccess, setGitSuccess] = useState<string | null>(null)
  const [gitError, setGitError] = useState<string | null>(null)
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const fetchFiles = async (pathArray: string[]) => {
    setLoading(true)
    setError(null)
    try {
      const pathParam = pathArray.join("/")
      const { data } = await apiClient.get<FileItem[]>(`/git/files/${projectId}?path=${encodeURIComponent(pathParam)}`)
      setItems(data)
    } catch (err: any) {
      setError("Failed to load directory. The repository might not be cloned yet.")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFileContent = async (fileName: string) => {
    setLoading(true)
    setError(null)
    try {
      const pathParam = [...currentPath, fileName].join("/")
      const { data } = await apiClient.get<{ content: string; addedLines: number[]; modifiedLines: number[] }>(
        `/git/files/${projectId}/content?path=${encodeURIComponent(pathParam)}`
      )
      setSelectedFileContent(data.content)
      setAddedLines(data.addedLines || [])
      setModifiedLines(data.modifiedLines || [])
    } catch (err: any) {
      setError("Failed to read file.")
      setSelectedFileContent(null)
      setAddedLines([])
      setModifiedLines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles(currentPath)
  }, [currentPath, projectId])

  useEffect(() => {
    setCurrentPath([])
    setSelectedFileContent(null)
    setAddedLines([])
    setModifiedLines([])
    setGitSuccess(null)
    setGitError(null)
  }, [projectId])

  useEffect(() => {
    if (provider) {
      const tokenExists = !!getStoredToken(provider)
      setShowTokenInput(!tokenExists)
    }
  }, [provider, projectId])

  const navigateTo = (folderName: string) => {
    setCurrentPath((prev) => [...prev, folderName])
  }

  const navigateUp = () => {
    setCurrentPath((prev) => prev.slice(0, prev.length - 1))
  }

  const handleItemClick = (item: FileItem) => {
    if (item.directory) {
      navigateTo(item.name)
    } else {
      fetchFileContent(item.name)
    }
  }

  const handleCommitPush = async () => {
    if (!project || !provider) return
    setPushing(true)
    setGitSuccess(null)
    setGitError(null)
    try {
      const activeToken = gitToken.trim() || getStoredToken(provider)
      if (!activeToken) {
        setGitError("Personal Access Token is required to commit & push changes.")
        setPushing(false)
        return
      }

      await apiClient.post("/git/push", {
        token: activeToken,
        projectId: projectId,
        commitMessage: commitMessage || `AI Auto-update for ${project.name}`
      })

      setGitSuccess("Successfully committed and pushed changes!")
      if (gitToken.trim()) {
        const key = provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
        localStorage.setItem(key, gitToken.trim())
      }
      fetchFiles(currentPath)
    } catch (err: any) {
      setGitError(err.response?.data || "Failed to commit & push changes.")
    } finally {
      setPushing(false)
    }
  }

  const handleDownloadZip = async () => {
    setDownloading(true)
    try {
      const response = await apiClient.get(`/git/download/${projectId}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/zip' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `${project?.name || `project_${projectId}`}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert("Failed to download project ZIP.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={cn("flex flex-col border rounded-xl overflow-hidden bg-background/50 backdrop-blur-sm", className)}>
      {/* Header Breadcrumbs & Download ZIP */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/20 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <HardDrive className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold cursor-pointer hover:text-primary transition-colors shrink-0" onClick={() => setCurrentPath([])}>
            Project Files View
          </span>
          {currentPath.map((folder, idx) => (
            <div key={idx} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span 
                className="cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
              >
                {folder}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 text-purple-400 hover:text-purple-300 rounded-lg text-xs font-semibold transition-all ml-4 disabled:opacity-50 shrink-0"
          title="Download workspace files as ZIP"
        >
          {downloading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Zipping...
            </>
          ) : (
            <>
              <DownloadCloud className="w-3.5 h-3.5" />
              Download ZIP
            </>
          )}
        </button>
      </div>

      <div className="flex flex-1 min-h-[400px]">
        {/* Left pane: File list and Git controls */}
        <div className="w-1/3 border-r flex flex-col bg-muted/5">
          <div className="flex-1 overflow-y-auto p-2">
            {currentPath.length > 0 && (
              <div 
                className="flex items-center p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm text-muted-foreground mb-1"
                onClick={navigateUp}
              >
                <CornerUpLeft className="w-4 h-4 mr-2" />
                ..
              </div>
            )}

            {loading && !selectedFileContent && (
              <div className="p-4 text-sm text-muted-foreground text-center animate-pulse">Loading...</div>
            )}
            
            {error && <div className="p-4 text-sm text-destructive text-center">{error}</div>}

            {!loading && items.length === 0 && !error && (
              <div className="p-4 text-sm text-muted-foreground text-center">Empty directory</div>
            )}

            {items.map((item, idx) => {
              const isAdded = item.status === 'ADDED'
              const isModified = item.status === 'MODIFIED'
              return (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm transition-colors group mb-0.5",
                    isAdded && "text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10",
                    isModified && "text-amber-400 bg-amber-500/5 hover:bg-amber-500/10"
                  )}
                  onClick={() => handleItemClick(item)}
                  title={`Last modified: ${item.lastModifiedText}`}
                >
                  <div className="flex items-center min-w-0">
                    {item.directory ? (
                      <Folder className={cn("w-4 h-4 mr-2 shrink-0 text-blue-400 group-hover:text-blue-500 fill-blue-400/20", 
                        isAdded && "text-emerald-400 fill-emerald-400/10",
                        isModified && "text-amber-400 fill-amber-400/10")} 
                      />
                    ) : (
                      <FileText className={cn("w-4 h-4 mr-2 shrink-0 text-muted-foreground group-hover:text-foreground",
                        isAdded && "text-emerald-400 group-hover:text-emerald-500",
                        isModified && "text-amber-400 group-hover:text-amber-500")} 
                      />
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 ml-2 text-[10px] shrink-0">
                    {isAdded && (
                      <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/25 uppercase font-bold text-[8px] tracking-wider shrink-0">
                        New
                      </span>
                    )}
                    {isModified && (
                      <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-500 rounded border border-amber-500/25 uppercase font-bold text-[8px] tracking-wider shrink-0">
                        Edit
                      </span>
                    )}
                    <span className="text-muted-foreground/45 group-hover:text-muted-foreground/60 transition-colors text-[9px] shrink-0 font-mono">
                      {formatRelativeTime(item.lastModified)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {isGitProject && (
            <div className="p-3 border-t bg-muted/20 space-y-2 text-xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Git Sync & Push
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  Provider: <span className="font-semibold capitalize text-primary">{provider}</span>
                </span>
              </div>

              {gitError && (
                <div className="p-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {gitError}
                </div>
              )}
              {gitSuccess && (
                <div className="p-2 text-[11px] text-green-500 bg-green-500/10 border border-green-500/20 rounded-md">
                  {gitSuccess}
                </div>
              )}

              {showTokenInput && (
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    placeholder={provider === 'gitlab' ? "glpat-xxxxxxxxxx" : "ghp_xxxxxxxxxx"}
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    className="w-full px-2 py-1 bg-background/50 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Commit Message</label>
                <input
                  type="text"
                  placeholder="Commit message..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-2 py-1 bg-background/50 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCommitPush}
                  disabled={pushing}
                  className="flex-1 py-1.5 bg-primary text-primary-foreground font-semibold rounded text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {pushing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Commit & Push
                    </>
                  )}
                </button>
                {!showTokenInput && (
                  <button
                    onClick={() => setShowTokenInput(true)}
                    className="px-2 py-1.5 bg-accent hover:bg-accent/80 text-muted-foreground hover:text-foreground rounded text-xs transition-colors"
                    title="Change Token"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right pane: File content */}
        <div className="w-2/3 flex flex-col bg-[#0d1117] text-[#e6edf3]">
          {loading && selectedFileContent === null ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
              Reading file...
            </div>
          ) : selectedFileContent !== null ? (
            <div className="flex-1 relative overflow-hidden flex flex-col">
              <div className="w-full p-2 border-b border-border/10 bg-[#0d1117]/80 backdrop-blur-sm shadow-sm z-10 flex justify-between items-center text-xs text-muted-foreground shrink-0">
                <span className="truncate font-mono">
                  {currentPath.length > 0 ? currentPath.join('/') + '/' : ''}
                  {items.find(i => !i.directory && i.name === selectedFileContent)?.name || 'File'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[10px] font-bold tracking-wider">
                  Read Only
                </span>
              </div>
              <pre className="p-4 pt-12 overflow-auto flex-1 text-xs font-mono leading-relaxed">
                <code className="block">
                  {selectedFileContent.split('\n').map((line, idx) => {
                    const lineNum = idx + 1
                    const isAdded = addedLines.includes(lineNum)
                    const isModified = modifiedLines.includes(lineNum)
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "px-4 -mx-4 flex hover:bg-white/5",
                          isAdded && "bg-emerald-500/10 border-l-2 border-emerald-500",
                          isModified && "bg-amber-500/10 border-l-2 border-amber-500"
                        )}
                        title={isAdded ? "Added line" : isModified ? "Modified line" : undefined}
                      >
                        <span className="w-10 select-none text-muted-foreground/30 text-right pr-3 inline-block shrink-0">
                          {lineNum}
                        </span>
                        <span className="whitespace-pre">{line || ' '}</span>
                      </div>
                    )
                  })}
                </code>
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground/50">
              <FileText className="w-12 h-12" />
              <p className="text-sm">Select a file to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
