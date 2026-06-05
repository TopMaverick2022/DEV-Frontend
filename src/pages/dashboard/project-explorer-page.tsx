import { useProject } from '@/features/projects/project-context'
import { RepositoryBrowser } from '@/components/shared/repository-browser'
import { Loader2, FolderKanban } from 'lucide-react'

export function ProjectExplorerPage() {
  const { projects, selectedProject, isLoading } = useProject()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="w-8 h-8 text-primary" /> Live Project Explorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse files currently checked out into the backend AI pipeline.
          </p>
        </div>
      </div>

      {selectedProject ? (
        <RepositoryBrowser project={selectedProject} projectId={selectedProject.id} className="shadow-xl" />
      ) : (
        <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl border-dashed border-2 text-center space-y-4">
          <FolderKanban className="w-10 h-10 text-muted-foreground" />
          <h3 className="text-xl font-bold text-foreground">No Projects Found</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Please create a project first to explore its files.
          </p>
        </div>
      )}
    </div>
  )
}
