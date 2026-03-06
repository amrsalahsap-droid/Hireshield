import React from "react";
import Link from "next/link";
import { Calendar, Clock, User, Briefcase, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewItem {
  id: string;
  candidateName: string;
  jobTitle: string;
  scheduledTime: string;
  href: string;
}

interface UpcomingInterviewsProps {
  interviews: InterviewItem[];
  className?: string;
}

export function UpcomingInterviews({ interviews, className }: UpcomingInterviewsProps) {
  const formatScheduledTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    // If interview is in the past, show "Completed"
    if (diff < 0) {
      return "Completed";
    }
    
    // If interview is today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // If interview is tomorrow, show "Tomorrow"
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    
    // If interview is within 7 days, show day name
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    if (date < nextWeek) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) {
      return "Completed";
    }
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `In ${days} day${days === 1 ? '' : 's'}`;
    } else if (hours > 0) {
      return `In ${hours} hour${hours === 1 ? '' : 's'}`;
    } else {
      return "Soon";
    }
  };

  if (interviews.length === 0) {
    return (
      <div className={cn("bg-card shadow-card rounded-xl border border-border p-6", className)}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground font-display">Upcoming Interviews</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-body text-sm">No upcoming interviews scheduled</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card shadow-card rounded-xl border border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground font-display">Upcoming Interviews</h3>
        <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full font-display">
          {interviews.length} scheduled
        </span>
      </div>

      <div className="space-y-3">
        {interviews.map((interview) => {
          const scheduledTime = formatScheduledTime(interview.scheduledTime);
          const relativeTime = getRelativeTime(interview.scheduledTime);
          const isPast = new Date(interview.scheduledTime) < new Date();
          
          return (
            <Link
              key={interview.id}
              href={interview.href}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-all duration-200 group",
                isPast 
                  ? "border-border bg-muted/30 opacity-60" 
                  : "border-border bg-background hover:bg-muted/30 hover:border-primary/50 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isPast 
                    ? "bg-muted border-border" 
                    : "bg-primary/10 border-primary/20"
                )}>
                  <Calendar className={cn(
                    "w-5 h-5",
                    isPast ? "text-muted-foreground" : "text-primary"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "font-medium leading-tight",
                    isPast 
                      ? "text-muted-foreground font-body text-sm" 
                      : "text-foreground font-body text-sm group-hover:text-primary transition-colors"
                  )}>
                    {interview.candidateName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Briefcase className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-body truncate max-w-[150px]">
                      {interview.jobTitle}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={cn(
                  "font-semibold text-sm",
                  isPast 
                    ? "text-muted-foreground font-display" 
                    : "text-foreground font-display"
                )}>
                  {scheduledTime}
                </div>
                <p className={cn(
                  "text-xs mt-1",
                  isPast 
                    ? "text-muted-foreground font-body" 
                    : "text-primary font-body"
                )}>
                  {relativeTime}
                </p>
              </div>
              
              <ChevronRight className={cn(
                "w-4 h-4 transition-all duration-200",
                isPast 
                  ? "text-muted-foreground opacity-50" 
                  : "text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
              )} />
            </Link>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground font-body">Next 5 scheduled interviews</span>
          </div>
          <span className="text-muted-foreground font-body">
            {interviews.filter(i => new Date(i.scheduledTime) >= new Date()).length} upcoming
          </span>
        </div>
      </div>
    </div>
  );
}
