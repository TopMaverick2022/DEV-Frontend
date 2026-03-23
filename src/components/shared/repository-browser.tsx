import { useState, useEffect } from "react"
import { Folder, FileText, ChevronRight, CornerUpLeft, HardDrive } from "lucide-react"
import apiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface FileItem {
  name: string
  directory: boolean
  size: number
}

interface RepositoryBrowserProps {
  projectId: number
  className?: string
}

export function RepositoryBrowser({ projectId, className }: RepositoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = async (pathArray: string[]) => {
    setLoading(true)
    setError(null)
    setSelectedFileContent(null)
    try {
      const pathParam = pathArray.join("/")
      const { data } = await apiClient.get<FileItem[]>(`/api/git/files/${projectId}?path=${encodeURIComponent(pathParam)}`)
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
      const { data } = await apiClient.get<string>(`/api/git/files/${projectId}/content?path=${encodeURIComponent(pathParam)}`)
      setSelectedFileContent(data)
    } catch (err: any) {
      setError("Failed to read file.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles(currentPath)
  }, [currentPath, projectId])

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

  return (
    <div className={cn("flex flex-col border rounded-xl overflow-hidden bg-background/50 backdrop-blur-sm", className)}>
      {/* Header Breadcrumbs */}
      <div className="flex items-center p-3 border-b bg-muted/20 gap-2 text-sm">
        <HardDrive className="w-4 h-4 text-primary" />
        <span className="font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => setCurrentPath([])}>
          Workspace
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

      <div className="flex flex-1 min-h-[400px]">
        {/* Left pane: File list */}
        <div className="w-1/3 border-r flex flex-col overflow-y-auto bg-muted/5 p-2">
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

          {items.map((item, idx) => (
            <div 
              key={idx}
              className="flex items-center p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm transition-colors group"
              onClick={() => handleItemClick(item)}
            >
              {item.directory ? (
                <Folder className="w-4 h-4 mr-2 text-blue-400 group-hover:text-blue-500 fill-blue-400/20" />
              ) : (
                <FileText className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-foreground" />
              )}
              <span className="truncate">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Right pane: File content */}
        <div className="w-2/3 flex flex-col bg-[#0d1117] text-[#e6edf3]">
          {loading && selectedFileContent === null ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
              Reading file...
            </div>
          ) : selectedFileContent !== null ? (
            <div className="flex-1 relative">
              <div className="absolute top-0 w-full p-2 border-b border-border/10 bg-[#0d1117]/80 backdrop-blur-sm shadow-sm z-10 flex justify-between items-center text-xs text-muted-foreground">
                <span className="truncate font-mono">{currentPath.length > 0 ? currentPath.join('/') + '/' : ''}{items.find(i => !i.directory && i.name === selectedFileContent)?.name || 'File'}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[10px] font-bold tracking-wider">Read Only</span>
              </div>
              <pre className="p-4 pt-12 overflow-auto h-full text-xs font-mono leading-relaxed">
                <code>{selectedFileContent}</code>
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
