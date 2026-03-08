import Link from "next/link";
import { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className = "" }: SidebarSectionProps) {
  // Don't render section header if title is empty (collapsed state)
  if (!title) {
    return <div className={`sidebar-section ${className}`}>{children}</div>;
  }

  return (
    <div className={`sidebar-section ${className}`}>
      {/* Section Header */}
      <div className="px-3 py-2">
        <h3 className="text-meta font-semibold font-display text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      
      {/* Section Content */}
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

interface SidebarNavItemProps {
  href: string;
  icon: string;
  children: ReactNode;
  isActive?: boolean;
  className?: string;
  isCollapsed?: boolean;
  external?: boolean;
}

export function SidebarNavItem({ href, icon, children, isActive = false, className = "", isCollapsed = false, external = false }: SidebarNavItemProps) {
  const baseClasses = "flex items-center px-3 py-2 text-sm font-medium font-body rounded-button transition-colors";
  const activeClasses = isActive 
    ? "text-primary bg-primary/10 border border-primary/20 font-semibold" 
    : "text-muted-foreground hover:text-foreground hover:bg-accent";
  
  const iconClasses = isActive ? "text-primary" : "text-muted-foreground";
  
  const linkContent = (
    <>
      <span className={`text-lg ${iconClasses}`}>{icon}</span>
      {children && <span className={`ml-3 ${isActive ? 'font-semibold' : 'font-normal'}`}>{children}</span>}
    </>
  );

  const linkElement = external ? (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} ${activeClasses} ${className}`}
    >
      {linkContent}
    </a>
  ) : (
    <Link 
      href={href} 
      className={`${baseClasses} ${activeClasses} ${className}`}
    >
      {linkContent}
    </Link>
  );

  // Show tooltip when collapsed and children exist
  if (isCollapsed && children && typeof children === 'string') {
    return (
      <Tooltip content={children} side="right" delay={300}>
        {linkElement}
      </Tooltip>
    );
  }

  return linkElement;
}
