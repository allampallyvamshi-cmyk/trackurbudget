import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="glass-card flex flex-col items-center justify-center py-20 text-center animate-fade-in">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
      <Icon className="h-8 w-8 text-primary" />
    </div>
    <h3 className="font-display text-xl font-semibold">{title}</h3>
    <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    {actionLabel && onAction && (
      <Button className="mt-6" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
