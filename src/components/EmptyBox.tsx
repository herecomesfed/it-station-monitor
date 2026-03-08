import React from "react";

interface EmptyBoxProps {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
}

export default function EmptyBox({
  icon: Icon,
  title,
  subtitle,
}: EmptyBoxProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="mt-2 flex flex-col justify-center items-center text-center">
        {Icon && <Icon className="w-8 h-8 mb-2 text-muted-foreground" />}
        <p className="text-muted-foreground font-semibold">{title}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
