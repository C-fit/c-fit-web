import Link from "next/link"
import { MapPin, Clock, Briefcase, Heart } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { JobPosting } from "@/lib/types"

interface JobCardProps {
  job: JobPosting
  showSaveButton?: boolean
}

export function JobCard({ job, showSaveButton = true }: JobCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
              <h3 className="font-semibold text-lg leading-tight">{job.title}</h3>
            </Link>
            <p className="text-muted-foreground font-medium">{job.companyName}</p>
          </div>
          {showSaveButton && (
            <Button variant="ghost" size="sm">
              <Heart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
          )}
          {job.jobType && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span>{job.jobType}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{new Date(job.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>

        {/* Description Preview */}
        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>

        {/* Tech Stack */}
        {job.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.techStack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
            {job.techStack.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{job.techStack.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Salary */}
        {job.salary && <div className="text-sm font-medium text-primary">{job.salary}</div>}
      </CardContent>
    </Card>
  )
}
