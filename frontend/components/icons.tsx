import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

export function GmailIcon({ size = 24, className = "", ...props }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            {...props}
        >
            <rect x="2" y="4" width="20" height="16" rx="2" className="fill-current text-red-500/90 dark:text-red-400/90" />
            <path d="M4 6l8 6 8-6" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

export function OutlookIcon({ size = 24, className = "", ...props }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            {...props}
        >
            <rect x="3" y="5" width="14" height="14" rx="2" className="fill-current text-blue-600/90 dark:text-blue-400/90" />
            <rect x="11" y="3" width="10" height="18" rx="2" className="fill-current text-blue-500/90 dark:text-blue-300/90" />
            <circle cx="10" cy="12" r="3" fill="white" />
        </svg>
    );
}

export function ImapIcon({ size = 24, className = "", ...props }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            {...props}
        >
            <rect x="3" y="6" width="18" height="12" rx="2" className="fill-current text-emerald-500/90 dark:text-emerald-400/90" />
            <path d="M4 8l8 5 8-5" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}


